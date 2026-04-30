import type { Player } from "../shared/player";

export function hasDuplicatePlayerName(
  players: Player[],
  name: string,
  ignoredPlayerId?: string
): boolean {
  const normalizedName = normalizePlayerName(name);

  return players.some(
    (player) =>
      player.id !== ignoredPlayerId && normalizePlayerName(player.name) === normalizedName
  );
}

function normalizePlayerName(name: string): string {
  return name.trim().toLocaleLowerCase();
}
