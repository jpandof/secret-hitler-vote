# Secret Hitler Vote 🎭

App móvil para gestionar votaciones en partidas presenciales de **Secret Hitler**.

No implementa el juego completo: solo crea sesiones, une jugadores y gestiona votaciones en tiempo real con revelado simultáneo.

---

## Estructura del proyecto

```
secret-hitler-vote/
├── server/          # Backend Node.js + Express + Socket.IO
│   └── src/
│       ├── index.ts          # Servidor principal + eventos Socket.IO
│       ├── sessionManager.ts # Lógica de sesiones y votaciones
│       └── types.ts          # Tipos TypeScript compartidos
└── mobile/          # App React Native + Expo
    └── src/
        ├── types/            # Tipos TypeScript
        ├── context/
        │   └── SocketContext.tsx  # Gestión de conexión Socket.IO
        ├── navigation/
        │   └── AppNavigator.tsx
        └── screens/
            ├── HomeScreen.tsx         # Pantalla inicial + configurar IP
            ├── CreateSessionScreen.tsx
            ├── JoinSessionScreen.tsx
            └── RoomScreen.tsx         # Sala + votación + resultados
```

---

## Instalación y ejecución

### Requisitos

- Node.js 18+
- npm o yarn
- Expo CLI (`npm install -g expo-cli` o usar `npx expo`)
- Móvil con la app **Expo Go** instalada (iOS / Android)

### 1. Iniciar el servidor backend

```bash
cd server
npm install
npm run dev
```

El servidor arrancará en `http://0.0.0.0:3001`.  
Busca tu IP local (ej: `192.168.1.100`) con `ipconfig` (Windows) o `ifconfig` / `ip addr` (Mac/Linux).

### 2. Iniciar la app móvil

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go desde tu móvil.

### 3. Conectar la app al servidor

En la pantalla de inicio de la app:
1. Introduce la IP local de tu PC (ej: `192.168.1.100`)
2. Puerto: `3001` (por defecto)
3. Pulsa **Conectar al servidor**

---

## Flujo de uso

1. **El host** pulsa "Crear sala", introduce su nombre → recibe un **código de 5 letras**
2. **Los jugadores** pulsan "Unirse", introducen su nombre + el código
3. Cuando todos estén listos, el admin pulsa **🗳️ Iniciar votación**
4. Cada jugador pulsa **JA** o **NEIN** en su móvil
5. Cuando todos hayan votado, los resultados aparecen **simultáneamente** en todos los móviles
6. El admin puede iniciar una nueva ronda o cerrar la sala

---

## Eventos Socket.IO

| Evento (cliente→servidor) | Descripción |
|---|---|
| `session:create` | Crear nueva sesión |
| `session:join` | Unirse a sesión existente |
| `player:kick` | Admin expulsa a un jugador |
| `vote:open` | Admin inicia ronda de votación |
| `vote:submit` | Jugador envía su voto (JA/NEIN) |
| `vote:close` | Admin cierra manualmente la votación |
| `session:close` | Admin cierra la sala |

| Evento (servidor→cliente) | Descripción |
|---|---|
| `session:update` | Estado actualizado de la sesión |
| `vote:result` | Resultado simultáneo a todos los jugadores |
| `player:kicked` | Notificación al jugador expulsado |
| `session:closed` | Notificación de cierre de sala |

---

## Decisiones técnicas

- **In-memory**: todo el estado se guarda en RAM del servidor. Si reinicias el servidor, las sesiones se pierden (comportamiento esperado para uso local).
- **Revelado simultáneo**: el servidor detecta cuándo todos los jugadores conectados han votado y emite `vote:result` a todos a la vez usando `io.to(sessionId).emit(...)`. Nadie ve resultados antes de tiempo.
- **Sin autenticación**: cada jugador usa solo su nombre. El admin es el creador de la sesión.
- **Códigos de sala**: se generan aleatoriamente con 5 caracteres alfanuméricos (sin letras confusas como O/0/I/1).
- **Desconexiones**: los jugadores desconectados se marcan como inactivos pero no se eliminan de la sala. No cuentan para el quórum de votación.

---

## Variables de entorno (servidor)

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor |

