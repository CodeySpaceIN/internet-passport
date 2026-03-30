import { createHash, randomBytes } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function keyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}

export function generateRawKey(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
