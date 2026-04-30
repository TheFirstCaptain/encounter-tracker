import { describe, expect, it } from "vitest";
import type { Player } from "../shared/player";
import { hasDuplicatePlayerName } from "./playerNames";

const players: Player[] = [
  {
    id: "1",
    name: "Aragorn",
    createdAt: "2026-04-29T00:00:00.000Z"
  },
  {
    id: "2",
    name: "Gimli",
    createdAt: "2026-04-29T00:00:00.000Z"
  }
];

describe("player names", () => {
  it("finds duplicate player names case-insensitively", () => {
    expect(hasDuplicatePlayerName(players, "  aragorn  ")).toBe(true);
  });

  it("ignores the currently edited player", () => {
    expect(hasDuplicatePlayerName(players, "Aragorn", "1")).toBe(false);
  });

  it("finds duplicates when editing to another player's name", () => {
    expect(hasDuplicatePlayerName(players, "Gimli", "1")).toBe(true);
  });

  it("allows unique player names", () => {
    expect(hasDuplicatePlayerName(players, "Legolas")).toBe(false);
  });
});
