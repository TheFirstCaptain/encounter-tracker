/// <reference types="vite/client" />

import type { AdventuringPartyApi } from "../shared/adventuringParty";
import type { CharacterApi } from "../shared/character";
import type { EncounterApi } from "../shared/encounter";
import type { PlayerApi } from "../shared/player";

declare global {
  interface Window {
    encounterTracker: {
      players: PlayerApi;
      characters: CharacterApi;
      adventuringParties: AdventuringPartyApi;
      encounters: EncounterApi;
    };
  }
}
