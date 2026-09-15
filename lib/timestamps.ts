export class AppTimestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now() { return AppTimestamp.fromDate(new Date()); }

  static fromDate(date: Date) {
    const milliseconds = date.getTime();
    return new AppTimestamp(Math.floor(milliseconds / 1000), (milliseconds % 1000) * 1_000_000);
  }

  static from(value: unknown): AppTimestamp | undefined {
    if (!value) return undefined;
    if (value instanceof AppTimestamp) return value;
    if (typeof value === "string") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : AppTimestamp.fromDate(date);
    }
    if (typeof value === "object") {
      const candidate = value as { seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number };
      const seconds = candidate.seconds ?? candidate._seconds;
      if (typeof seconds === "number") return new AppTimestamp(seconds, candidate.nanoseconds ?? candidate._nanoseconds ?? 0);
    }
    return undefined;
  }

  toDate() { return new Date((this.seconds * 1000) + Math.floor(this.nanoseconds / 1_000_000)); }
  toJSON() { return this.toDate().toISOString(); }
}

export function reviveTimestamp<T extends Record<string, any>>(record: T, fields: string[]): T {
  const target = record as Record<string, any>;
  for (const field of fields) {
    const timestamp = AppTimestamp.from(target[field]);
    if (timestamp) target[field] = timestamp;
  }
  return record;
}
