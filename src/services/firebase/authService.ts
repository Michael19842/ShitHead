import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Device } from '@capacitor/device';
import { getFirebaseAuth, getFirebaseDb } from '@/firebase';
import type { OnlinePlayer, PlayerStats } from '@/types';

// Get or generate a unique device ID
export async function getDeviceId(): Promise<string> {
  try {
    const info = await Device.getId();
    return info.identifier;
  } catch {
    // Fallback for web: use localStorage
    let deviceId = localStorage.getItem('shithead_device_id');
    if (!deviceId) {
      deviceId = 'web_' + crypto.randomUUID();
      localStorage.setItem('shithead_device_id', deviceId);
    }
    return deviceId;
  }
}

// Sign in anonymously
export async function signInAnonymouslyWithDevice(): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInAnonymously(auth);
  return result.user;
}

// Check if user is already authenticated
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

// Subscribe to auth state changes
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

// Get player profile from Firestore
export async function getPlayerProfile(playerId: string): Promise<OnlinePlayer | null> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);
  const playerDoc = await getDoc(playerRef);

  if (!playerDoc.exists()) {
    return null;
  }

  const data = playerDoc.data();
  return {
    id: playerDoc.id,
    deviceId: data.deviceId,
    displayName: data.displayName,
    createdAt: data.createdAt?.toDate() || new Date(),
    lastSeen: data.lastSeen?.toDate() || new Date(),
    currentGameId: data.currentGameId || null,
    currentLobbyId: data.currentLobbyId || null,
    stats: data.stats || { gamesPlayed: 0, gamesLost: 0, totalTimeouts: 0 }
  };
}

// Create new player profile
export async function createPlayerProfile(
  playerId: string,
  deviceId: string,
  displayName: string
): Promise<OnlinePlayer> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);

  const stats: PlayerStats = {
    gamesPlayed: 0,
    gamesLost: 0,
    totalTimeouts: 0
  };

  const playerData = {
    deviceId,
    displayName,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    currentGameId: null,
    currentLobbyId: null,
    stats
  };

  await setDoc(playerRef, playerData);

  return {
    id: playerId,
    deviceId,
    displayName,
    createdAt: new Date(),
    lastSeen: new Date(),
    currentGameId: null,
    currentLobbyId: null,
    stats
  };
}

// Update last seen timestamp
export async function updateLastSeen(playerId: string): Promise<void> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);

  await updateDoc(playerRef, {
    lastSeen: serverTimestamp()
  });
}

// Check if a player exists with the given device ID
export async function findPlayerByDeviceId(deviceId: string): Promise<OnlinePlayer | null> {
  // Note: This requires a query which we'll handle via the playerService
  // For now, we'll store deviceId locally and match it
  const db = getFirebaseDb();
  const { query, collection, where, getDocs, limit } = await import('firebase/firestore');

  const playersRef = collection(db, 'players');
  const q = query(playersRef, where('deviceId', '==', deviceId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    deviceId: data.deviceId,
    displayName: data.displayName,
    createdAt: data.createdAt?.toDate() || new Date(),
    lastSeen: data.lastSeen?.toDate() || new Date(),
    currentGameId: data.currentGameId || null,
    currentLobbyId: data.currentLobbyId || null,
    stats: data.stats || { gamesPlayed: 0, gamesLost: 0, totalTimeouts: 0 }
  };
}

// Sign out (clear local state, not Firebase auth)
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await auth.signOut();
}
