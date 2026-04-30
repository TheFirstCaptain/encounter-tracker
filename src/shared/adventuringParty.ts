export type AdventuringParty = {
  id: string;
  name: string;
  systemId: string;
  characterIds: string[];
  createdAt: string;
};

export type CreateAdventuringPartyInput = {
  name: string;
  systemId: string;
  characterIds: string[];
};

export type UpdateAdventuringPartyInput = CreateAdventuringPartyInput & {
  id: string;
};

export type AdventuringPartyApi = {
  list: () => Promise<AdventuringParty[]>;
  create: (input: CreateAdventuringPartyInput) => Promise<AdventuringParty>;
  update: (input: UpdateAdventuringPartyInput) => Promise<AdventuringParty>;
};
