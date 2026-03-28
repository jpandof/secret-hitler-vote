import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import CreateSessionScreen from '../screens/CreateSessionScreen';
import JoinSessionScreen from '../screens/JoinSessionScreen';
import RoomScreen from '../screens/RoomScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#1a1a2e' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Secret Hitler Vote', headerShown: false }}
        />
        <Stack.Screen
          name="CreateSession"
          component={CreateSessionScreen}
          options={{ title: 'Crear sala' }}
        />
        <Stack.Screen
          name="JoinSession"
          component={JoinSessionScreen}
          options={{ title: 'Unirse a sala' }}
        />
        <Stack.Screen
          name="Room"
          component={RoomScreen}
          options={({ route }) => ({
            title: (route.params as any)?.session?.name ?? 'Sala',
            headerBackVisible: false,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
