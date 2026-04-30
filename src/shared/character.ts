export type Character = {
  id: string;
  playerId: string;
  name: string;
  systemId: string;
  maxHp: number;
  currentHp: number;
  createdAt: string;
};

export type CreateCharacterInput = {
  playerId: string;
  name: string;
  systemId: string;
  maxHp: number;
};

export type UpdateCharacterInput = CreateCharacterInput & {
  id: string;
  currentHp: number;
};

export type CharacterApi = {
  list: () => Promise<Character[]>;
  create: (input: CreateCharacterInput) => Promise<Character>;
  update: (input: UpdateCharacterInput) => Promise<Character>;
};
