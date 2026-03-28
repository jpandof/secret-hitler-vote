export interface Player {
  id: string;
  name: string;
  connected: boolean;
  isAdmin: boolean;
}

export interface VoteEntry {
  playerId: string;
  playerName: string;
  vote: 'JA' | 'NEIN';
}

export interface VoteResultPayload {
  roundId: string;
  title: string;
  totalJa: number;
  totalNein: number;
  votes: VoteEntry[];
  nonVoters: { playerId: string; playerName: string }[];
}

export interface VoteRoundPublic {
  roundId: string;
  title: string;
  status: 'waiting' | 'open' | 'closed';
  votedPlayerIds: string[];
  result?: VoteResultPayload;
}

export interface SessionPublic {
  sessionId: string;
  code: string;
  name: string;
  adminPlayerId: string;
  players: Player[];
  currentVoteRound: VoteRoundPublic | null;
  voteHistory: VoteResultPayload[];
}

export type RootStackParamList = {
  Home: undefined;
  CreateSession: undefined;
  JoinSession: undefined;
  Room: { session: SessionPublic; playerId: string; serverUrl: string };
};
