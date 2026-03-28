import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, SessionPublic } from '../types';
import { useSocket } from '../context/SocketContext';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinSession'>;

export default function JoinSessionScreen({ navigation, route }: Props) {
  const serverUrl = (route.params as any)?.serverUrl ?? '';
  const [playerName, setPlayerName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { socket, setSession } = useSocket();

  function handleJoin() {
    if (!playerName.trim() || !code.trim()) {
      Alert.alert('Error', 'Introduce tu nombre y el código de sala');
      return;
    }
    if (!socket) {
      Alert.alert('Error', 'No hay conexión con el servidor');
      return;
    }

    setLoading(true);
    socket.emit(
      'session:join',
      { playerName: playerName.trim(), code: code.trim().toUpperCase() },
      (response: { ok?: boolean; error?: string; playerId?: string; session?: SessionPublic }) => {
        setLoading(false);
        if (response.error) {
          Alert.alert('Error', response.error);
          return;
        }
        if (response.ok && response.session && response.playerId) {
          setSession(response.session);
          navigation.replace('Room', {
            session: response.session,
            playerId: response.playerId,
            serverUrl,
          });
        }
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Unirse a sala</Text>

          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor="#a8a8b3"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="Código de sala (ej: ABCDE)"
            placeholderTextColor="#a8a8b3"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            maxLength={5}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar a la sala 🚪</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  backButton: { marginTop: 20, alignItems: 'center' },
  backText: { color: '#a8a8b3', fontSize: 16 },
});
