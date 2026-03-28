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
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSocket } from '../context/SocketContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DEFAULT_IP = '192.168.1.100';
const DEFAULT_PORT = '3001';

export default function HomeScreen({ navigation }: Props) {
  const [serverIp, setServerIp] = useState(DEFAULT_IP);
  const [serverPort, setServerPort] = useState(DEFAULT_PORT);
  const { connect, connected } = useSocket();

  const serverUrl = `http://${serverIp}:${serverPort}`;

  function handleConnect() {
    if (!serverIp.trim()) {
      Alert.alert('Error', 'Introduce la IP del servidor');
      return;
    }
    connect(serverUrl);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>🎭 Secret Hitler</Text>
          <Text style={styles.subtitle}>Gestor de Votaciones</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Servidor</Text>
            <TextInput
              style={styles.input}
              placeholder="IP del servidor (ej: 192.168.1.100)"
              value={serverIp}
              onChangeText={setServerIp}
              keyboardType="numeric"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Puerto (ej: 3001)"
              value={serverPort}
              onChangeText={setServerPort}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.button, connected ? styles.buttonConnected : styles.buttonSecondary]}
              onPress={handleConnect}
            >
              <Text style={styles.buttonText}>
                {connected ? '✅ Conectado' : '🔌 Conectar al servidor'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, !connected && styles.buttonDisabled]}
              onPress={() => {
                if (!connected) {
                  Alert.alert('Sin conexión', 'Primero conéctate al servidor');
                  return;
                }
                navigation.navigate('CreateSession', { serverUrl } as any);
              }}
            >
              <Text style={styles.buttonText}>➕ Crear sala</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonOutline, !connected && styles.buttonDisabled]}
              onPress={() => {
                if (!connected) {
                  Alert.alert('Sin conexión', 'Primero conéctate al servidor');
                  return;
                }
                navigation.navigate('JoinSession', { serverUrl } as any);
              }}
            >
              <Text style={[styles.buttonText, styles.buttonTextOutline]}>🚪 Unirse a sala</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#a8a8b3',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: { backgroundColor: '#e94560' },
  buttonSecondary: { backgroundColor: '#0f3460' },
  buttonConnected: { backgroundColor: '#2ecc71' },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e94560',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonTextOutline: { color: '#e94560' },
});
