import { Device } from '@capacitor/device';
import { getSupabase } from '@/supabase';
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

// Sign in anonymously using Supabase
export async function signInAnonymouslyWithDevice(): Promise<{ id: string }> {
  const supabase = getSupabase();

  // Try to get existing session first
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.user) {
    return { id: sessionData.session.user.id };
  }

  // Sign in anonymously
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(`Auth error: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned from anonymous sign in');
  }

  return { id: data.user.id };
}

// Check if user is already authenticated
export async function getCurrentUser(): Promise<{ id: string } | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { id: user.id };
}

// Subscribe to auth state changes
export function onAuthStateChange(callback: (user: { id: string } | null) => void): () => void {
  const supabase = getSupabase();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({ id: session.user.id });
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}

// Get player profile from Supabase
export async function getPlayerProfile(playerId: string): Promise<OnlinePlayer | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    deviceId: data.device_id,
    displayName: data.display_name,
    createdAt: new Date(data.created_at),
    lastSeen: new Date(data.last_seen),
    currentGameId: data.current_game_id || null,
    currentLobbyId: data.current_lobby_id || null,
    stats: data.stats || { gamesPlayed: 0, gamesLost: 0, totalTimeouts: 0 }
  };
}

// Create new player profile
export async function createPlayerProfile(
  playerId: string,
  deviceId: string,
  displayName: string
): Promise<OnlinePlayer> {
  const supabase = getSupabase();

  const stats: PlayerStats = {
    gamesPlayed: 0,
    gamesLost: 0,
    totalTimeouts: 0
  };

  const { error } = await supabase
    .from('players')
    .insert({
      id: playerId,
      device_id: deviceId,
      display_name: displayName,
      display_name_lower: displayName.toLowerCase().trim(),
      stats,
      current_game_id: null,
      current_lobby_id: null
    });

  if (error) {
    throw new Error(`Failed to create player: ${error.message}`);
  }

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
  const supabase = getSupabase();

  await supabase
    .from('players')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', playerId);
}

// Check if a player exists with the given device ID
export async function findPlayerByDeviceId(deviceId: string): Promise<OnlinePlayer | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('device_id', deviceId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    deviceId: data.device_id,
    displayName: data.display_name,
    createdAt: new Date(data.created_at),
    lastSeen: new Date(data.last_seen),
    currentGameId: data.current_game_id || null,
    currentLobbyId: data.current_lobby_id || null,
    stats: data.stats || { gamesPlayed: 0, gamesLost: 0, totalTimeouts: 0 }
  };
}

// Sign out
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}
