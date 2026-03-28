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

export interface VoteRound {
  roundId: string;
  title: string;
  status: 'waiting' | 'open' | 'closed';
  votes: Record<string, VoteEntry>;
  createdAt: string;
  closedAt?: string;
}

export interface Session {
  sessionId: string;
  code: string;
  name: string;
  adminPlayerId: string;
  players: Record<string, Player>;
  currentVoteRound: VoteRound | null;
  voteHistory: VoteRound[];
}

// Socket.IO event payloads (client → server)
export interface CreateSessionPayload {
  playerName: string;
  sessionName?: string;
}

export interface JoinSessionPayload {
  playerName: string;
  code: string;
}

export interface KickPlayerPayload {
  targetPlayerId: string;
}

export interface OpenVotePayload {
  title?: string;
}

export interface SubmitVotePayload {
  vote: 'JA' | 'NEIN';
}

// Socket.IO event payloads (server → client)
export interface SessionUpdatePayload {
  session: SessionPublic;
}

export interface VoteResultPayload {
  roundId: string;
  title: string;
  totalJa: number;
  totalNein: number;
  votes: VoteEntry[];
  nonVoters: { playerId: string; playerName: string }[];
}

export interface ErrorPayload {
  message: string;
}

export interface KickedPayload {
  message: string;
}

// Public view of session (safe to send to clients)
export interface SessionPublic {
  sessionId: string;
  code: string;
  name: string;
  adminPlayerId: string;
  players: Player[];
  currentVoteRound: VoteRoundPublic | null;
  voteHistory: VoteResultPayload[];
}

// Public view of a vote round (hides individual votes while open)
export interface VoteRoundPublic {
  roundId: string;
  title: string;
  status: 'waiting' | 'open' | 'closed';
  votedPlayerIds: string[];
  result?: VoteResultPayload;
}
