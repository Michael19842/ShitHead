import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase';
import type { Lobby, LobbyPlayer, LobbyType, LobbyStatus } from '@/types';

// Generate a random 6-character lobby code
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new lobby
export async function createLobby(
  hostPlayerId: string,
  hostDisplayName: string,
  type: LobbyType,
  targetPlayerCount: number
): Promise<Lobby> {
  const db = getFirebaseDb();
  const lobbyRef = doc(collection(db, 'lobbies'));

  // Generate unique code for private lobbies
  let code: string | null = null;
  if (type === 'private') {
    code = await generateUniqueLobbyCode();
  }

  const hostPlayer: LobbyPlayer = {
    playerId: hostPlayerId,
    displayName: hostDisplayName,
    joinedAt: new Date(),
    ready: false,
    isHost: true
  };

  const lobbyData = {
    hostPlayerId,
    type,
    code,
    targetPlayerCount,
    status: 'waiting' as LobbyStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gameId: null,
    players: {
      [hostPlayerId]: {
        playerId: hostPlayerId,
        displayName: hostDisplayName,
        joinedAt: serverTimestamp(),
        ready: false,
        isHost: true
      }
    }
  };

  await setDoc(lobbyRef, lobbyData);

  return {
    id: lobbyRef.id,
    hostPlayerId,
    type,
    code,
    targetPlayerCount,
    status: 'waiting',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameId: null,
    players: { [hostPlayerId]: hostPlayer }
  };
}

// Generate a unique lobby code
async function generateUniqueLobbyCode(): Promise<string> {
  const db = getFirebaseDb();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateLobbyCode();

    // Check if code already exists
    const lobbiesRef = collection(db, 'lobbies');
    const q = query(
      lobbiesRef,
      where('code', '==', code),
      where('status', '==', 'waiting')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return code;
    }

    attempts++;
  }

  throw new Error('Could not generate unique lobby code');
}

// Get lobby by ID
export async function getLobby(lobbyId: string): Promise<Lobby | null> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbyDoc = await getDoc(lobbyRef);

  if (!lobbyDoc.exists()) {
    return null;
  }

  return docToLobby(lobbyDoc.id, lobbyDoc.data());
}

// Get lobby by code
export async function getLobbyByCode(code: string): Promise<Lobby | null> {
  const db = getFirebaseDb();
  const lobbiesRef = collection(db, 'lobbies');
  const q = query(
    lobbiesRef,
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'waiting')
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return docToLobby(doc.id, doc.data());
}

// Join a lobby
export async function joinLobby(
  lobbyId: string,
  playerId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);

  try {
    await runTransaction(db, async (transaction) => {
      const lobbyDoc = await transaction.get(lobbyRef);

      if (!lobbyDoc.exists()) {
        throw new Error('Lobby bestaat niet');
      }

      const data = lobbyDoc.data();

      if (data.status !== 'waiting') {
        throw new Error('Lobby is niet meer beschikbaar');
      }

      const playerCount = Object.keys(data.players || {}).length;
      if (playerCount >= data.targetPlayerCount) {
        throw new Error('Lobby is vol');
      }

      if (data.players && data.players[playerId]) {
        throw new Error('Je zit al in deze lobby');
      }

      // Add player to lobby
      transaction.update(lobbyRef, {
        [`players.${playerId}`]: {
          playerId,
          displayName,
          joinedAt: serverTimestamp(),
          ready: false,
          isHost: false
        },
        updatedAt: serverTimestamp()
      });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Kon niet joinen'
    };
  }
}

// Leave a lobby
export async function leaveLobby(
  lobbyId: string,
  playerId: string
): Promise<void> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);

  await runTransaction(db, async (transaction) => {
    const lobbyDoc = await transaction.get(lobbyRef);

    if (!lobbyDoc.exists()) {
      return;
    }

    const data = lobbyDoc.data();
    const players = { ...data.players };
    delete players[playerId];

    const remainingPlayerIds = Object.keys(players);

    // If no players left, delete the lobby
    if (remainingPlayerIds.length === 0) {
      transaction.delete(lobbyRef);
      return;
    }

    // If host left, assign new host
    let newHostId = data.hostPlayerId;
    if (playerId === data.hostPlayerId) {
      newHostId = remainingPlayerIds[0];
      players[newHostId] = {
        ...players[newHostId],
        isHost: true
      };
    }

    transaction.update(lobbyRef, {
      players,
      hostPlayerId: newHostId,
      updatedAt: serverTimestamp()
    });
  });
}

// Set player ready status
export async function setPlayerReady(
  lobbyId: string,
  playerId: string,
  ready: boolean
): Promise<void> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);

  await updateDoc(lobbyRef, {
    [`players.${playerId}.ready`]: ready,
    updatedAt: serverTimestamp()
  });
}

// Start the game (host only)
export async function startLobbyGame(
  lobbyId: string,
  gameId: string
): Promise<void> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);

  await updateDoc(lobbyRef, {
    status: 'in_game',
    gameId,
    updatedAt: serverTimestamp()
  });
}

// Close a lobby
export async function closeLobby(lobbyId: string): Promise<void> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);

  await updateDoc(lobbyRef, {
    status: 'closed',
    updatedAt: serverTimestamp()
  });
}

// Delete a lobby
export async function deleteLobby(lobbyId: string): Promise<void> {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  await deleteDoc(lobbyRef);
}

// Subscribe to lobby updates
export function subscribeLobby(
  lobbyId: string,
  callback: (lobby: Lobby | null) => void
): () => void {
  const db = getFirebaseDb();
  const lobbyRef = doc(db, 'lobbies', lobbyId);

  return onSnapshot(lobbyRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(docToLobby(snapshot.id, snapshot.data()));
  }, (error) => {
    console.error('Lobby subscription error:', error);
    callback(null);
  });
}

// Find available random lobbies
export async function findAvailableLobbies(
  targetPlayerCount: number
): Promise<Lobby[]> {
  const db = getFirebaseDb();
  const lobbiesRef = collection(db, 'lobbies');

  const q = query(
    lobbiesRef,
    where('type', '==', 'random'),
    where('status', '==', 'waiting'),
    where('targetPlayerCount', '==', targetPlayerCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(doc => docToLobby(doc.id, doc.data()))
    .filter(lobby => {
      // Filter lobbies that aren't full
      const playerCount = Object.keys(lobby.players).length;
      return playerCount < lobby.targetPlayerCount;
    });
}

// Helper: Convert Firestore document to Lobby
function docToLobby(id: string, data: Record<string, unknown>): Lobby {
  const players: Record<string, LobbyPlayer> = {};

  const playersData = data.players as Record<string, Record<string, unknown>> || {};
  for (const [playerId, playerData] of Object.entries(playersData)) {
    players[playerId] = {
      playerId: playerData.playerId as string,
      displayName: playerData.displayName as string,
      joinedAt: (playerData.joinedAt as Timestamp)?.toDate() || new Date(),
      ready: playerData.ready as boolean,
      isHost: playerData.isHost as boolean
    };
  }

  return {
    id,
    hostPlayerId: data.hostPlayerId as string,
    type: data.type as LobbyType,
    code: data.code as string | null,
    targetPlayerCount: data.targetPlayerCount as number,
    status: data.status as LobbyStatus,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    gameId: data.gameId as string | null,
    players
  };
}
