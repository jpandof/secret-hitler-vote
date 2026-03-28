import React from 'react';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SocketProvider>
      <AppNavigator />
    </SocketProvider>
  );
}
