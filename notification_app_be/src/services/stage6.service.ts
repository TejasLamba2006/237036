import { Log } from "../logging_middleware";
import type { Notification } from "../types";
import { fetchExternalNotifications } from "./external.service";

type RankedNotification = Notification & {
  score: number;
  order: number;
};

const PRIORITY_WEIGHT: Record<Notification["type"], number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

class MinHeap<T> {
  private readonly values: T[] = [];

  constructor(private readonly compare: (left: T, right: T) => number) {}

  size(): number {
    return this.values.length;
  }

  peek(): T | undefined {
    return this.values[0];
  }

  push(value: T): void {
    this.values.push(value);
    this.bubbleUp(this.values.length - 1);
  }

  pop(): T | undefined {
    if (this.values.length === 0) {
      return undefined;
    }

    const first = this.values[0];
    const last = this.values.pop();

    if (this.values.length > 0 && last !== undefined) {
      this.values[0] = last;
      this.bubbleDown(0);
    }

    return first;
  }

  toArray(): T[] {
    return [...this.values];
  }

  private bubbleUp(index: number): void {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);

      if (this.compare(this.values[current], this.values[parent]) >= 0) {
        break;
      }

      [this.values[current], this.values[parent]] = [
        this.values[parent],
        this.values[current],
      ];
      current = parent;
    }
  }

  private bubbleDown(index: number): void {
    let current = index;

    while (true) {
      const left = current * 2 + 1;
      const right = current * 2 + 2;
      let smallest = current;

      if (
        left < this.values.length &&
        this.compare(this.values[left], this.values[smallest]) < 0
      ) {
        smallest = left;
      }

      if (
        right < this.values.length &&
        this.compare(this.values[right], this.values[smallest]) < 0
      ) {
        smallest = right;
      }

      if (smallest === current) {
        break;
      }

      [this.values[current], this.values[smallest]] = [
        this.values[smallest],
        this.values[current],
      ];
      current = smallest;
    }
  }
}

function compareRanked(
  left: RankedNotification,
  right: RankedNotification,
): number {
  if (left.score !== right.score) {
    return left.score - right.score;
  }

  if (left.timestamp.getTime() !== right.timestamp.getTime()) {
    return left.timestamp.getTime() - right.timestamp.getTime();
  }

  return left.order - right.order;
}

function scoreNotification(notification: Notification): number {
  const priority = PRIORITY_WEIGHT[notification.type];

  return priority * 1_000_000_000_000 + notification.timestamp.getTime();
}

export async function getTop10ExternalNotifications(): Promise<Notification[]> {
  await Log("backend", "info", "service", "stage 6 ranking started");

  const externalNotifications = await fetchExternalNotifications();
  const heap = new MinHeap<RankedNotification>(compareRanked);

  let order = 0;

  for (const notification of externalNotifications) {
    if (notification.isRead) {
      continue;
    }

    const rankedNotification: RankedNotification = {
      ...notification,
      score: scoreNotification(notification),
      order,
    };

    order += 1;

    if (heap.size() < 10) {
      heap.push(rankedNotification);
      continue;
    }

    const weakestTopCandidate = heap.peek();

    if (
      weakestTopCandidate !== undefined &&
      compareRanked(rankedNotification, weakestTopCandidate) > 0
    ) {
      heap.pop();
      heap.push(rankedNotification);
    }
  }

  const topNotifications = heap
    .toArray()
    .sort((left, right) => compareRanked(right, left))
    .map(({ score: _score, order: _order, ...notification }) => notification);

  await Log("backend", "info", "service", "stage 6 ranking completed");

  return topNotifications;
}
