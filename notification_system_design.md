# Stage 1

## REST API Design

| Endpoint | Purpose | Request Headers | Request Body | Success Response | Error Response |
| --- | --- | --- | --- | --- | --- |
| `POST /notifications` | Create one notification for a student. | `Authorization: Bearer token`, `Content-Type: application/json` | `{"studentId":1042,"type":"Event","message":"Tech Fest"}` | `201 Created` with `{"id":"uuid","studentId":1042,"type":"Event","message":"Tech Fest","isRead":false,"createdAt":"2026-04-22T17:49:42.000Z"}` | `400 Bad Request` for invalid payload, `401 Unauthorized`, `500 Internal Server Error` |
| `GET /notifications` | Fetch all notifications. | `Authorization: Bearer token` | None | `200 OK` with notification list | `401 Unauthorized`, `500 Internal Server Error` |
| `GET /notifications/unread` | Fetch unread notifications only. | `Authorization: Bearer token` | None | `200 OK` with unread list | `401 Unauthorized`, `500 Internal Server Error` |
| `PATCH /notifications/:id/read` | Mark one notification as read. | `Authorization: Bearer token`, `Content-Type: application/json` | None | `200 OK` with updated notification or a simple success object | `404 Not Found`, `401 Unauthorized`, `500 Internal Server Error` |
| `DELETE /notifications/:id` | Delete one notification. | `Authorization: Bearer token` | None | `200 OK` or `204 No Content` | `404 Not Found`, `401 Unauthorized`, `500 Internal Server Error` |
| `POST /notifications/bulk` | Create notifications for many students in one call. | `Authorization: Bearer token`, `Content-Type: application/json` | `{"studentIds":[1042,1051],"type":"Placement","message":"Shortlisted for interview"}` | `202 Accepted` or `201 Created` with created records | `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error` |

### Notification schema

```json
{
 "id": "uuid",
 "studentId": 1042,
 "type": "Placement",
 "message": "Company hiring",
 "isRead": false,
 "createdAt": "2026-04-22T17:49:42.000Z"
}
```

### Realtime delivery

Use Socket.IO over WebSocket.

Why websocket: notification delivery is event-driven, so the server should push updates the moment they exist. Socket.IO keeps a live connection, supports reconnects, and handles rooms cleanly when students need their own channel.

Why not polling: polling burns requests even when nothing changed, adds latency between creation and delivery, and gets expensive once student count grows.

Delivery flow: create notification in the API, persist it, publish an event to the Socket.IO layer, and emit to the target student room. The client updates the inbox immediately and still falls back to GET /notifications on reconnect.

# Stage 2

## Storage choice

PostgreSQL fits this problem better than a document store because the data model is relational, the filters are predictable, and the workload depends on indexes more than flexible document shape.

Why PostgreSQL:

* strong consistency for read/unread state
* good support for composite indexes and descending order scans
* simple joins between students, notifications, and read tracking
* easy pagination and reporting queries

## Tables

```sql
CREATE TABLE students (
 id BIGSERIAL PRIMARY KEY,
 student_id BIGINT NOT NULL UNIQUE,
 name TEXT,
 email TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
 id UUID PRIMARY KEY,
 student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
 type TEXT NOT NULL CHECK (type IN ('Placement', 'Result', 'Event')),
 message TEXT NOT NULL,
 is_read BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_reads (
 id BIGSERIAL PRIMARY KEY,
 notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
 student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
 read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (notification_id, student_id)
);

CREATE INDEX idx_notifications_student_read_created
 ON notifications (student_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_created_at
 ON notifications (created_at DESC);
```

## Core queries

```sql
INSERT INTO notifications (id, student_id, type, message, is_read, created_at)
VALUES ($1, $2, $3, $4, FALSE, NOW());
```

```sql
SELECT id, student_id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

```sql
SELECT id, student_id, type, message, is_read, created_at
FROM notifications
WHERE student_id = $1 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = $1 AND student_id = $2
RETURNING id, student_id, type, message, is_read, created_at;
```

```sql
DELETE FROM notifications
WHERE id = $1 AND student_id = $2;
```

## Scaling issues

High row count: notifications grow fast, so full-table scans stop being acceptable.

Expensive sorting: ORDER BY created_at DESC on a large table gets costly without a matching index.

Connection pool saturation: bursts from fan-out writes and dashboard refreshes can exhaust database connections.

Solutions:

* indexing on `(student_id, is_read, created_at DESC)` for inbox reads
* partitioning by month or quarter once the table becomes large enough
* read replicas for inbox and analytics traffic
* caching the hottest inbox pages and unread counts

# Stage 3

## Query review

Query:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

Is it accurate? Mostly, but the column names should match the real schema. If the table uses snake_case, this query is off. It should look like this:

```sql
SELECT id, student_id, type, message, is_read, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = FALSE
ORDER BY created_at DESC;
```

Why it is slow:

* the filter and sort both touch the same table repeatedly
* without a composite index, the database may scan too many rows
* `SELECT *` pulls more data than the inbox actually needs

What changes:

* use the composite index `(student_id, is_read, created_at DESC)`
* return only the columns the UI needs
* keep pagination in the query, not in memory

Time complexity: the jump is from a near full scan plus sort toward an index range scan that is much closer to `O(log n + k)` for the rows returned.

Why indexing every column is a bad idea:

* write performance drops because every insert and update has more index work
* storage usage climbs quickly
* the planner has too many similar indexes to choose from
* maintenance gets harder and less predictable

## Placement notification query

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
 AND created_at >= NOW() - INTERVAL '7 days';
```

# Stage 4

## Handling repeated inbox fetches

| Option | Advantages | Disadvantages | Tradeoff |
| --- | --- | --- | --- |
| Redis cache | Fast reads, lower database load, easy unread-count caching | Stale data if invalidation is weak | Best for hot inboxes and repeated page loads |
| Pagination | Smaller responses, less memory, predictable latency | More round trips for large inboxes | Good default when notification history grows |
| Lazy loading | Loads only what the user sees | Extra client complexity | Works well with infinite scroll |
| WebSocket push updates | Removes most refresh traffic, instant updates | More moving parts, connection state to manage | Best when users stay signed in for long sessions |
| Cache invalidation strategy | Keeps cache honest after write operations | Easy to get wrong if ownership is unclear | Use event-based invalidation after create, read, and delete |

Practical mix: Redis for unread counts and first-page inbox results, pagination for history, lazy loading in the client, and Socket.IO for live push updates. That gives speed without pretending every notification read path needs to hit the database.

# Stage 5

## Problems in the pseudocode

```text
for student in students:
 send_email()
 save_to_db()
 push_to_app()
```

Issues:

* sequential processing makes every student wait on the previous one
* the path is slow because email, database, and push delivery are mixed together
* partial failures are likely when one step succeeds and the next fails
* there is no retry policy
* there is no idempotency, so replays can create duplicate notifications

## Queue redesign

Use RabbitMQ as the work dispatcher.

Producer: enqueues one notification job per recipient.

Consumers:

* email worker sends mail
* db worker writes the notification row
* push worker delivers Socket.IO events

Retry strategy: retry transient failures with limited backoff. After the retry budget is exhausted, move the message to a dead letter queue so it can be reviewed or replayed later.

Failure recovery: workers must be idempotent. A job should carry a stable notification id so reprocessing the same message does not duplicate the row or send the same email twice.

Should DB save and email send happen together? No. They should share the same business event, but not the same transaction. Email is external side effect territory, while the database transaction should stay tight and local. Keep transactional boundaries around the database write, then publish the job after the commit.

## Improved pseudocode

```text
for student in students:
 notificationId = create_id()
 publish_to_rabbitmq({ notificationId, student, message, type })

worker email:
 if not already_sent(notificationId):
  send_email()
  mark_sent(notificationId)

worker db:
 if not already_saved(notificationId):
  save_to_db()

worker push:
 if not already_pushed(notificationId):
  push_to_app()
```

# Stage 6

## Priority inbox scoring

Priority weight:

* Placement = 3
* Result = 2
* Event = 1

Recency should still matter, so a newer notification gets a slightly higher score than an older one with the same type.

Score formula:

```text
score = weight * 1000000 + recency_factor
```

The weight should dominate, and the recency factor should break ties inside the same type.

## TypeScript example

```ts
type NotificationType = "Placement" | "Result" | "Event";

interface NotificationItem {
 id: string;
 type: NotificationType;
 message: string;
 createdAt: Date;
 isRead: boolean;
}

interface RankedNotification extends NotificationItem {
 score: number;
}

const PRIORITY_WEIGHT: Record<NotificationType, number> = {
 Placement: 3,
 Result: 2,
 Event: 1,
};

class MinHeap<T> {
 private items: T[] = [];

 constructor(private readonly compare: (left: T, right: T) => number) {}

 size(): number {
  return this.items.length;
 }

 peek(): T | undefined {
  return this.items[0];
 }

 push(value: T): void {
  this.items.push(value);
  this.bubbleUp(this.items.length - 1);
 }

 pop(): T | undefined {
  if (this.items.length === 0) {
   return undefined;
  }

  const top = this.items[0];
  const last = this.items.pop();

  if (this.items.length > 0 && last !== undefined) {
   this.items[0] = last;
   this.bubbleDown(0);
  }

  return top;
 }

 toArray(): T[] {
  return [...this.items];
 }

 private bubbleUp(index: number): void {
  let current = index;

  while (current > 0) {
   const parent = Math.floor((current - 1) / 2);

   if (this.compare(this.items[current], this.items[parent]) >= 0) {
    break;
   }

   [this.items[current], this.items[parent]] = [this.items[parent], this.items[current]];
   current = parent;
  }
 }

 private bubbleDown(index: number): void {
  let current = index;

  while (true) {
   const left = current * 2 + 1;
   const right = current * 2 + 2;
   let smallest = current;

   if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) {
    smallest = left;
   }

   if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) {
    smallest = right;
   }

   if (smallest === current) {
    break;
   }

   [this.items[current], this.items[smallest]] = [this.items[smallest], this.items[current]];
   current = smallest;
  }
 }
}

function getScore(notification: NotificationItem): number {
 const recencyFactor = notification.createdAt.getTime();

 return PRIORITY_WEIGHT[notification.type] * 1_000_000_000_000 + recencyFactor;
}

function compareRanked(left: RankedNotification, right: RankedNotification): number {
 if (left.score !== right.score) {
  return left.score - right.score;
 }

 return left.createdAt.getTime() - right.createdAt.getTime();
}

export function getTop10Notifications(notifications: NotificationItem[]): NotificationItem[] {
 const heap = new MinHeap<RankedNotification>(compareRanked);

 for (const notification of notifications) {
  if (notification.isRead) {
   continue;
  }

  const ranked = {
   ...notification,
   score: getScore(notification),
  };

  if (heap.size() < 10) {
   heap.push(ranked);
   continue;
  }

  const currentTop = heap.peek();

  if (currentTop && compareRanked(ranked, currentTop) > 0) {
   heap.pop();
   heap.push(ranked);
  }
 }

 return heap
  .toArray()
  .sort((left, right) => compareRanked(right, left))
  .map(({ score: _score, ...notification }) => notification);
}
```

## Why the heap wins here

A full sort does more work than necessary when you only want the top 10. A heap keeps the weakest of the current winners at the top, so each new notification is either ignored or inserted in `O(log n)`. That keeps the inbox ranking cheap even when the unread list is large.

Complexity:

* Insert: `O(log n)`
* Top: `O(1)`

## Output example

```text
[
 { id: "n9", type: "Placement", message: "Interview shortlist", isRead: false },
 { id: "n4", type: "Placement", message: "Drive scheduled", isRead: false },
 { id: "n7", type: "Result", message: "Round 2 results out", isRead: false }
]
```
