import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type {
  AdventuringParty,
  CreateAdventuringPartyInput,
  UpdateAdventuringPartyInput
} from "../shared/adventuringParty";
import type { Character, CreateCharacterInput, UpdateCharacterInput } from "../shared/character";
import type {
  CreateEncounterInput,
  CreateEncounterLocalParticipantInput,
  Encounter,
  EncounterParticipant,
  EncounterParticipantType,
  UpdateEncounterInput,
  UpdateEncounterRunInput
} from "../shared/encounter";
import { gameSystems } from "../shared/gameSystem";
import type { CreatePlayerInput, Player, UpdatePlayerInput } from "../shared/player";

type PlayerRow = [string, string, string];
type CharacterRow = [string, string, string, string, number, number, string];
type AdventuringPartyRow = [string, string, string, string];
type PartyCharacterRow = [string, string];
type EncounterRow = [string, string, string, string];
type EncounterParticipantRow = [
  string,
  string,
  string,
  string,
  string | null,
  number,
  number,
  number | null,
  number,
  number
];

export type EncounterTrackerStore = {
  listPlayers: () => Player[];
  createPlayer: (input: CreatePlayerInput) => Player;
  updatePlayer: (input: UpdatePlayerInput) => Player;
  listCharacters: () => Character[];
  createCharacter: (input: CreateCharacterInput) => Character;
  updateCharacter: (input: UpdateCharacterInput) => Character;
  listAdventuringParties: () => AdventuringParty[];
  createAdventuringParty: (input: CreateAdventuringPartyInput) => AdventuringParty;
  updateAdventuringParty: (input: UpdateAdventuringPartyInput) => AdventuringParty;
  listEncounters: () => Encounter[];
  createEncounter: (input: CreateEncounterInput) => Encounter;
  updateEncounter: (input: UpdateEncounterInput) => Encounter;
  updateEncounterRun: (input: UpdateEncounterRunInput) => Encounter;
};

export async function createEncounterTrackerStore(dbPath: string): Promise<EncounterTrackerStore> {
  const SQL = await loadSqlJs();
  const db = openDatabase(SQL, dbPath);
  migrate(db);

  const persist = (): void => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  };

  return {
    listPlayers: () => listPlayers(db),
    listCharacters: () => listCharacters(db),
    listAdventuringParties: () => listAdventuringParties(db),
    listEncounters: () => listEncounters(db),
    createPlayer: (input) => {
      const name = input.name.trim();

      if (!name) {
        throw new Error("Player name is required.");
      }

      const player: Player = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString()
      };

      db.run("INSERT INTO players (id, name, created_at) VALUES (?, ?, ?)", [
        player.id,
        player.name,
        player.createdAt
      ]);
      persist();

      return player;
    },
    updatePlayer: (input) => {
      const name = input.name.trim();

      if (!name) {
        throw new Error("Player name is required.");
      }

      const existingPlayer = getPlayer(db, input.id);

      if (!existingPlayer) {
        throw new Error("Player was not found.");
      }

      const updatedPlayer = {
        ...existingPlayer,
        name
      };

      db.run("UPDATE players SET name = ? WHERE id = ?", [updatedPlayer.name, updatedPlayer.id]);
      persist();

      return updatedPlayer;
    },
    createCharacter: (input) => {
      const name = input.name.trim();

      if (!getPlayer(db, input.playerId)) {
        throw new Error("Player is required.");
      }

      if (!name) {
        throw new Error("Character name is required.");
      }

      if (!gameSystems.some((system) => system.id === input.systemId)) {
        throw new Error("Game system is required.");
      }

      if (!Number.isInteger(input.maxHp) || input.maxHp < 1) {
        throw new Error("Hit points must be a positive whole number.");
      }

      const character: Character = {
        id: crypto.randomUUID(),
        playerId: input.playerId,
        name,
        systemId: input.systemId,
        maxHp: input.maxHp,
        currentHp: input.maxHp,
        createdAt: new Date().toISOString()
      };

      db.run(
        `
          INSERT INTO characters (
            id,
            player_id,
            name,
            system_id,
            max_hp,
            current_hp,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          character.id,
          character.playerId,
          character.name,
          character.systemId,
          character.maxHp,
          character.currentHp,
          character.createdAt
        ]
      );
      persist();

      return character;
    },
    updateCharacter: (input) => {
      const character = validateCharacterInput(db, input);
      const existingCharacter = getCharacter(db, input.id);

      if (!existingCharacter) {
        throw new Error("Character was not found.");
      }

      if (!Number.isInteger(input.currentHp) || input.currentHp < 0) {
        throw new Error("Current hit points must be a whole number.");
      }

      const updatedCharacter = {
        ...character,
        id: input.id,
        currentHp: character.maxHp,
        createdAt: existingCharacter.createdAt
      };

      db.run(
        `
          UPDATE characters
          SET player_id = ?,
              name = ?,
              system_id = ?,
              max_hp = ?,
              current_hp = ?
          WHERE id = ?
        `,
        [
          updatedCharacter.playerId,
          updatedCharacter.name,
          updatedCharacter.systemId,
          updatedCharacter.maxHp,
          updatedCharacter.currentHp,
          updatedCharacter.id
        ]
      );
      persist();

      return updatedCharacter;
    },
    createAdventuringParty: (input) => {
      const party = validateAdventuringPartyInput(db, input);

      db.run("INSERT INTO adventuring_parties (id, name, system_id, created_at) VALUES (?, ?, ?, ?)", [
        party.id,
        party.name,
        party.systemId,
        party.createdAt
      ]);

      for (const characterId of party.characterIds) {
        db.run("INSERT INTO adventuring_party_characters (party_id, character_id) VALUES (?, ?)", [
          party.id,
          characterId
        ]);
      }

      persist();

      return party;
    },
    updateAdventuringParty: (input) => {
      const existingParty = getAdventuringParty(db, input.id);

      if (!existingParty) {
        throw new Error("Adventuring party was not found.");
      }

      const party = {
        ...validateAdventuringPartyInput(db, input),
        id: input.id,
        createdAt: existingParty.createdAt
      };

      db.run("UPDATE adventuring_parties SET name = ?, system_id = ? WHERE id = ?", [
        party.name,
        party.systemId,
        party.id
      ]);
      db.run("DELETE FROM adventuring_party_characters WHERE party_id = ?", [party.id]);

      for (const characterId of party.characterIds) {
        db.run("INSERT INTO adventuring_party_characters (party_id, character_id) VALUES (?, ?)", [
          party.id,
          characterId
        ]);
      }

      persist();

      return party;
    },
    createEncounter: (input) => {
      const encounter = validateEncounterInput(db, input);

      db.run("INSERT INTO encounters (id, party_id, name, created_at) VALUES (?, ?, ?, ?)", [
        encounter.id,
        encounter.partyId,
        encounter.name,
        encounter.createdAt
      ]);

      insertEncounterParticipants(db, encounter.participants);

      persist();

      return encounter;
    },
    updateEncounter: (input) => {
      const existingEncounter = getEncounter(db, input.id);

      if (!existingEncounter) {
        throw new Error("Encounter was not found.");
      }

      const encounter = {
        ...validateEncounterInput(db, input),
        id: input.id,
        createdAt: existingEncounter.createdAt
      };
      const participants = encounter.participants.map((participant) => ({
        ...participant,
        encounterId: encounter.id
      }));
      const updatedEncounter = {
        ...encounter,
        participants
      };

      db.run("UPDATE encounters SET party_id = ?, name = ? WHERE id = ?", [
        updatedEncounter.partyId,
        updatedEncounter.name,
        updatedEncounter.id
      ]);
      db.run("DELETE FROM encounter_participants WHERE encounter_id = ?", [updatedEncounter.id]);
      insertEncounterParticipants(db, updatedEncounter.participants);

      persist();

      return updatedEncounter;
    },
    updateEncounterRun: (input) => {
      const existingEncounter = getEncounter(db, input.id);

      if (!existingEncounter) {
        throw new Error("Encounter was not found.");
      }

      for (const participantInput of input.participants) {
        const participant = existingEncounter.participants.find(
          (currentParticipant) => currentParticipant.id === participantInput.id
        );

        if (!participant) {
          throw new Error("Encounter participant was not found.");
        }

        if (!Number.isInteger(participantInput.currentHp) || participantInput.currentHp < 0) {
          throw new Error("Current hit points must be a whole number.");
        }

        if (participantInput.currentHp > participant.maxHp) {
          throw new Error("Current hit points cannot exceed total hit points.");
        }

        if (!Number.isInteger(participantInput.sortOrder) || participantInput.sortOrder < 0) {
          throw new Error("Sort order must be a whole number.");
        }

        if (
          participantInput.initiative !== null &&
          !Number.isInteger(participantInput.initiative)
        ) {
          throw new Error("Initiative must be a whole number.");
        }

        db.run(
          `
            UPDATE encounter_participants
            SET current_hp = ?,
                initiative = ?,
                incapacitated = ?,
                sort_order = ?
            WHERE id = ?
          `,
          [
            participantInput.currentHp,
            participantInput.initiative,
            participantInput.incapacitated ? 1 : 0,
            participantInput.sortOrder,
            participantInput.id
          ]
        );
      }

      persist();

      return getEncounter(db, input.id)!;
    }
  };
}

export const createPlayerStore = createEncounterTrackerStore;

function openDatabase(SQL: SqlJsStatic, dbPath: string): Database {
  if (fs.existsSync(dbPath)) {
    return new SQL.Database(fs.readFileSync(dbPath));
  }

  return new SQL.Database();
}

function migrate(db: Database): void {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      name TEXT NOT NULL,
      system_id TEXT NOT NULL,
      max_hp INTEGER NOT NULL,
      current_hp INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adventuring_parties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adventuring_party_characters (
      party_id TEXT NOT NULL REFERENCES adventuring_parties(id),
      character_id TEXT NOT NULL REFERENCES characters(id),
      PRIMARY KEY (party_id, character_id)
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL REFERENCES adventuring_parties(id),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS encounter_characters (
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      character_id TEXT NOT NULL REFERENCES characters(id),
      PRIMARY KEY (encounter_id, character_id)
    );

    CREATE TABLE IF NOT EXISTS encounter_participants (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL REFERENCES encounters(id),
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      source_character_id TEXT REFERENCES characters(id),
      max_hp INTEGER NOT NULL,
      current_hp INTEGER NOT NULL,
      initiative INTEGER,
      incapacitated INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  addColumnIfMissing(db, "encounter_participants", "initiative", "INTEGER");
  addColumnIfMissing(db, "encounter_participants", "incapacitated", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(db, "encounter_participants", "sort_order", "INTEGER NOT NULL DEFAULT 0");
}

function addColumnIfMissing(
  db: Database,
  tableName: string,
  columnName: string,
  columnDefinition: string
): void {
  const columns = db.exec(`PRAGMA table_info(${tableName})`);
  const hasColumn =
    columns.length > 0 && columns[0].values.some((column) => column[1] === columnName);

  if (!hasColumn) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function listPlayers(db: Database): Player[] {
  const result = db.exec(
    "SELECT id, name, created_at FROM players ORDER BY lower(name), created_at"
  );

  if (result.length === 0) {
    return [];
  }

  return (result[0].values as PlayerRow[]).map(([id, name, createdAt]) => ({
    id,
    name,
    createdAt
  }));
}

function getPlayer(db: Database, id: string): Player | null {
  const statement = db.prepare("SELECT id, name, created_at FROM players WHERE id = ?");

  try {
    statement.bind([id]);

    if (!statement.step()) {
      return null;
    }

    const [playerId, name, createdAt] = statement.get() as PlayerRow;

    return {
      id: playerId,
      name,
      createdAt
    };
  } finally {
    statement.free();
  }
}

function getCharacter(db: Database, id: string): Character | null {
  const statement = db.prepare(`
    SELECT id, player_id, name, system_id, max_hp, current_hp, created_at
    FROM characters
    WHERE id = ?
  `);

  try {
    statement.bind([id]);

    if (!statement.step()) {
      return null;
    }

    const [characterId, playerId, name, systemId, maxHp, currentHp, createdAt] =
      statement.get() as CharacterRow;

    return {
      id: characterId,
      playerId,
      name,
      systemId,
      maxHp,
      currentHp,
      createdAt
    };
  } finally {
    statement.free();
  }
}

function listCharacters(db: Database): Character[] {
  const result = db.exec(`
    SELECT id, player_id, name, system_id, max_hp, current_hp, created_at
    FROM characters
    ORDER BY lower(name), created_at
  `);

  if (result.length === 0) {
    return [];
  }

  return (result[0].values as CharacterRow[]).map(
    ([id, playerId, name, systemId, maxHp, currentHp, createdAt]) => ({
      id,
      playerId,
      name,
      systemId,
      maxHp,
      currentHp,
      createdAt
    })
  );
}

function listAdventuringParties(db: Database): AdventuringParty[] {
  const result = db.exec(`
    SELECT id, name, system_id, created_at
    FROM adventuring_parties
    ORDER BY lower(name), created_at
  `);

  if (result.length === 0) {
    return [];
  }

  const characterIdsByPartyId = listPartyCharacterIds(db);

  return (result[0].values as AdventuringPartyRow[]).map(([id, name, systemId, createdAt]) => ({
    id,
    name,
    systemId,
    characterIds: characterIdsByPartyId.get(id) ?? [],
    createdAt
  }));
}

function listPartyCharacterIds(db: Database): Map<string, string[]> {
  const result = db.exec(`
    SELECT party_id, character_id
    FROM adventuring_party_characters
    ORDER BY party_id, rowid
  `);

  const characterIdsByPartyId = new Map<string, string[]>();

  if (result.length === 0) {
    return characterIdsByPartyId;
  }

  for (const [partyId, characterId] of result[0].values as PartyCharacterRow[]) {
    characterIdsByPartyId.set(partyId, [
      ...(characterIdsByPartyId.get(partyId) ?? []),
      characterId
    ]);
  }

  return characterIdsByPartyId;
}

function getAdventuringParty(db: Database, id: string): AdventuringParty | null {
  return listAdventuringParties(db).find((party) => party.id === id) ?? null;
}

function listEncounters(db: Database): Encounter[] {
  const result = db.exec(`
    SELECT id, party_id, name, created_at
    FROM encounters
    ORDER BY created_at DESC, lower(name)
  `);

  if (result.length === 0) {
    return [];
  }

  const participantsByEncounterId = listEncounterParticipants(db);

  return (result[0].values as EncounterRow[]).map(([id, partyId, name, createdAt]) => ({
    id,
    partyId,
    name,
    participants: participantsByEncounterId.get(id) ?? [],
    createdAt
  }));
}

function getEncounter(db: Database, id: string): Encounter | null {
  return listEncounters(db).find((encounter) => encounter.id === id) ?? null;
}

function insertEncounterParticipants(db: Database, participants: EncounterParticipant[]): void {
  for (const participant of participants) {
    db.run(
      `
        INSERT INTO encounter_participants (
          id,
          encounter_id,
          type,
          name,
          source_character_id,
          max_hp,
          current_hp,
          initiative,
          incapacitated,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        participant.id,
        participant.encounterId,
        participant.type,
        participant.name,
        participant.sourceCharacterId,
        participant.maxHp,
        participant.currentHp,
        participant.initiative,
        participant.incapacitated ? 1 : 0,
        participant.sortOrder
      ]
    );
  }
}

function listEncounterParticipants(db: Database): Map<string, EncounterParticipant[]> {
  const result = db.exec(`
    SELECT id, encounter_id, type, name, source_character_id, max_hp, current_hp, initiative, incapacitated, sort_order
    FROM encounter_participants
    ORDER BY encounter_id, sort_order, rowid
  `);

  const participantsByEncounterId = new Map<string, EncounterParticipant[]>();

  if (result.length === 0) {
    return participantsByEncounterId;
  }

  for (const [
    id,
    encounterId,
    type,
    name,
    sourceCharacterId,
    maxHp,
    currentHp,
    initiative,
    incapacitated,
    sortOrder
  ] of result[0].values as EncounterParticipantRow[]) {
    participantsByEncounterId.set(encounterId, [
      ...(participantsByEncounterId.get(encounterId) ?? []),
      {
        id,
        encounterId,
        type: type as EncounterParticipantType,
        name,
        sourceCharacterId,
        maxHp,
        currentHp,
        initiative,
        incapacitated: incapacitated === 1,
        sortOrder
      }
    ]);
  }

  return participantsByEncounterId;
}

function validateCharacterInput(
  db: Database,
  input: CreateCharacterInput | UpdateCharacterInput
): Character {
  const name = input.name.trim();

  if (!getPlayer(db, input.playerId)) {
    throw new Error("Player is required.");
  }

  if (!name) {
    throw new Error("Character name is required.");
  }

  if (!gameSystems.some((system) => system.id === input.systemId)) {
    throw new Error("Game system is required.");
  }

  if (!Number.isInteger(input.maxHp) || input.maxHp < 1) {
    throw new Error("Hit points must be a positive whole number.");
  }

  return {
    id: crypto.randomUUID(),
    playerId: input.playerId,
    name,
    systemId: input.systemId,
    maxHp: input.maxHp,
    currentHp: input.maxHp,
    createdAt: new Date().toISOString()
  };
}

function validateAdventuringPartyInput(
  db: Database,
  input: CreateAdventuringPartyInput
): AdventuringParty {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Party name is required.");
  }

  if (!gameSystems.some((system) => system.id === input.systemId)) {
    throw new Error("Game system is required.");
  }

  const characterIds = [...new Set(input.characterIds)];

  if (characterIds.length === 0) {
    throw new Error("Choose at least one character.");
  }

  for (const characterId of characterIds) {
    const character = getCharacter(db, characterId);

    if (!character) {
      throw new Error("Character was not found.");
    }

    if (character.systemId !== input.systemId) {
      throw new Error("Party characters must match the party system.");
    }
  }

  return {
    id: crypto.randomUUID(),
    name,
    systemId: input.systemId,
    characterIds,
    createdAt: new Date().toISOString()
  };
}

function validateEncounterInput(db: Database, input: CreateEncounterInput): Encounter {
  const name = input.name.trim();
  const party = getAdventuringParty(db, input.partyId);

  if (!party) {
    throw new Error("Adventuring party is required.");
  }

  if (!name) {
    throw new Error("Encounter name is required.");
  }

  const characterIds = [...new Set(input.characterIds)];

  const characterParticipants: EncounterParticipant[] = [];

  for (const characterId of characterIds) {
    if (!party.characterIds.includes(characterId)) {
      throw new Error("Encounter characters must belong to the adventuring party.");
    }

    const character = getCharacter(db, characterId);

    if (!character) {
      throw new Error("Character was not found.");
    }

    characterParticipants.push({
      id: crypto.randomUUID(),
      encounterId: "",
      type: "character",
      name: character.name,
      sourceCharacterId: character.id,
      maxHp: character.maxHp,
      currentHp: character.currentHp,
      initiative: null,
      incapacitated: false,
      sortOrder: 0
    });
  }

  const localParticipants = [
    ...validateLocalParticipants(input.allies, "ally"),
    ...validateLocalParticipants(input.opponents, "opponent")
  ];

  const participants = [...characterParticipants, ...localParticipants];

  if (participants.length === 0) {
    throw new Error("Choose at least one participant.");
  }

  const encounterId = crypto.randomUUID();

  return {
    id: encounterId,
    partyId: party.id,
    name,
    participants: participants.map((participant, index) => ({
      ...participant,
      encounterId,
      sortOrder: index
    })),
    createdAt: new Date().toISOString()
  };
}

function validateLocalParticipants(
  inputs: CreateEncounterLocalParticipantInput[],
  type: Extract<EncounterParticipantType, "ally" | "opponent">
): EncounterParticipant[] {
  return inputs.map((input) => {
    const name = input.name.trim();

    if (!name) {
      throw new Error(`${type === "ally" ? "Ally" : "Opponent"} name is required.`);
    }

    if (!Number.isInteger(input.maxHp) || input.maxHp < 1) {
      throw new Error(`${type === "ally" ? "Ally" : "Opponent"} hit points must be positive.`);
    }

    return {
      id: crypto.randomUUID(),
      encounterId: "",
      type,
      name,
      sourceCharacterId: null,
      maxHp: input.maxHp,
      currentHp: input.maxHp,
      initiative: null,
      incapacitated: false,
      sortOrder: 0
    };
  });
}

async function loadSqlJs(): Promise<SqlJsStatic> {
  return initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
}
