import { describe, expect, it } from "vitest";
import { overlaps } from "../src/domain/reservation.js";

const at = (iso: string) => new Date(iso);

describe("overlaps", () => {
  const existing = { startAt: at("2026-01-01T10:00:00Z"), endAt: at("2026-01-01T11:00:00Z") };

  it("detects an identical slot as overlapping", () => {
    expect(overlaps(existing, { startAt: at("2026-01-01T10:00:00Z"), endAt: at("2026-01-01T11:00:00Z") })).toBe(true);
  });

  it("detects partial overlaps on both sides", () => {
    expect(overlaps(existing, { startAt: at("2026-01-01T09:30:00Z"), endAt: at("2026-01-01T10:30:00Z") })).toBe(true);
    expect(overlaps(existing, { startAt: at("2026-01-01T10:30:00Z"), endAt: at("2026-01-01T11:30:00Z") })).toBe(true);
  });

  it("detects containment both directions", () => {
    expect(overlaps(existing, { startAt: at("2026-01-01T10:15:00Z"), endAt: at("2026-01-01T10:45:00Z") })).toBe(true);
    expect(overlaps(existing, { startAt: at("2026-01-01T09:00:00Z"), endAt: at("2026-01-01T12:00:00Z") })).toBe(true);
  });

  it("treats touching boundaries as free (half-open intervals)", () => {
    expect(overlaps(existing, { startAt: at("2026-01-01T09:00:00Z"), endAt: at("2026-01-01T10:00:00Z") })).toBe(false);
    expect(overlaps(existing, { startAt: at("2026-01-01T11:00:00Z"), endAt: at("2026-01-01T12:00:00Z") })).toBe(false);
  });

  it("treats disjoint slots as free", () => {
    expect(overlaps(existing, { startAt: at("2026-01-01T08:00:00Z"), endAt: at("2026-01-01T09:00:00Z") })).toBe(false);
    expect(overlaps(existing, { startAt: at("2026-01-01T12:00:00Z"), endAt: at("2026-01-01T13:00:00Z") })).toBe(false);
  });
});
