import { contextBridge, ipcRenderer } from "electron";
import type {
  AdventuringPartyApi,
  CreateAdventuringPartyInput,
  UpdateAdventuringPartyInput
} from "../shared/adventuringParty";
import type { CharacterApi, CreateCharacterInput, UpdateCharacterInput } from "../shared/character";
import type {
  CreateEncounterInput,
  EncounterApi,
  UpdateEncounterInput,
  UpdateEncounterRunInput
} from "../shared/encounter";
import type { CreatePlayerInput, PlayerApi, UpdatePlayerInput } from "../shared/player";

const players: PlayerApi = {
  list: () => ipcRenderer.invoke("players:list"),
  create: (input: CreatePlayerInput) => ipcRenderer.invoke("players:create", input),
  update: (input: UpdatePlayerInput) => ipcRenderer.invoke("players:update", input)
};

const characters: CharacterApi = {
  list: () => ipcRenderer.invoke("characters:list"),
  create: (input: CreateCharacterInput) => ipcRenderer.invoke("characters:create", input),
  update: (input: UpdateCharacterInput) => ipcRenderer.invoke("characters:update", input)
};

const adventuringParties: AdventuringPartyApi = {
  list: () => ipcRenderer.invoke("adventuringParties:list"),
  create: (input: CreateAdventuringPartyInput) =>
    ipcRenderer.invoke("adventuringParties:create", input),
  update: (input: UpdateAdventuringPartyInput) =>
    ipcRenderer.invoke("adventuringParties:update", input)
};

const encounters: EncounterApi = {
  list: () => ipcRenderer.invoke("encounters:list"),
  create: (input: CreateEncounterInput) => ipcRenderer.invoke("encounters:create", input),
  update: (input: UpdateEncounterInput) => ipcRenderer.invoke("encounters:update", input),
  updateRun: (input: UpdateEncounterRunInput) => ipcRenderer.invoke("encounters:updateRun", input)
};

contextBridge.exposeInMainWorld("encounterTracker", {
  players,
  characters,
  adventuringParties,
  encounters
});
