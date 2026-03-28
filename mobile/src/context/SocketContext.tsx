import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { SessionPublic, VoteResultPayload } from '../types';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  connect: (serverUrl: string) => void;
  disconnect: () => void;
  session: SessionPublic | null;
  setSession: React.Dispatch<React.SetStateAction<SessionPublic | null>>;
  lastVoteResult: VoteResultPayload | null;
  setLastVoteResult: React.Dispatch<React.SetStateAction<VoteResultPayload | null>>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  connect: () => {},
  disconnect: () => {},
  session: null,
  setSession: () => {},
  lastVoteResult: null,
  setLastVoteResult: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<SessionPublic | null>(null);
  const [lastVoteResult, setLastVoteResult] = useState<VoteResultPayload | null>(null);

  const connect = useCallback((serverUrl: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const socket = io(serverUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('session:update', (data: { session: SessionPublic }) => {
      setSession(data.session);
    });

    socket.on('vote:result', (result: VoteResultPayload) => {
      setLastVoteResult(result);
    });
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
    setSession(null);
    setLastVoteResult(null);
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        connect,
        disconnect,
        session,
        setSession,
        lastVoteResult,
        setLastVoteResult,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
