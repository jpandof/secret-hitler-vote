import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  CreateSessionPayload,
  JoinSessionPayload,
  KickPlayerPayload,
  OpenVotePayload,
  SubmitVotePayload,
} from './types';
import {
  createSession,
  joinSession,
  disconnectPlayer,
  kickPlayer,
  openVote,
  submitVote,
  closeVote,
  closeSession,
  getSession,
  buildPublicSession,
  buildVoteResult,
} from './sessionManager';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// Map socket.id → { sessionId, playerId }
const socketToPlayer: Record<string, { sessionId: string; playerId: string }> = {};

function emitSessionUpdate(sessionId: string) {
  const session = getSession(sessionId);
  if (!session) return;
  io.to(sessionId).emit('session:update', { session: buildPublicSession(session) });
}

io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ─── Create session ───────────────────────────────────────────────────
  socket.on('session:create', (payload: CreateSessionPayload, callback) => {
    if (!payload.playerName?.trim()) {
      return callback?.({ error: 'Nombre requerido' });
    }

    const result = createSession(payload.playerName.trim(), payload.sessionName?.trim() || '');
    const { session, player } = result;

    socketToPlayer[socket.id] = { sessionId: session.sessionId, playerId: player.id };
    socket.join(session.sessionId);

    callback?.({
      ok: true,
      playerId: player.id,
      session: buildPublicSession(session),
    });
  });

  // ─── Join session ─────────────────────────────────────────────────────
  socket.on('session:join', (payload: JoinSessionPayload, callback) => {
    if (!payload.playerName?.trim() || !payload.code?.trim()) {
      return callback?.({ error: 'Nombre y código requeridos' });
    }

    const result = joinSession(payload.code.trim(), payload.playerName.trim());
    if ('error' in result) return callback?.({ error: result.error });

    const { session, player } = result;
    socketToPlayer[socket.id] = { sessionId: session.sessionId, playerId: player.id };
    socket.join(session.sessionId);

    callback?.({
      ok: true,
      playerId: player.id,
      session: buildPublicSession(session),
    });

    // Notify other players
    socket.to(session.sessionId).emit('session:update', {
      session: buildPublicSession(session),
    });
  });

  // ─── Kick player ──────────────────────────────────────────────────────
  socket.on('player:kick', (payload: KickPlayerPayload, callback) => {
    const meta = socketToPlayer[socket.id];
    if (!meta) return callback?.({ error: 'No estás en ninguna sala' });

    const result = kickPlayer(meta.sessionId, meta.playerId, payload.targetPlayerId);
    if ('error' in result) return callback?.({ error: result.error });

    const { session } = result;

    // Notify kicked player
    const kickedSocketId = Object.keys(socketToPlayer).find(
      (sid) =>
        socketToPlayer[sid].sessionId === meta.sessionId &&
        socketToPlayer[sid].playerId === payload.targetPlayerId,
    );
    if (kickedSocketId) {
      io.to(kickedSocketId).emit('player:kicked', {
        message: 'Has sido expulsado de la sala',
      });
    }

    emitSessionUpdate(meta.sessionId);
    callback?.({ ok: true });
  });

  // ─── Open vote ────────────────────────────────────────────────────────
  socket.on('vote:open', (payload: OpenVotePayload, callback) => {
    const meta = socketToPlayer[socket.id];
    if (!meta) return callback?.({ error: 'No estás en ninguna sala' });

    const result = openVote(meta.sessionId, meta.playerId, payload?.title?.trim() || 'Votación');
    if ('error' in result) return callback?.({ error: result.error });

    emitSessionUpdate(meta.sessionId);
    callback?.({ ok: true });
  });

  // ─── Submit vote ──────────────────────────────────────────────────────
  socket.on('vote:submit', (payload: SubmitVotePayload, callback) => {
    const meta = socketToPlayer[socket.id];
    if (!meta) return callback?.({ error: 'No estás en ninguna sala' });

    if (payload.vote !== 'JA' && payload.vote !== 'NEIN') {
      return callback?.({ error: 'Voto inválido' });
    }

    const result = submitVote(meta.sessionId, meta.playerId, payload.vote);
    if ('error' in result) return callback?.({ error: result.error });

    const { session, autoClose } = result;

    if (autoClose) {
      // All players voted — emit result simultaneously to everyone
      const round = session.voteHistory[session.voteHistory.length - 1];
      const voteResult = buildVoteResult(round, session.players);
      io.to(meta.sessionId).emit('vote:result', voteResult);
    }

    emitSessionUpdate(meta.sessionId);
    callback?.({ ok: true });
  });

  // ─── Close vote (manual, admin) ───────────────────────────────────────
  socket.on('vote:close', (_payload, callback) => {
    const meta = socketToPlayer[socket.id];
    if (!meta) return callback?.({ error: 'No estás en ninguna sala' });

    const result = closeVote(meta.sessionId, meta.playerId);
    if ('error' in result) return callback?.({ error: result.error });

    const { result: voteResult } = result;

    // Emit result simultaneously to all players
    io.to(meta.sessionId).emit('vote:result', voteResult);
    emitSessionUpdate(meta.sessionId);
    callback?.({ ok: true });
  });

  // ─── Close session ────────────────────────────────────────────────────
  socket.on('session:close', (_payload, callback) => {
    const meta = socketToPlayer[socket.id];
    if (!meta) return callback?.({ error: 'No estás en ninguna sala' });

    const result = closeSession(meta.sessionId, meta.playerId);
    if ('error' in result) return callback?.({ error: result.error });

    // Notify all players the session is closed
    io.to(meta.sessionId).emit('session:closed', {
      message: 'La sala ha sido cerrada por el admin',
    });

    // Clean up socket mappings for this session
    Object.keys(socketToPlayer).forEach((sid) => {
      if (socketToPlayer[sid].sessionId === meta.sessionId) {
        delete socketToPlayer[sid];
      }
    });

    callback?.({ ok: true });
  });

  // ─── Disconnect ───────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const meta = socketToPlayer[socket.id];
    if (!meta) return;

    const session = disconnectPlayer(meta.sessionId, meta.playerId);
    if (session) {
      emitSessionUpdate(meta.sessionId);
    }

    delete socketToPlayer[socket.id];
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Secret Hitler Vote server running on http://0.0.0.0:${PORT}`);
});
