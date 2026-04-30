export type Player = {
  id: string;
  name: string;
  createdAt: string;
};

export type CreatePlayerInput = {
  name: string;
};

export type UpdatePlayerInput = {
  id: string;
  name: string;
};

export type PlayerApi = {
  list: () => Promise<Player[]>;
  create: (input: CreatePlayerInput) => Promise<Player>;
  update: (input: UpdatePlayerInput) => Promise<Player>;
};
