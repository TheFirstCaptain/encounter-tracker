import { DragEvent, FormEvent, KeyboardEvent, useEffect, useState } from "react";
import type { AdventuringParty } from "../shared/adventuringParty";
import type { Character } from "../shared/character";
import type { Encounter, EncounterParticipant } from "../shared/encounter";
import { gameSystems } from "../shared/gameSystem";
import type { Player } from "../shared/player";
import { hasDuplicatePlayerName } from "./playerNames";

const defaultSystemId = "dnd5e";
type CharacterPanelMode = "closed" | "add" | "edit";
type PartyPanelMode = "closed" | "add" | "edit";
type EncounterPanelMode = "closed" | "add" | "edit";

export function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [adventuringParties, setAdventuringParties] = useState<AdventuringParty[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [encounterName, setEncounterName] = useState("");
  const [encounterPartyId, setEncounterPartyId] = useState("");
  const [encounterCharacterIds, setEncounterCharacterIds] = useState<string[]>([]);
  const [encounterAllies, setEncounterAllies] = useState([{ name: "", maxHp: "" }]);
  const [encounterOpponents, setEncounterOpponents] = useState([{ name: "", maxHp: "" }]);
  const [encounterPanelMode, setEncounterPanelMode] = useState<EncounterPanelMode>("closed");
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [runningEncounterId, setRunningEncounterId] = useState<string | null>(null);
  const [runParticipants, setRunParticipants] = useState<EncounterParticipant[]>([]);
  const [draggedParticipantId, setDraggedParticipantId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partySystemId, setPartySystemId] = useState(defaultSystemId);
  const [partyCharacterIds, setPartyCharacterIds] = useState<string[]>([]);
  const [partyPanelMode, setPartyPanelMode] = useState<PartyPanelMode>("closed");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [characterPlayerId, setCharacterPlayerId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterSystemId, setCharacterSystemId] = useState(defaultSystemId);
  const [characterMaxHp, setCharacterMaxHp] = useState("");
  const [characterCurrentHp, setCharacterCurrentHp] = useState(0);
  const [characterPanelMode, setCharacterPanelMode] = useState<CharacterPanelMode>("closed");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEncounter, setIsSavingEncounter] = useState(false);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const [isSavingCharacter, setIsSavingCharacter] = useState(false);
  const [isSavingParty, setIsSavingParty] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      window.encounterTracker.players.list(),
      window.encounterTracker.characters.list(),
      window.encounterTracker.adventuringParties.list(),
      window.encounterTracker.encounters.list()
    ])
      .then(([loadedPlayers, loadedCharacters, loadedParties, loadedEncounters]) => {
        if (isMounted) {
          setPlayers(loadedPlayers);
          setCharacters(loadedCharacters);
          setAdventuringParties(loadedParties);
          setEncounters(loadedEncounters);
          setCharacterPlayerId(loadedPlayers[0]?.id ?? "");
          setEncounterPartyId(loadedParties[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Could not load saved data.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const addPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = playerName.trim();

    if (!name) {
      setError("Enter a player name.");
      return;
    }

    if (
      hasDuplicatePlayerName(players, name) &&
      !window.confirm(`A player named "${name}" already exists. Add another player with this name?`)
    ) {
      return;
    }

    setIsSaving(true);

    try {
      const newPlayer = await window.encounterTracker.players.create({ name });
      setPlayers((currentPlayers) => [...currentPlayers, newPlayer].sort(sortPlayersByName));
      setCharacterPlayerId((currentPlayerId) => currentPlayerId || newPlayer.id);
      setPlayerName("");
    } catch {
      setError("Could not add player.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingPlayer = (player: Player) => {
    setError(null);
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  };

  const cancelEditingPlayer = () => {
    setEditingPlayerId(null);
    setEditingPlayerName("");
  };

  const savePlayerName = async (player: Player) => {
    const name = editingPlayerName.trim();

    if (name === player.name) {
      cancelEditingPlayer();
      return;
    }

    if (!name) {
      setError("Enter a player name.");
      return;
    }

    if (
      hasDuplicatePlayerName(players, name, player.id) &&
      !window.confirm(`A player named "${name}" already exists. Rename this player anyway?`)
    ) {
      return;
    }

    setError(null);
    setSavingPlayerId(player.id);

    try {
      const updatedPlayer = await window.encounterTracker.players.update({
        id: player.id,
        name
      });
      setPlayers((currentPlayers) =>
        currentPlayers
          .map((currentPlayer) =>
            currentPlayer.id === updatedPlayer.id ? updatedPlayer : currentPlayer
          )
          .sort(sortPlayersByName)
      );
      cancelEditingPlayer();
    } catch {
      setError("Could not update player.");
    } finally {
      setSavingPlayerId(null);
    }
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, player: Player) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void savePlayerName(player);
    }

    if (event.key === "Escape") {
      cancelEditingPlayer();
    }
  };

  const openAddEncounter = () => {
    const firstParty = adventuringParties[0];

    setError(null);
    setEncounterPanelMode("add");
    setSelectedEncounterId(null);
    setEncounterName("");
    setEncounterPartyId(firstParty?.id ?? "");
    setEncounterCharacterIds(firstParty?.characterIds ?? []);
    setEncounterAllies([{ name: "", maxHp: "" }]);
    setEncounterOpponents([{ name: "", maxHp: "" }]);
  };

  const openEditEncounter = (encounter: Encounter) => {
    setError(null);
    setEncounterPanelMode("edit");
    setSelectedEncounterId(encounter.id);
    setEncounterName(encounter.name);
    setEncounterPartyId(encounter.partyId);
    setEncounterCharacterIds(
      encounter.participants
        .filter((participant) => participant.type === "character" && participant.sourceCharacterId)
        .map((participant) => participant.sourceCharacterId!)
    );
    setEncounterAllies(toLocalParticipantFields(encounter, "ally"));
    setEncounterOpponents(toLocalParticipantFields(encounter, "opponent"));
  };

  const closeEncounterPanel = () => {
    setEncounterPanelMode("closed");
    setSelectedEncounterId(null);
    setEncounterName("");
    setEncounterCharacterIds([]);
    setEncounterAllies([{ name: "", maxHp: "" }]);
    setEncounterOpponents([{ name: "", maxHp: "" }]);
  };

  const openRunEncounter = (encounter: Encounter) => {
    setError(null);
    setRunningEncounterId(encounter.id);
    setRunParticipants([...encounter.participants].sort(sortParticipantsByOrder));
  };

  const closeRunEncounter = () => {
    setRunningEncounterId(null);
    setRunParticipants([]);
    setDraggedParticipantId(null);
  };

  const changeEncounterParty = (partyId: string) => {
    const party = adventuringParties.find((currentParty) => currentParty.id === partyId);

    setEncounterPartyId(partyId);
    setEncounterCharacterIds(party?.characterIds ?? []);
  };

  const toggleEncounterCharacter = (characterId: string) => {
    setEncounterCharacterIds((currentCharacterIds) =>
      currentCharacterIds.includes(characterId)
        ? currentCharacterIds.filter((currentCharacterId) => currentCharacterId !== characterId)
        : [...currentCharacterIds, characterId]
    );
  };

  const updateEncounterLocalParticipant = (
    type: "ally" | "opponent",
    index: number,
    field: "name" | "maxHp",
    value: string
  ) => {
    const update = (items: { name: string; maxHp: string }[]) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item));

    if (type === "ally") {
      setEncounterAllies(update);
    } else {
      setEncounterOpponents(update);
    }
  };

  const addEncounterLocalParticipant = (type: "ally" | "opponent") => {
    if (type === "ally") {
      setEncounterAllies((currentAllies) => [...currentAllies, { name: "", maxHp: "" }]);
    } else {
      setEncounterOpponents((currentOpponents) => [
        ...currentOpponents,
        { name: "", maxHp: "" }
      ]);
    }
  };

  const saveEncounter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = encounterName.trim();

    if (!encounterPartyId) {
      setError("Choose an adventuring party for this encounter.");
      return;
    }

    if (!name) {
      setError("Enter an encounter name.");
      return;
    }

    const allies = normalizeLocalParticipants(encounterAllies);
    const opponents = normalizeLocalParticipants(encounterOpponents);

    if (encounterCharacterIds.length === 0 && allies.length === 0 && opponents.length === 0) {
      setError("Choose at least one participant.");
      return;
    }

    setIsSavingEncounter(true);

    try {
      if (encounterPanelMode === "edit" && selectedEncounterId) {
        const updatedEncounter = await window.encounterTracker.encounters.update({
          id: selectedEncounterId,
          partyId: encounterPartyId,
          name,
          characterIds: encounterCharacterIds,
          allies,
          opponents
        });
        setEncounters((currentEncounters) =>
          currentEncounters.map((encounter) =>
            encounter.id === updatedEncounter.id ? updatedEncounter : encounter
          )
        );
      } else {
        const newEncounter = await window.encounterTracker.encounters.create({
          partyId: encounterPartyId,
          name,
          characterIds: encounterCharacterIds,
          allies,
          opponents
        });
        setEncounters((currentEncounters) => [newEncounter, ...currentEncounters]);
      }
      closeEncounterPanel();
    } catch {
      setError("Could not save encounter.");
    } finally {
      setIsSavingEncounter(false);
    }
  };

  const updateRunParticipant = (
    participantId: string,
    field: "currentHp" | "incapacitated" | "initiative",
    value: string | boolean
  ) => {
    setRunParticipants((currentParticipants) => {
      const nextParticipants = currentParticipants.map((participant) => {
        if (participant.id !== participantId) {
          return participant;
        }

        if (field === "currentHp") {
          return {
            ...participant,
            currentHp: Math.min(Number(value), participant.maxHp)
          };
        }

        if (field === "initiative") {
          return {
            ...participant,
            initiative: value === "" ? null : Number(value)
          };
        }

        return {
          ...participant,
          incapacitated: Boolean(value)
        };
      });

      return nextParticipants;
    });
  };

  const reorderRunParticipantsByInitiative = () => {
    setRunParticipants((currentParticipants) => sortParticipantsByInitiative(currentParticipants));
  };

  const moveRunParticipant = (targetParticipantId: string) => {
    if (!draggedParticipantId || draggedParticipantId === targetParticipantId) {
      return;
    }

    setRunParticipants((currentParticipants) => {
      const draggedIndex = currentParticipants.findIndex(
        (participant) => participant.id === draggedParticipantId
      );
      const targetIndex = currentParticipants.findIndex(
        (participant) => participant.id === targetParticipantId
      );

      if (draggedIndex < 0 || targetIndex < 0) {
        return currentParticipants;
      }

      const nextParticipants = [...currentParticipants];
      const [draggedParticipant] = nextParticipants.splice(draggedIndex, 1);
      nextParticipants.splice(targetIndex, 0, draggedParticipant);

      return nextParticipants.map((participant, index) => ({
        ...participant,
        sortOrder: index
      }));
    });
  };

  const saveRunEncounter = async () => {
    if (!runningEncounterId) {
      return;
    }

    setError(null);
    setIsSavingRun(true);

    try {
      const updatedEncounter = await window.encounterTracker.encounters.updateRun({
        id: runningEncounterId,
        participants: runParticipants.map((participant, index) => ({
          id: participant.id,
          currentHp: participant.currentHp,
          initiative: participant.initiative,
          incapacitated: participant.incapacitated,
          sortOrder: index
        }))
      });
      setEncounters((currentEncounters) =>
        currentEncounters.map((encounter) =>
          encounter.id === updatedEncounter.id ? updatedEncounter : encounter
        )
      );
      setRunParticipants([...updatedEncounter.participants].sort(sortParticipantsByOrder));
    } catch {
      setError("Could not save encounter run state.");
    } finally {
      setIsSavingRun(false);
    }
  };

  const openAddParty = () => {
    setError(null);
    setPartyPanelMode("add");
    setSelectedPartyId(null);
    setPartyName("");
    setPartySystemId(defaultSystemId);
    setPartyCharacterIds([]);
  };

  const openEditParty = (party: AdventuringParty) => {
    setError(null);
    setPartyPanelMode("edit");
    setSelectedPartyId(party.id);
    setPartyName(party.name);
    setPartySystemId(party.systemId);
    setPartyCharacterIds(party.characterIds);
  };

  const closePartyPanel = () => {
    setPartyPanelMode("closed");
    setSelectedPartyId(null);
    setPartyName("");
    setPartyCharacterIds([]);
  };

  const togglePartyCharacter = (characterId: string) => {
    setPartyCharacterIds((currentCharacterIds) =>
      currentCharacterIds.includes(characterId)
        ? currentCharacterIds.filter((currentCharacterId) => currentCharacterId !== characterId)
        : [...currentCharacterIds, characterId]
    );
  };

  const saveParty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = partyName.trim();

    if (!name) {
      setError("Enter a party name.");
      return;
    }

    if (partyCharacterIds.length === 0) {
      setError("Choose at least one character.");
      return;
    }

    setIsSavingParty(true);

    try {
      if (partyPanelMode === "edit" && selectedPartyId) {
        const updatedParty = await window.encounterTracker.adventuringParties.update({
          id: selectedPartyId,
          name,
          systemId: partySystemId,
          characterIds: partyCharacterIds
        });
        setAdventuringParties((currentParties) =>
          currentParties
            .map((party) => (party.id === updatedParty.id ? updatedParty : party))
            .sort(sortPartiesByName)
        );
      } else {
        const newParty = await window.encounterTracker.adventuringParties.create({
          name,
          systemId: partySystemId,
          characterIds: partyCharacterIds
        });
        setAdventuringParties((currentParties) =>
          [...currentParties, newParty].sort(sortPartiesByName)
        );
      }
      closePartyPanel();
    } catch {
      setError("Could not save adventuring party.");
    } finally {
      setIsSavingParty(false);
    }
  };

  const openAddCharacter = () => {
    setError(null);
    setCharacterPanelMode("add");
    setSelectedCharacterId(null);
    setCharacterPlayerId(players[0]?.id ?? "");
    setCharacterName("");
    setCharacterSystemId(defaultSystemId);
    setCharacterMaxHp("");
    setCharacterCurrentHp(0);
  };

  const openEditCharacter = (character: Character) => {
    setError(null);
    setCharacterPanelMode("edit");
    setSelectedCharacterId(character.id);
    setCharacterPlayerId(character.playerId);
    setCharacterName(character.name);
    setCharacterSystemId(character.systemId);
    setCharacterMaxHp(String(character.maxHp));
    setCharacterCurrentHp(character.currentHp);
  };

  const closeCharacterPanel = () => {
    setCharacterPanelMode("closed");
    setSelectedCharacterId(null);
    setCharacterName("");
    setCharacterMaxHp("");
    setCharacterCurrentHp(0);
  };

  const saveCharacter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const name = characterName.trim();
    const maxHp = Number(characterMaxHp);

    if (!characterPlayerId) {
      setError("Choose a player for this character.");
      return;
    }

    if (!name) {
      setError("Enter a character name.");
      return;
    }

    if (!Number.isInteger(maxHp) || maxHp < 1) {
      setError("Enter hit points as a positive whole number.");
      return;
    }

    setIsSavingCharacter(true);

    try {
      if (characterPanelMode === "edit" && selectedCharacterId) {
        const updatedCharacter = await window.encounterTracker.characters.update({
          id: selectedCharacterId,
          playerId: characterPlayerId,
          name,
          systemId: characterSystemId,
          maxHp,
          currentHp: characterCurrentHp
        });
        setCharacters((currentCharacters) =>
          currentCharacters
            .map((character) =>
              character.id === updatedCharacter.id ? updatedCharacter : character
            )
            .sort(sortCharactersByName)
        );
      } else {
        const newCharacter = await window.encounterTracker.characters.create({
          playerId: characterPlayerId,
          name,
          systemId: characterSystemId,
          maxHp
        });
        setCharacters((currentCharacters) =>
          [...currentCharacters, newCharacter].sort(sortCharactersByName)
        );
      }
      closeCharacterPanel();
    } catch {
      setError("Could not save character.");
    } finally {
      setIsSavingCharacter(false);
    }
  };

  const currentHpPreview =
    characterPanelMode === "edit"
      ? String(Number(characterMaxHp) || 0)
      : characterMaxHp.trim() || "0";

  return (
    <main className="app-shell">
      {error ? <p className="error-message global-message">{error}</p> : null}

      <section
        className="workspace hero-workspace encounters-section"
        aria-labelledby="encounters-heading"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Encounter Tracker</p>
            <h1 id="encounters-heading">Encounters</h1>
          </div>
          <button type="button" onClick={openAddEncounter} disabled={adventuringParties.length === 0}>
            Add
          </button>
        </div>

        <div className="party-list" aria-live="polite">
          {isLoading ? <p className="muted">Loading encounters...</p> : null}

          {!isLoading && encounters.length === 0 ? (
            <div className="empty-state">
              <h2>No encounters yet</h2>
              <p>Create an adventuring party first, then start an encounter from its characters.</p>
            </div>
          ) : null}

          {!isLoading && encounters.length > 0 ? (
            <ul>
              {encounters.map((encounter) => (
                <li key={encounter.id}>
                  <div className="encounter-row">
                    <button
                      className="character-row-button"
                      type="button"
                      onClick={() => openEditEncounter(encounter)}
                    >
                    <span>
                      <strong>{encounter.name}</strong>
                      <small>
                        {getPartyName(adventuringParties, encounter.partyId)} -{" "}
                        {encounter.participants
                          .map((participant) => participant.name)
                          .join(", ")}
                      </small>
                    </span>
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openRunEncounter(encounter)}
                    >
                      Run
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {runningEncounterId ? (
          <section className="character-details" aria-labelledby="run-encounter-heading">
            <div className="details-header">
              <h2 id="run-encounter-heading">Run Encounter</h2>
              <button className="secondary-button" type="button" onClick={closeRunEncounter}>
                Close
              </button>
            </div>

            <div className="run-grid" role="grid">
              <div className="run-grid-header" role="row">
                <span>Name</span>
                <span>Type</span>
                <span>Init</span>
                <span>HP</span>
                <span>Down</span>
              </div>
              {runParticipants.map((participant) => (
                <div
                  className="run-grid-row"
                  draggable
                  key={participant.id}
                  onDragStart={() => setDraggedParticipantId(participant.id)}
                  onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                  onDrop={() => moveRunParticipant(participant.id)}
                  onDragEnd={() => setDraggedParticipantId(null)}
                  role="row"
                >
                  <span>{participant.name}</span>
                  <span>{participant.type}</span>
                  <input
                    aria-label={`${participant.name} initiative`}
                    type="number"
                    step="1"
                    value={participant.initiative ?? ""}
                    onChange={(event) =>
                      updateRunParticipant(participant.id, "initiative", event.target.value)
                    }
                    onBlur={reorderRunParticipantsByInitiative}
                  />
                  <input
                    aria-label={`${participant.name} current hit points`}
                    type="number"
                    min="0"
                    max={participant.maxHp}
                    step="1"
                    value={participant.currentHp}
                    onChange={(event) =>
                      updateRunParticipant(participant.id, "currentHp", event.target.value)
                    }
                  />
                  <input
                    aria-label={`${participant.name} incapacitated`}
                    checked={participant.incapacitated}
                    onChange={(event) =>
                      updateRunParticipant(participant.id, "incapacitated", event.target.checked)
                    }
                    type="checkbox"
                  />
                </div>
              ))}
            </div>

            <div className="details-actions">
              <button type="button" onClick={() => void saveRunEncounter()} disabled={isSavingRun}>
                {isSavingRun ? "Saving" : "Save"}
              </button>
            </div>
          </section>
        ) : null}

        {encounterPanelMode !== "closed" ? (
          <form className="character-details" onSubmit={saveEncounter}>
            <div className="details-header">
              <h2>{encounterPanelMode === "add" ? "Add Encounter" : "Encounter Setup"}</h2>
              <button className="secondary-button" type="button" onClick={closeEncounterPanel}>
                Close
              </button>
            </div>

            <div className="party-form-grid">
              <div className="form-field">
                <label htmlFor="encounter-name">Encounter name</label>
                <input
                  id="encounter-name"
                  value={encounterName}
                  onChange={(event) => setEncounterName(event.target.value)}
                  placeholder="Bridge Ambush"
                  autoComplete="off"
                />
              </div>

              <div className="form-field">
                <label htmlFor="encounter-party">Adventuring party</label>
                <select
                  id="encounter-party"
                  value={encounterPartyId}
                  onChange={(event) => changeEncounterParty(event.target.value)}
                >
                  {adventuringParties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="character-picker">
              <legend>Adventuring Party</legend>
              {getPartyCharacters(adventuringParties, characters, encounterPartyId).map(
                (character) => (
                  <label key={character.id}>
                    <input
                      type="checkbox"
                      checked={encounterCharacterIds.includes(character.id)}
                      onChange={() => toggleEncounterCharacter(character.id)}
                    />
                    <span>
                      {character.name} ({getPlayerName(players, character.playerId)})
                    </span>
                  </label>
                )
              )}
            </fieldset>

            <div className="encounter-local-grid">
              <fieldset className="character-picker">
                <legend>Allies</legend>
                {encounterAllies.map((ally, index) => (
                  <div className="local-participant-row" key={`ally-${index}`}>
                    <input
                      value={ally.name}
                      onChange={(event) =>
                        updateEncounterLocalParticipant("ally", index, "name", event.target.value)
                      }
                      placeholder="Ally name"
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={ally.maxHp}
                      onChange={(event) =>
                        updateEncounterLocalParticipant("ally", index, "maxHp", event.target.value)
                      }
                      placeholder="HP"
                    />
                  </div>
                ))}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => addEncounterLocalParticipant("ally")}
                >
                  Add Ally
                </button>
              </fieldset>

              <fieldset className="character-picker">
                <legend>Opponents</legend>
                {encounterOpponents.map((opponent, index) => (
                  <div className="local-participant-row" key={`opponent-${index}`}>
                    <input
                      value={opponent.name}
                      onChange={(event) =>
                        updateEncounterLocalParticipant(
                          "opponent",
                          index,
                          "name",
                          event.target.value
                        )
                      }
                      placeholder="Opponent name"
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={opponent.maxHp}
                      onChange={(event) =>
                        updateEncounterLocalParticipant(
                          "opponent",
                          index,
                          "maxHp",
                          event.target.value
                        )
                      }
                      placeholder="HP"
                    />
                  </div>
                ))}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => addEncounterLocalParticipant("opponent")}
                >
                  Add Opponent
                </button>
              </fieldset>
            </div>

            <div className="details-actions">
              <button type="submit" disabled={isSavingEncounter}>
                {isSavingEncounter ? "Saving" : "Save"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="workspace parties-section" aria-labelledby="parties-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">Company</p>
            <h1 id="parties-heading">Adventuring Parties</h1>
          </div>
          <button type="button" onClick={openAddParty} disabled={characters.length === 0}>
            Add
          </button>
        </div>

        <div className="party-list" aria-live="polite">
          {isLoading ? <p className="muted">Loading parties...</p> : null}

          {!isLoading && adventuringParties.length === 0 ? (
            <div className="empty-state">
              <h2>No adventuring parties yet</h2>
              <p>Create a party from characters who share the same system.</p>
            </div>
          ) : null}

          {!isLoading && adventuringParties.length > 0 ? (
            <ul>
              {adventuringParties.map((party) => (
                <li key={party.id}>
                  <button
                    className="character-row-button"
                    type="button"
                    onClick={() => openEditParty(party)}
                  >
                    <span>
                      <strong>{party.name}</strong>
                      <small>
                        {getSystemName(party.systemId)} -{" "}
                        {party.characterIds
                          .map((characterId) => getCharacterName(characters, characterId))
                          .join(", ")}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {partyPanelMode !== "closed" ? (
          <form className="character-details" onSubmit={saveParty}>
            <div className="details-header">
              <h2>{partyPanelMode === "add" ? "Add Adventuring Party" : "Adventuring Party Details"}</h2>
              <button className="secondary-button" type="button" onClick={closePartyPanel}>
                Close
              </button>
            </div>

            <div className="party-form-grid">
              <div className="form-field">
                <label htmlFor="party-name">Party name</label>
                <input
                  id="party-name"
                  value={partyName}
                  onChange={(event) => setPartyName(event.target.value)}
                  placeholder="The Fellowship"
                  autoComplete="off"
                />
              </div>

              <div className="form-field">
                <label htmlFor="party-system">System</label>
                <select
                  id="party-system"
                  value={partySystemId}
                  onChange={(event) => {
                    setPartySystemId(event.target.value);
                    setPartyCharacterIds([]);
                  }}
                >
                  {gameSystems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="character-picker">
              <legend>Characters</legend>
              {characters.filter((character) => character.systemId === partySystemId).length === 0 ? (
                <p className="muted">No characters match this system.</p>
              ) : null}
              {characters
                .filter((character) => character.systemId === partySystemId)
                .map((character) => (
                  <label key={character.id}>
                    <input
                      type="checkbox"
                      checked={partyCharacterIds.includes(character.id)}
                      onChange={() => togglePartyCharacter(character.id)}
                    />
                    <span>
                      {character.name} ({getPlayerName(players, character.playerId)})
                    </span>
                  </label>
                ))}
            </fieldset>

            <div className="details-actions">
              <button type="submit" disabled={isSavingParty}>
                {isSavingParty ? "Saving" : "Save"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="workspace players-section" aria-labelledby="players-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">People</p>
            <h1 id="players-heading">Players</h1>
          </div>
        </div>

        <form className="add-player-form" onSubmit={addPlayer}>
          <label htmlFor="player-name">Player name</label>
          <div className="add-player-row">
            <input
              id="player-name"
              name="playerName"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Add a player"
              autoComplete="off"
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Adding" : "Add"}
            </button>
          </div>
        </form>

        <div className="player-list" aria-live="polite">
          {isLoading ? <p className="muted">Loading players...</p> : null}

          {!isLoading && players.length === 0 ? (
            <div className="empty-state">
              <h2>No players yet</h2>
              <p>Add the people at your table to get started.</p>
            </div>
          ) : null}

          {!isLoading && players.length > 0 ? (
            <ul>
              {players.map((player) => (
                <li key={player.id}>
                  {editingPlayerId === player.id ? (
                    <input
                      className="player-name-input"
                      aria-label={`Edit ${player.name}`}
                      value={editingPlayerName}
                      onChange={(event) => setEditingPlayerName(event.target.value)}
                      onBlur={() => void savePlayerName(player)}
                      onKeyDown={(event) => handleEditKeyDown(event, player)}
                      autoFocus
                      disabled={savingPlayerId === player.id}
                    />
                  ) : (
                    <button
                      className="player-name-button"
                      type="button"
                      onClick={() => startEditingPlayer(player)}
                    >
                      {player.name}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="workspace characters-section" aria-labelledby="characters-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">Roster</p>
            <h1 id="characters-heading">Characters</h1>
          </div>
          <button type="button" onClick={openAddCharacter} disabled={players.length === 0}>
            Add
          </button>
        </div>

        <div className="character-list" aria-live="polite">
          {isLoading ? <p className="muted">Loading characters...</p> : null}

          {!isLoading && characters.length === 0 ? (
            <div className="empty-state">
              <h2>No characters yet</h2>
              <p>Add player characters once their players are on the roster.</p>
            </div>
          ) : null}

          {!isLoading && characters.length > 0 ? (
            <ul>
              {characters.map((character) => (
                <li key={character.id}>
                  <button
                    className="character-row-button"
                    type="button"
                    onClick={() => openEditCharacter(character)}
                  >
                    <span>
                      <strong>{character.name}</strong>
                      <small>
                        {getPlayerName(players, character.playerId)} -{" "}
                        {getSystemName(character.systemId)}
                      </small>
                    </span>
                    <span>{character.currentHp}/{character.maxHp} HP</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {characterPanelMode !== "closed" ? (
          <form className="character-details" onSubmit={saveCharacter}>
            <div className="details-header">
              <h2>{characterPanelMode === "add" ? "Add Character" : "Character Details"}</h2>
              <button className="secondary-button" type="button" onClick={closeCharacterPanel}>
                Close
              </button>
            </div>

            <div className="character-form-grid">
              <div className="character-form-row character-form-row-primary">
                <div className="form-field">
                  <label htmlFor="character-player">Player</label>
                  <select
                    id="character-player"
                    value={characterPlayerId}
                    onChange={(event) => setCharacterPlayerId(event.target.value)}
                    disabled={players.length === 0}
                  >
                    {players.length === 0 ? <option value="">Add a player first</option> : null}
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="character-name">Character name</label>
                  <input
                    id="character-name"
                    value={characterName}
                    onChange={(event) => setCharacterName(event.target.value)}
                    placeholder="Add a character"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="character-form-row character-form-row-stats">
                <div className="form-field">
                  <label htmlFor="character-system">System</label>
                  <select
                    id="character-system"
                    value={characterSystemId}
                    onChange={(event) => setCharacterSystemId(event.target.value)}
                  >
                    {gameSystems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="character-max-hp">Hit points</label>
                  <input
                    id="character-max-hp"
                    type="number"
                    min="1"
                    step="1"
                    value={characterMaxHp}
                    onChange={(event) => setCharacterMaxHp(event.target.value)}
                    placeholder="10"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="character-current-hp">Current hit points</label>
                  <input id="character-current-hp" value={currentHpPreview} readOnly />
                </div>
              </div>
            </div>

            <div className="details-actions">
              <button type="submit" disabled={isSavingCharacter || players.length === 0}>
                {isSavingCharacter ? "Saving" : "Save"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}

function sortPlayersByName(left: Player, right: Player): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function sortCharactersByName(left: Character, right: Character): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function sortPartiesByName(left: AdventuringParty, right: AdventuringParty): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function sortParticipantsByOrder(
  left: EncounterParticipant,
  right: EncounterParticipant
): number {
  return left.sortOrder - right.sortOrder;
}

function sortParticipantsByInitiative(participants: EncounterParticipant[]): EncounterParticipant[] {
  return [...participants]
    .sort((left, right) => {
      if (left.initiative === null && right.initiative === null) {
        return left.sortOrder - right.sortOrder;
      }

      if (left.initiative === null) {
        return 1;
      }

      if (right.initiative === null) {
        return -1;
      }

      if (left.initiative !== right.initiative) {
        return right.initiative - left.initiative;
      }

      return left.sortOrder - right.sortOrder;
    })
    .map((participant, index) => ({
      ...participant,
      sortOrder: index
    }));
}

function getPlayerName(players: Player[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? "Unknown player";
}

function getSystemName(systemId: string): string {
  return gameSystems.find((system) => system.id === systemId)?.name ?? systemId;
}

function getCharacterName(characters: Character[], characterId: string): string {
  return characters.find((character) => character.id === characterId)?.name ?? "Unknown character";
}

function getPartyName(parties: AdventuringParty[], partyId: string): string {
  return parties.find((party) => party.id === partyId)?.name ?? "Unknown adventuring party";
}

function getPartyCharacters(
  parties: AdventuringParty[],
  characters: Character[],
  partyId: string
): Character[] {
  const party = parties.find((currentParty) => currentParty.id === partyId);

  if (!party) {
    return [];
  }

  return party.characterIds
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter((character): character is Character => Boolean(character));
}

function normalizeLocalParticipants(items: { name: string; maxHp: string }[]) {
  return items
    .map((item) => ({
      name: item.name.trim(),
      maxHp: Number(item.maxHp)
    }))
    .filter((item) => item.name || item.maxHp);
}

function toLocalParticipantFields(encounter: Encounter, type: "ally" | "opponent") {
  const participants = encounter.participants
    .filter((participant) => participant.type === type)
    .map((participant) => ({
      name: participant.name,
      maxHp: String(participant.maxHp)
    }));

  return participants.length > 0 ? participants : [{ name: "", maxHp: "" }];
}
