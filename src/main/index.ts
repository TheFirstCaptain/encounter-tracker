import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEncounterTrackerStore, type EncounterTrackerStore } from "./database";
import type {
  CreateAdventuringPartyInput,
  UpdateAdventuringPartyInput
} from "../shared/adventuringParty";
import type { CreateCharacterInput, UpdateCharacterInput } from "../shared/character";
import type {
  CreateEncounterInput,
  UpdateEncounterInput,
  UpdateEncounterRunInput
} from "../shared/encounter";
import type { CreatePlayerInput, UpdatePlayerInput } from "../shared/player";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let store: EncounterTrackerStore | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    title: "Encounter Tracker",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`Renderer failed to load: ${errorCode} ${errorDescription}`);
  });

  mainWindow.webContents.on("console-message", (_event, _level, message, line, sourceId) => {
    console.log(`[renderer] ${sourceId}:${line} ${message}`);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  ipcMain.handle("players:list", () => {
    return getStore().listPlayers();
  });

  ipcMain.handle("players:create", (_event, input: CreatePlayerInput) => {
    return getStore().createPlayer(input);
  });

  ipcMain.handle("players:update", (_event, input: UpdatePlayerInput) => {
    return getStore().updatePlayer(input);
  });

  ipcMain.handle("characters:list", () => {
    return getStore().listCharacters();
  });

  ipcMain.handle("characters:create", (_event, input: CreateCharacterInput) => {
    return getStore().createCharacter(input);
  });

  ipcMain.handle("characters:update", (_event, input: UpdateCharacterInput) => {
    return getStore().updateCharacter(input);
  });

  ipcMain.handle("adventuringParties:list", () => {
    return getStore().listAdventuringParties();
  });

  ipcMain.handle("adventuringParties:create", (_event, input: CreateAdventuringPartyInput) => {
    return getStore().createAdventuringParty(input);
  });

  ipcMain.handle("adventuringParties:update", (_event, input: UpdateAdventuringPartyInput) => {
    return getStore().updateAdventuringParty(input);
  });

  ipcMain.handle("encounters:list", () => {
    return getStore().listEncounters();
  });

  ipcMain.handle("encounters:create", (_event, input: CreateEncounterInput) => {
    return getStore().createEncounter(input);
  });

  ipcMain.handle("encounters:update", (_event, input: UpdateEncounterInput) => {
    return getStore().updateEncounter(input);
  });

  ipcMain.handle("encounters:updateRun", (_event, input: UpdateEncounterRunInput) => {
    return getStore().updateEncounterRun(input);
  });
}

function getStore(): EncounterTrackerStore {
  if (!store) {
    throw new Error("Encounter tracker store is not ready.");
  }

  return store;
}

app.whenReady().then(async () => {
  store = await createEncounterTrackerStore(
    path.join(app.getPath("userData"), "encounter-tracker.sqlite")
  );
  registerIpc();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
