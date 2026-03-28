import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Player, VoteResultPayload } from '../types';
import { useSocket } from '../context/SocketContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

export default function RoomScreen({ navigation, route }: Props) {
  const { playerId } = route.params;
  const { socket, session, setSession, disconnect, lastVoteResult, setLastVoteResult } =
    useSocket();

  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [voteTitle, setVoteTitle] = useState('');
  const [resultVisible, setResultVisible] = useState(false);
  const [shownResult, setShownResult] = useState<VoteResultPayload | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);

  const isAdmin = session?.adminPlayerId === playerId;
  const currentVote = session?.currentVoteRound;

  // Show result when vote:result received
  useEffect(() => {
    if (lastVoteResult) {
      setShownResult(lastVoteResult);
      setResultVisible(true);
      setHasVoted(false);
      setLastVoteResult(null);
    }
  }, [lastVoteResult, setLastVoteResult]);

  // Reset hasVoted when a new voting round starts
  useEffect(() => {
    if (currentVote?.status === 'open') {
      const alreadyVoted = currentVote.votedPlayerIds.includes(playerId);
      setHasVoted(alreadyVoted);
    }
  }, [currentVote, playerId]);

  // Listen for kicks and session close
  useEffect(() => {
    if (!socket) return;

    const onKicked = (data: { message: string }) => {
      Alert.alert('Expulsado', data.message, [
        {
          text: 'OK',
          onPress: () => {
            disconnect();
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]);
    };

    const onSessionClosed = (data: { message: string }) => {
      Alert.alert('Sala cerrada', data.message, [
        {
          text: 'OK',
          onPress: () => {
            disconnect();
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]);
    };

    socket.on('player:kicked', onKicked);
    socket.on('session:closed', onSessionClosed);
    return () => {
      socket.off('player:kicked', onKicked);
      socket.off('session:closed', onSessionClosed);
    };
  }, [socket, disconnect, navigation]);

  const handleOpenVote = useCallback(() => {
    if (!socket) return;
    socket.emit('vote:open', { title: voteTitle.trim() || 'Votación' }, (res: any) => {
      if (res?.error) Alert.alert('Error', res.error);
      else setVoteModalVisible(false);
      setVoteTitle('');
    });
  }, [socket, voteTitle]);

  const handleSubmitVote = useCallback(
    (vote: 'JA' | 'NEIN') => {
      if (!socket || submittingVote) return;
      setSubmittingVote(true);
      socket.emit('vote:submit', { vote }, (res: any) => {
        setSubmittingVote(false);
        if (res?.error) {
          Alert.alert('Error', res.error);
        } else {
          setHasVoted(true);
        }
      });
    },
    [socket, submittingVote],
  );

  const handleCloseVote = useCallback(() => {
    if (!socket) return;
    socket.emit('vote:close', {}, (res: any) => {
      if (res?.error) Alert.alert('Error', res.error);
    });
  }, [socket]);

  const handleKickPlayer = useCallback(
    (targetPlayerId: string, targetName: string) => {
      Alert.alert('Expulsar jugador', `¿Expulsar a ${targetName}?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expulsar',
          style: 'destructive',
          onPress: () => {
            socket?.emit('player:kick', { targetPlayerId }, (res: any) => {
              if (res?.error) Alert.alert('Error', res.error);
            });
          },
        },
      ]);
    },
    [socket],
  );

  const handleCloseSession = useCallback(() => {
    Alert.alert('Cerrar sala', '¿Cerrar la sala para todos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sala',
        style: 'destructive',
        onPress: () => {
          socket?.emit('session:close', {}, (res: any) => {
            if (res?.error) Alert.alert('Error', res.error);
          });
        },
      },
    ]);
  }, [socket]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Conectando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const connectedPlayers = session.players.filter((p) => p.connected);
  const me = session.players.find((p) => p.id === playerId);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.roomName}>{session.name}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Código de sala</Text>
            <Text style={styles.code}>{session.code}</Text>
          </View>
          {me && (
            <Text style={styles.myName}>
              {me.isAdmin ? '👑 ' : ''}
              {me.name} (tú)
            </Text>
          )}
        </View>

        {/* Players list */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Jugadores ({connectedPlayers.length})
          </Text>
          {session.players.map((player: Player) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text
                  style={[
                    styles.playerName,
                    !player.connected && styles.playerDisconnected,
                  ]}
                >
                  {player.isAdmin ? '👑 ' : ''}
                  {player.name}
                  {player.id === playerId ? ' (tú)' : ''}
                </Text>
                {!player.connected && (
                  <Text style={styles.disconnectedTag}>desconectado</Text>
                )}
              </View>
              {isAdmin && player.id !== playerId && player.connected && (
                <TouchableOpacity
                  style={styles.kickButton}
                  onPress={() => handleKickPlayer(player.id, player.name)}
                >
                  <Text style={styles.kickText}>✕</Text>
                </TouchableOpacity>
              )}
              {currentVote?.status === 'open' && (
                <Text style={styles.voteStatus}>
                  {currentVote.votedPlayerIds.includes(player.id) ? '✅' : '⏳'}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Voting area */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Votación</Text>

          {!currentVote && (
            <>
              {isAdmin ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setVoteModalVisible(true)}
                >
                  <Text style={styles.primaryButtonText}>🗳️ Iniciar votación</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.waitingText}>Esperando a que el admin inicie la votación</Text>
              )}
            </>
          )}

          {currentVote?.status === 'open' && (
            <View>
              <Text style={styles.voteTitle}>{currentVote.title}</Text>

              {hasVoted ? (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingVoteText}>✅ Voto registrado</Text>
                  <Text style={styles.waitingSubText}>
                    Esperando a los demás jugadores... ({currentVote.votedPlayerIds.length}/
                    {connectedPlayers.length})
                  </Text>
                </View>
              ) : (
                <View style={styles.voteButtons}>
                  <TouchableOpacity
                    style={[styles.jaButton, submittingVote && styles.buttonDisabled]}
                    onPress={() => handleSubmitVote('JA')}
                    disabled={submittingVote}
                  >
                    <Text style={styles.voteButtonText}>JA ✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.neinButton, submittingVote && styles.buttonDisabled]}
                    onPress={() => handleSubmitVote('NEIN')}
                    disabled={submittingVote}
                  >
                    <Text style={styles.voteButtonText}>NEIN ✗</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isAdmin && (
                <TouchableOpacity style={styles.closeVoteButton} onPress={handleCloseVote}>
                  <Text style={styles.closeVoteText}>Cerrar votación manualmente</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Vote history */}
        {session.voteHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Historial de rondas</Text>
            {[...session.voteHistory].reverse().map((round) => (
              <View key={round.roundId} style={styles.historyRow}>
                <Text style={styles.historyTitle}>{round.title}</Text>
                <Text style={styles.historyResult}>
                  JA: {round.totalJa} | NEIN: {round.totalNein}
                  {'  '}
                  {round.totalJa > round.totalNein ? '✅' : '❌'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Admin close session */}
        {isAdmin && (
          <TouchableOpacity style={styles.dangerButton} onPress={handleCloseSession}>
            <Text style={styles.dangerButtonText}>🚫 Cerrar sala</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Open vote modal */}
      <Modal visible={voteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva votación</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Título de la votación (opcional)"
              placeholderTextColor="#a8a8b3"
              value={voteTitle}
              onChangeText={setVoteTitle}
              maxLength={50}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleOpenVote}>
              <Text style={styles.primaryButtonText}>Iniciar 🗳️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setVoteModalVisible(false);
                setVoteTitle('');
              }}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Result modal */}
      <Modal visible={resultVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🏛️ Resultado</Text>
            {shownResult && (
              <>
                <Text style={styles.resultRoundTitle}>{shownResult.title}</Text>
                <View style={styles.resultTotals}>
                  <View style={styles.resultJa}>
                    <Text style={styles.resultTotalNum}>{shownResult.totalJa}</Text>
                    <Text style={styles.resultTotalLabel}>JA</Text>
                  </View>
                  <View style={styles.resultNein}>
                    <Text style={styles.resultTotalNum}>{shownResult.totalNein}</Text>
                    <Text style={styles.resultTotalLabel}>NEIN</Text>
                  </View>
                </View>
                <Text style={styles.resultOutcome}>
                  {shownResult.totalJa > shownResult.totalNein
                    ? '✅ APROBADO (JA gana)'
                    : shownResult.totalJa === shownResult.totalNein
                    ? '🤝 EMPATE'
                    : '❌ RECHAZADO (NEIN gana)'}
                </Text>

                <Text style={styles.votesHeader}>Votos individuales:</Text>
                {shownResult.votes.map((v) => (
                  <View key={v.playerId} style={styles.voteRow}>
                    <Text style={styles.voterName}>{v.playerName}</Text>
                    <Text
                      style={[
                        styles.voteValue,
                        v.vote === 'JA' ? styles.jaText : styles.neinText,
                      ]}
                    >
                      {v.vote}
                    </Text>
                  </View>
                ))}
                {shownResult.nonVoters.length > 0 && (
                  <>
                    <Text style={styles.nonVotersHeader}>No votaron:</Text>
                    {shownResult.nonVoters.map((nv) => (
                      <Text key={nv.playerId} style={styles.nonVoter}>
                        {nv.playerName}
                      </Text>
                    ))}
                  </>
                )}
              </>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 16 }]}
              onPress={() => setResultVisible(false)}
            >
              <Text style={styles.primaryButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#a8a8b3', marginTop: 12, fontSize: 16 },

  header: { marginBottom: 16, alignItems: 'center' },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  codeLabel: { color: '#a8a8b3', fontSize: 12, marginBottom: 4 },
  code: { color: '#e94560', fontSize: 32, fontWeight: 'bold', letterSpacing: 6 },
  myName: { color: '#a8a8b3', fontSize: 14 },

  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, color: '#ffffff' },
  playerDisconnected: { color: '#555' },
  disconnectedTag: { fontSize: 12, color: '#777', marginTop: 2 },
  kickButton: {
    backgroundColor: '#e94560',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  kickText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  voteStatus: { marginLeft: 8, fontSize: 18 },

  primaryButton: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  waitingText: { color: '#a8a8b3', textAlign: 'center', fontSize: 14 },

  voteTitle: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  jaButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  neinButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  voteButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.5 },
  waitingBox: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  waitingVoteText: { color: '#2ecc71', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  waitingSubText: { color: '#a8a8b3', fontSize: 14, textAlign: 'center' },
  closeVoteButton: {
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeVoteText: { color: '#a8a8b3', fontSize: 14 },

  historyRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  historyTitle: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  historyResult: { color: '#a8a8b3', fontSize: 13, marginTop: 2 },

  dangerButton: {
    borderWidth: 2,
    borderColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: { color: '#e94560', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  cancelButton: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { color: '#a8a8b3', fontSize: 16 },

  // Result
  resultRoundTitle: {
    color: '#a8a8b3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultTotals: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 12,
  },
  resultJa: {
    alignItems: 'center',
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderRadius: 12,
    padding: 16,
    minWidth: 80,
  },
  resultNein: {
    alignItems: 'center',
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: 12,
    padding: 16,
    minWidth: 80,
  },
  resultTotalNum: { color: '#ffffff', fontSize: 36, fontWeight: 'bold' },
  resultTotalLabel: { color: '#a8a8b3', fontSize: 16 },
  resultOutcome: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  votesHeader: { color: '#a8a8b3', fontSize: 14, marginBottom: 8 },
  voteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  voterName: { color: '#ffffff', fontSize: 15 },
  voteValue: { fontSize: 15, fontWeight: '700' },
  jaText: { color: '#2ecc71' },
  neinText: { color: '#e74c3c' },
  nonVotersHeader: { color: '#a8a8b3', fontSize: 14, marginTop: 12, marginBottom: 4 },
  nonVoter: { color: '#777', fontSize: 14, paddingVertical: 2 },
});
