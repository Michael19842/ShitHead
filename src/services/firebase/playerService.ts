import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase';
import type { OnlinePlayer, PlayerBan } from '@/types';

// Check if a display name is already taken
export async function isNameTaken(displayName: string): Promise<boolean> {
  const db = getFirebaseDb();
  const playersRef = collection(db, 'players');

  // Case-insensitive check by using lowercase
  const normalizedName = displayName.toLowerCase().trim();

  const q = query(
    playersRef,
    where('displayNameLower', '==', normalizedName),
    limit(1)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Validate display name
export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Naam moet minimaal 2 karakters zijn' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Naam mag maximaal 20 karakters zijn' };
  }

  // Only allow letters, numbers, spaces, and some special chars
  const validPattern = /^[a-zA-Z0-9\s_\-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Naam mag alleen letters, cijfers, spaties, - en _ bevatten' };
  }

  // Check for inappropriate words (basic filter)
  const blockedWords = ['admin', 'moderator', 'system', 'shithead'];
  const lowerName = trimmed.toLowerCase();
  for (const word of blockedWords) {
    if (lowerName.includes(word)) {
      return { valid: false, error: 'Deze naam is niet toegestaan' };
    }
  }

  return { valid: true };
}

// Get player by ID
export async function getPlayer(playerId: string): Promise<OnlinePlayer | null> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);
  const playerDoc = await getDoc(playerRef);

  if (!playerDoc.exists()) {
    return null;
  }

  return docToPlayer(playerDoc);
}

// Update player's current game ID
export async function setPlayerCurrentGame(
  playerId: string,
  gameId: string | null
): Promise<void> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);

  await updateDoc(playerRef, {
    currentGameId: gameId,
    lastSeen: serverTimestamp()
  });
}

// Update player's current lobby ID
export async function setPlayerCurrentLobby(
  playerId: string,
  lobbyId: string | null
): Promise<void> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);

  await updateDoc(playerRef, {
    currentLobbyId: lobbyId,
    lastSeen: serverTimestamp()
  });
}

// Increment player stats
export async function incrementPlayerStats(
  playerId: string,
  stats: { gamesPlayed?: number; gamesLost?: number; totalTimeouts?: number }
): Promise<void> {
  const db = getFirebaseDb();
  const playerRef = doc(db, 'players', playerId);

  const playerDoc = await getDoc(playerRef);
  if (!playerDoc.exists()) return;

  const currentStats = playerDoc.data().stats || {
    gamesPlayed: 0,
    gamesLost: 0,
    totalTimeouts: 0
  };

  await updateDoc(playerRef, {
    stats: {
      gamesPlayed: currentStats.gamesPlayed + (stats.gamesPlayed || 0),
      gamesLost: currentStats.gamesLost + (stats.gamesLost || 0),
      totalTimeouts: currentStats.totalTimeouts + (stats.totalTimeouts || 0)
    },
    lastSeen: serverTimestamp()
  });
}

// Check if player is banned
export async function getPlayerBan(playerId: string): Promise<PlayerBan | null> {
  const db = getFirebaseDb();
  const banRef = doc(db, 'bans', playerId);
  const banDoc = await getDoc(banRef);

  if (!banDoc.exists()) {
    return null;
  }

  const data = banDoc.data();
  const expiresAt = (data.expiresAt as Timestamp).toDate();

  // Check if ban has expired
  if (expiresAt < new Date()) {
    return null;
  }

  return {
    playerId: banDoc.id,
    reason: data.reason,
    bannedAt: (data.bannedAt as Timestamp).toDate(),
    expiresAt,
    gameId: data.gameId
  };
}

// Get remaining ban time in seconds
export async function getBanRemainingSeconds(playerId: string): Promise<number> {
  const ban = await getPlayerBan(playerId);
  if (!ban) return 0;

  const remaining = ban.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

// Convert Firestore document to OnlinePlayer
function docToPlayer(doc: { id: string; data: () => Record<string, unknown> }): OnlinePlayer {
  const data = doc.data();

  return {
    id: doc.id,
    deviceId: data.deviceId as string,
    displayName: data.displayName as string,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    lastSeen: (data.lastSeen as Timestamp)?.toDate() || new Date(),
    currentGameId: (data.currentGameId as string) || null,
    currentLobbyId: (data.currentLobbyId as string) || null,
    stats: (data.stats as OnlinePlayer['stats']) || {
      gamesPlayed: 0,
      gamesLost: 0,
      totalTimeouts: 0
    }
  };
}
