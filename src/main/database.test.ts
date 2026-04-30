import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPlayerStore } from "./database";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("player store", () => {
  it("creates and lists players sorted by name", async () => {
    const store = await createStore();

    const zed = store.createPlayer({ name: "Zed" });
    const ada = store.createPlayer({ name: "Ada" });

    expect(store.listPlayers()).toEqual([ada, zed]);
  });

  it("trims player names before saving", async () => {
    const store = await createStore();

    const player = store.createPlayer({ name: "  Alice  " });

    expect(player.name).toBe("Alice");
    expect(store.listPlayers()[0].name).toBe("Alice");
  });

  it("rejects blank player names", async () => {
    const store = await createStore();

    expect(() => store.createPlayer({ name: "   " })).toThrow("Player name is required.");
  });

  it("updates a player name", async () => {
    const store = await createStore();

    const player = store.createPlayer({ name: "Meriadoc" });
    const updatedPlayer = store.updatePlayer({ id: player.id, name: "  Merry  " });

    expect(updatedPlayer).toEqual({
      ...player,
      name: "Merry"
    });
    expect(store.listPlayers()).toEqual([updatedPlayer]);
  });

  it("rejects blank player names when updating", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Pippin" });

    expect(() => store.updatePlayer({ id: player.id, name: "   " })).toThrow(
      "Player name is required."
    );
  });

  it("rejects updates for missing players", async () => {
    const store = await createStore();

    expect(() => store.updatePlayer({ id: "missing", name: "Boromir" })).toThrow(
      "Player was not found."
    );
  });

  it("persists players to disk", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-tracker-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "test.sqlite");

    const firstStore = await createPlayerStore(dbPath);
    const player = firstStore.createPlayer({ name: "Morgan" });
    const secondStore = await createPlayerStore(dbPath);

    expect(secondStore.listPlayers()).toEqual([player]);
  });

  it("persists player name updates to disk", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-tracker-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "test.sqlite");

    const firstStore = await createPlayerStore(dbPath);
    const player = firstStore.createPlayer({ name: "Strider" });
    const updatedPlayer = firstStore.updatePlayer({ id: player.id, name: "Aragorn" });
    const secondStore = await createPlayerStore(dbPath);

    expect(secondStore.listPlayers()).toEqual([updatedPlayer]);
  });

  it("creates and lists characters sorted by name", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });

    const wizard = store.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });
    const barbarian = store.createCharacter({
      playerId: player.id,
      name: "Barbarian",
      systemId: "dnd5e",
      maxHp: 15
    });

    expect(store.listCharacters()).toEqual([barbarian, wizard]);
  });

  it("sets current hit points to max hit points when creating a character", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });

    const character = store.createCharacter({
      playerId: player.id,
      name: "Cleric",
      systemId: "dnd5e",
      maxHp: 12
    });

    expect(character.currentHp).toBe(12);
  });

  it("rejects characters without an existing player", async () => {
    const store = await createStore();

    expect(() =>
      store.createCharacter({
        playerId: "missing",
        name: "Ranger",
        systemId: "dnd5e",
        maxHp: 11
      })
    ).toThrow("Player is required.");
  });

  it("rejects blank character names", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });

    expect(() =>
      store.createCharacter({
        playerId: player.id,
        name: "   ",
        systemId: "dnd5e",
        maxHp: 11
      })
    ).toThrow("Character name is required.");
  });

  it("rejects unknown character systems", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });

    expect(() =>
      store.createCharacter({
        playerId: player.id,
        name: "Ranger",
        systemId: "unknown",
        maxHp: 11
      })
    ).toThrow("Game system is required.");
  });

  it("rejects invalid character hit points", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });

    expect(() =>
      store.createCharacter({
        playerId: player.id,
        name: "Ranger",
        systemId: "dnd5e",
        maxHp: 0
      })
    ).toThrow("Hit points must be a positive whole number.");
  });

  it("persists characters to disk", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-tracker-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "test.sqlite");

    const firstStore = await createPlayerStore(dbPath);
    const player = firstStore.createPlayer({ name: "Kirk" });
    const character = firstStore.createCharacter({
      playerId: player.id,
      name: "Paladin",
      systemId: "dnd5e",
      maxHp: 14
    });
    const secondStore = await createPlayerStore(dbPath);

    expect(secondStore.listCharacters()).toEqual([character]);
  });

  it("updates a character", async () => {
    const store = await createStore();
    const firstPlayer = store.createPlayer({ name: "Kirk" });
    const secondPlayer = store.createPlayer({ name: "Spock" });
    const character = store.createCharacter({
      playerId: firstPlayer.id,
      name: "Fighter",
      systemId: "dnd5e",
      maxHp: 10
    });

    const updatedCharacter = store.updateCharacter({
      id: character.id,
      playerId: secondPlayer.id,
      name: "  Wizard  ",
      systemId: "dnd5e",
      maxHp: 8,
      currentHp: 6
    });

    expect(updatedCharacter).toEqual({
      ...character,
      playerId: secondPlayer.id,
      name: "Wizard",
      maxHp: 8,
      currentHp: 8
    });
    expect(store.listCharacters()).toEqual([updatedCharacter]);
  });

  it("sets current hit points to match max hit points when updating", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const character = store.createCharacter({
      playerId: player.id,
      name: "Fighter",
      systemId: "dnd5e",
      maxHp: 10
    });

    const updatedCharacter = store.updateCharacter({
      id: character.id,
      playerId: player.id,
      name: character.name,
      systemId: character.systemId,
      maxHp: 14,
      currentHp: 10
    });

    expect(updatedCharacter.currentHp).toBe(14);
    expect(updatedCharacter.maxHp).toBe(14);
  });

  it("rejects updates for missing characters", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });

    expect(() =>
      store.updateCharacter({
        id: "missing",
        playerId: player.id,
        name: "Rogue",
        systemId: "dnd5e",
        maxHp: 9,
        currentHp: 9
      })
    ).toThrow("Character was not found.");
  });

  it("rejects invalid current hit points when updating a character", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const character = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });

    expect(() =>
      store.updateCharacter({
        id: character.id,
        playerId: player.id,
        name: "Rogue",
        systemId: "dnd5e",
        maxHp: 9,
        currentHp: -1
      })
    ).toThrow("Current hit points must be a whole number.");
  });

  it("creates and lists adventuring parties sorted by name", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const wizard = store.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });

    const zParty = store.createAdventuringParty({
      name: "Z Party",
      systemId: "dnd5e",
      characterIds: [wizard.id]
    });
    const aParty = store.createAdventuringParty({
      name: "A Party",
      systemId: "dnd5e",
      characterIds: [wizard.id, rogue.id]
    });

    expect(store.listAdventuringParties()).toEqual([aParty, zParty]);
  });

  it("deduplicates adventuring party character membership", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });

    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id, rogue.id]
    });

    expect(party.characterIds).toEqual([rogue.id]);
  });

  it("rejects adventuring parties without characters", async () => {
    const store = await createStore();

    expect(() =>
      store.createAdventuringParty({
        name: "The Party",
        systemId: "dnd5e",
        characterIds: []
      })
    ).toThrow("Choose at least one character.");
  });

  it("rejects adventuring parties with characters from a different system", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });

    expect(() =>
      store.createAdventuringParty({
        name: "The Party",
        systemId: "dnd-adventure-club",
        characterIds: [rogue.id]
      })
    ).toThrow("Party characters must match the party system.");
  });

  it("updates an adventuring party", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const wizard = store.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });

    const updatedParty = store.updateAdventuringParty({
      id: party.id,
      name: "  The Company  ",
      systemId: "dnd5e",
      characterIds: [wizard.id, rogue.id]
    });

    expect(updatedParty).toEqual({
      ...party,
      name: "The Company",
      characterIds: [wizard.id, rogue.id]
    });
    expect(store.listAdventuringParties()).toEqual([updatedParty]);
  });

  it("rejects updates for missing adventuring parties", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });

    expect(() =>
      store.updateAdventuringParty({
        id: "missing",
        name: "The Party",
        systemId: "dnd5e",
        characterIds: [rogue.id]
      })
    ).toThrow("Adventuring party was not found.");
  });

  it("persists adventuring parties to disk", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-tracker-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "test.sqlite");

    const firstStore = await createPlayerStore(dbPath);
    const player = firstStore.createPlayer({ name: "Kirk" });
    const rogue = firstStore.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const party = firstStore.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });
    const secondStore = await createPlayerStore(dbPath);

    expect(secondStore.listAdventuringParties()).toEqual([party]);
  });

  it("persists adventuring party updates to disk", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-tracker-"));
    tempDirs.push(dir);
    const dbPath = path.join(dir, "test.sqlite");

    const firstStore = await createPlayerStore(dbPath);
    const player = firstStore.createPlayer({ name: "Kirk" });
    const rogue = firstStore.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const wizard = firstStore.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });
    const party = firstStore.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });
    const updatedParty = firstStore.updateAdventuringParty({
      id: party.id,
      name: "The Company",
      systemId: "dnd5e",
      characterIds: [wizard.id]
    });
    const secondStore = await createPlayerStore(dbPath);

    expect(secondStore.listAdventuringParties()).toEqual([updatedParty]);
  });

  it("creates and lists encounters", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const wizard = store.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [wizard.id, rogue.id]
    });

    const encounter = store.createEncounter({
      partyId: party.id,
      name: "Bridge Ambush",
      characterIds: [rogue.id],
      allies: [{ name: "Guard", maxHp: 7 }],
      opponents: [{ name: "Goblin", maxHp: 5 }]
    });

    expect(encounter.participants).toEqual([
      expect.objectContaining({
        type: "character",
        name: "Rogue",
        sourceCharacterId: rogue.id,
        maxHp: rogue.maxHp,
        currentHp: rogue.currentHp
      }),
      expect.objectContaining({
        type: "ally",
        name: "Guard",
        sourceCharacterId: null,
        maxHp: 7,
        currentHp: 7
      }),
      expect.objectContaining({
        type: "opponent",
        name: "Goblin",
        sourceCharacterId: null,
        maxHp: 5,
        currentHp: 5
      })
    ]);
    expect(store.listEncounters()).toEqual([encounter]);
  });

  it("rejects encounters without an adventuring party", async () => {
    const store = await createStore();

    expect(() =>
      store.createEncounter({
        partyId: "missing",
        name: "Bridge Ambush",
        characterIds: ["missing"],
        allies: [],
        opponents: []
      })
    ).toThrow("Adventuring party is required.");
  });

  it("rejects encounters with characters outside the adventuring party", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const wizard = store.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });

    expect(() =>
      store.createEncounter({
        partyId: party.id,
        name: "Bridge Ambush",
        characterIds: [wizard.id],
        allies: [],
        opponents: []
      })
    ).toThrow("Encounter characters must belong to the adventuring party.");
  });

  it("allows encounters with only local participants", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });

    const encounter = store.createEncounter({
      partyId: party.id,
      name: "Side Scene",
      characterIds: [],
      allies: [],
      opponents: [{ name: "Trap", maxHp: 1 }]
    });

    expect(encounter.participants).toEqual([
      expect.objectContaining({
        type: "opponent",
        name: "Trap",
        maxHp: 1,
        currentHp: 1
      })
    ]);
  });

  it("updates an encounter setup", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const wizard = store.createCharacter({
      playerId: player.id,
      name: "Wizard",
      systemId: "dnd5e",
      maxHp: 8
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id, wizard.id]
    });
    const encounter = store.createEncounter({
      partyId: party.id,
      name: "Bridge Ambush",
      characterIds: [rogue.id],
      allies: [],
      opponents: [{ name: "Goblin", maxHp: 5 }]
    });

    const updatedEncounter = store.updateEncounter({
      id: encounter.id,
      partyId: party.id,
      name: "Gate Ambush",
      characterIds: [wizard.id],
      allies: [{ name: "Guard", maxHp: 7 }],
      opponents: []
    });

    expect(updatedEncounter).toEqual({
      ...encounter,
      name: "Gate Ambush",
      participants: [
        expect.objectContaining({
          type: "character",
          name: "Wizard",
          sourceCharacterId: wizard.id,
          maxHp: wizard.maxHp,
          currentHp: wizard.currentHp
        }),
        expect.objectContaining({
          type: "ally",
          name: "Guard",
          sourceCharacterId: null,
          maxHp: 7,
          currentHp: 7
        })
      ]
    });
    expect(store.listEncounters()).toEqual([updatedEncounter]);
  });

  it("rejects updates for missing encounters", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });

    expect(() =>
      store.updateEncounter({
        id: "missing",
        partyId: party.id,
        name: "Bridge Ambush",
        characterIds: [rogue.id],
        allies: [],
        opponents: []
      })
    ).toThrow("Encounter was not found.");
  });

  it("updates encounter run state", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });
    const encounter = store.createEncounter({
      partyId: party.id,
      name: "Bridge Ambush",
      characterIds: [rogue.id],
      allies: [{ name: "Guard", maxHp: 7 }],
      opponents: []
    });
    const [rogueParticipant, guardParticipant] = encounter.participants;

    const updatedEncounter = store.updateEncounterRun({
      id: encounter.id,
      participants: [
        {
          id: guardParticipant.id,
          currentHp: 0,
          initiative: 18,
          incapacitated: true,
          sortOrder: 0
        },
        {
          id: rogueParticipant.id,
          currentHp: 4,
          initiative: 12,
          incapacitated: false,
          sortOrder: 1
        }
      ]
    });

    expect(updatedEncounter.participants).toEqual([
      expect.objectContaining({
        id: guardParticipant.id,
        currentHp: 0,
        initiative: 18,
        incapacitated: true,
        sortOrder: 0
      }),
      expect.objectContaining({
        id: rogueParticipant.id,
        currentHp: 4,
        initiative: 12,
        incapacitated: false,
        sortOrder: 1
      })
    ]);
  });

  it("rejects encounter run hit points above max hit points", async () => {
    const store = await createStore();
    const player = store.createPlayer({ name: "Kirk" });
    const rogue = store.createCharacter({
      playerId: player.id,
      name: "Rogue",
      systemId: "dnd5e",
      maxHp: 9
    });
    const party = store.createAdventuringParty({
      name: "The Party",
      systemId: "dnd5e",
      characterIds: [rogue.id]
    });
    const encounter = store.createEncounter({
      partyId: party.id,
      name: "Bridge Ambush",
      characterIds: [rogue.id],
      allies: [],
      opponents: []
    });

    expect(() =>
      store.updateEncounterRun({
        id: encounter.id,
        participants: [
          {
            id: encounter.participants[0].id,
            currentHp: 10,
            initiative: null,
            incapacitated: false,
            sortOrder: 0
          }
        ]
      })
    ).toThrow("Current hit points cannot exceed total hit points.");
  });
});

async function createStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-tracker-"));
  tempDirs.push(dir);

  return createPlayerStore(path.join(dir, "test.sqlite"));
}
