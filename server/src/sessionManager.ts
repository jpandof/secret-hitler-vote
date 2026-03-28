import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  Player,
  VoteRound,
  VoteEntry,
  SessionPublic,
  VoteRoundPublic,
  VoteResultPayload,
} from './types';

const sessions: Record<string, Session> = {};
const codeToSessionId: Record<string, string> = {};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildVoteResult(round: VoteRound, players: Record<string, Player>): VoteResultPayload {
  const votes = Object.values(round.votes);
  const totalJa = votes.filter((v) => v.vote === 'JA').length;
  const totalNein = votes.filter((v) => v.vote === 'NEIN').length;

  const votedPlayerIds = new Set(Object.keys(round.votes));
  const nonVoters = Object.values(players)
    .filter((p) => p.connected && !votedPlayerIds.has(p.id))
    .map((p) => ({ playerId: p.id, playerName: p.name }));

  return {
    roundId: round.roundId,
    title: round.title,
    totalJa,
    totalNein,
    votes,
    nonVoters,
  };
}

function buildPublicRound(
  round: VoteRound,
  players: Record<string, Player>,
): VoteRoundPublic {
  const base: VoteRoundPublic = {
    roundId: round.roundId,
    title: round.title,
    status: round.status,
    votedPlayerIds: Object.keys(round.votes),
  };
  if (round.status === 'closed') {
    base.result = buildVoteResult(round, players);
  }
  return base;
}

function buildPublicSession(session: Session): SessionPublic {
  return {
    sessionId: session.sessionId,
    code: session.code,
    name: session.name,
    adminPlayerId: session.adminPlayerId,
    players: Object.values(session.players),
    currentVoteRound: session.currentVoteRound
      ? buildPublicRound(session.currentVoteRound, session.players)
      : null,
    voteHistory: session.voteHistory.map((r) => buildVoteResult(r, session.players)),
  };
}

export function createSession(
  playerName: string,
  sessionName: string,
): { session: Session; player: Player } {
  const sessionId = uuidv4();
  const playerId = uuidv4();
  let code: string;

  do {
    code = generateCode();
  } while (codeToSessionId[code]);

  const player: Player = {
    id: playerId,
    name: playerName,
    connected: true,
    isAdmin: true,
  };

  const session: Session = {
    sessionId,
    code,
    name: sessionName || `Sala ${code}`,
    adminPlayerId: playerId,
    players: { [playerId]: player },
    currentVoteRound: null,
    voteHistory: [],
  };

  sessions[sessionId] = session;
  codeToSessionId[code] = sessionId;

  return { session, player };
}

export function joinSession(
  code: string,
  playerName: string,
): { session: Session; player: Player } | { error: string } {
  const sessionId = codeToSessionId[code.toUpperCase()];
  if (!sessionId) return { error: 'Sala no encontrada' };

  const session = sessions[sessionId];
  if (!session) return { error: 'Sala no encontrada' };

  const duplicate = Object.values(session.players).find(
    (p) => p.name.toLowerCase() === playerName.toLowerCase() && p.connected,
  );
  if (duplicate) return { error: 'Nombre ya en uso en esta sala' };

  const playerId = uuidv4();
  const player: Player = {
    id: playerId,
    name: playerName,
    connected: true,
    isAdmin: false,
  };

  session.players[playerId] = player;
  return { session, player };
}

export function getSession(sessionId: string): Session | undefined {
  return sessions[sessionId];
}

export function getSessionByCode(code: string): Session | undefined {
  const sessionId = codeToSessionId[code.toUpperCase()];
  return sessionId ? sessions[sessionId] : undefined;
}

export function disconnectPlayer(sessionId: string, playerId: string): Session | undefined {
  const session = sessions[sessionId];
  if (!session) return undefined;
  const player = session.players[playerId];
  if (player) player.connected = false;
  return session;
}

export function kickPlayer(
  sessionId: string,
  adminId: string,
  targetPlayerId: string,
): { session: Session } | { error: string } {
  const session = sessions[sessionId];
  if (!session) return { error: 'Sala no encontrada' };
  if (session.adminPlayerId !== adminId) return { error: 'No eres el admin' };
  if (adminId === targetPlayerId) return { error: 'No puedes expulsarte a ti mismo' };

  const target = session.players[targetPlayerId];
  if (!target) return { error: 'Jugador no encontrado' };

  target.connected = false;
  return { session };
}

export function openVote(
  sessionId: string,
  adminId: string,
  title: string,
): { session: Session } | { error: string } {
  const session = sessions[sessionId];
  if (!session) return { error: 'Sala no encontrada' };
  if (session.adminPlayerId !== adminId) return { error: 'No eres el admin' };
  if (session.currentVoteRound && session.currentVoteRound.status === 'open') {
    return { error: 'Ya hay una votación en curso' };
  }

  const round: VoteRound = {
    roundId: uuidv4(),
    title: title || 'Votación',
    status: 'open',
    votes: {},
    createdAt: new Date().toISOString(),
  };

  session.currentVoteRound = round;
  return { session };
}

export function submitVote(
  sessionId: string,
  playerId: string,
  vote: 'JA' | 'NEIN',
): { session: Session; autoClose: boolean } | { error: string } {
  const session = sessions[sessionId];
  if (!session) return { error: 'Sala no encontrada' };

  const round = session.currentVoteRound;
  if (!round || round.status !== 'open') return { error: 'No hay votación abierta' };

  const player = session.players[playerId];
  if (!player) return { error: 'Jugador no encontrado' };
  if (!player.connected) return { error: 'Estás desconectado' };

  if (round.votes[playerId]) return { error: 'Ya has votado' };

  const entry: VoteEntry = { playerId, playerName: player.name, vote };
  round.votes[playerId] = entry;

  // Check if all connected players have voted
  const connectedPlayers = Object.values(session.players).filter((p) => p.connected);
  const voteCount = Object.keys(round.votes).length;
  const autoClose = voteCount >= connectedPlayers.length;

  if (autoClose) {
    round.status = 'closed';
    round.closedAt = new Date().toISOString();
    session.voteHistory.push({ ...round });
    session.currentVoteRound = null;
  }

  return { session, autoClose };
}

export function closeVote(
  sessionId: string,
  adminId: string,
): { session: Session; result: VoteResultPayload } | { error: string } {
  const session = sessions[sessionId];
  if (!session) return { error: 'Sala no encontrada' };
  if (session.adminPlayerId !== adminId) return { error: 'No eres el admin' };

  const round = session.currentVoteRound;
  if (!round || round.status !== 'open') return { error: 'No hay votación abierta' };

  round.status = 'closed';
  round.closedAt = new Date().toISOString();

  const result = buildVoteResult(round, session.players);
  session.voteHistory.push({ ...round });
  session.currentVoteRound = null;

  return { session, result };
}

export function closeSession(
  sessionId: string,
  adminId: string,
): { ok: true } | { error: string } {
  const session = sessions[sessionId];
  if (!session) return { error: 'Sala no encontrada' };
  if (session.adminPlayerId !== adminId) return { error: 'No eres el admin' };

  delete codeToSessionId[session.code];
  delete sessions[sessionId];
  return { ok: true };
}

export { buildPublicSession, buildVoteResult };
