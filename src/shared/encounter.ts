export type EncounterParticipantType = "character" | "ally" | "opponent";

export type EncounterParticipant = {
  id: string;
  encounterId: string;
  type: EncounterParticipantType;
  name: string;
  sourceCharacterId: string | null;
  maxHp: number;
  currentHp: number;
  initiative: number | null;
  incapacitated: boolean;
  sortOrder: number;
};

export type CreateEncounterLocalParticipantInput = {
  name: string;
  maxHp: number;
};

export type Encounter = {
  id: string;
  partyId: string;
  name: string;
  participants: EncounterParticipant[];
  createdAt: string;
};

export type CreateEncounterInput = {
  partyId: string;
  name: string;
  characterIds: string[];
  allies: CreateEncounterLocalParticipantInput[];
  opponents: CreateEncounterLocalParticipantInput[];
};

export type UpdateEncounterInput = CreateEncounterInput & {
  id: string;
};

export type UpdateEncounterRunParticipantInput = {
  id: string;
  currentHp: number;
  initiative: number | null;
  incapacitated: boolean;
  sortOrder: number;
};

export type UpdateEncounterRunInput = {
  id: string;
  participants: UpdateEncounterRunParticipantInput[];
};

export type EncounterApi = {
  list: () => Promise<Encounter[]>;
  create: (input: CreateEncounterInput) => Promise<Encounter>;
  update: (input: UpdateEncounterInput) => Promise<Encounter>;
  updateRun: (input: UpdateEncounterRunInput) => Promise<Encounter>;
};
