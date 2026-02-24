import { getSupabase } from '@/supabase';
import type { OnlinePlayer, PlayerBan } from '@/types';

// Check if a display name is already taken
export async function isNameTaken(displayName: string): Promise<boolean> {
  const supabase = getSupabase();
  const normalizedName = displayName.toLowerCase().trim();

  const { data, error } = await supabase
    .from('players')
    .select('id')
    .eq('display_name_lower', normalizedName)
    .limit(1);

  if (error) {
    console.error('Error checking name:', error);
    return false;
  }

  return data && data.length > 0;
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

// Update player's current game ID
export async function setPlayerCurrentGame(
  playerId: string,
  gameId: string | null
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from('players')
    .update({
      current_game_id: gameId,
      last_seen: new Date().toISOString()
    })
    .eq('id', playerId);
}

// Update player's current lobby ID
export async function setPlayerCurrentLobby(
  playerId: string,
  lobbyId: string | null
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from('players')
    .update({
      current_lobby_id: lobbyId,
      last_seen: new Date().toISOString()
    })
    .eq('id', playerId);
}

// Increment player stats
export async function incrementPlayerStats(
  playerId: string,
  stats: { gamesPlayed?: number; gamesLost?: number; totalTimeouts?: number }
): Promise<void> {
  const supabase = getSupabase();

  // First get current stats
  const { data } = await supabase
    .from('players')
    .select('stats')
    .eq('id', playerId)
    .single();

  if (!data) return;

  const currentStats = data.stats || {
    gamesPlayed: 0,
    gamesLost: 0,
    totalTimeouts: 0
  };

  await supabase
    .from('players')
    .update({
      stats: {
        gamesPlayed: currentStats.gamesPlayed + (stats.gamesPlayed || 0),
        gamesLost: currentStats.gamesLost + (stats.gamesLost || 0),
        totalTimeouts: currentStats.totalTimeouts + (stats.totalTimeouts || 0)
      },
      last_seen: new Date().toISOString()
    })
    .eq('id', playerId);
}

// Check if player is banned
export async function getPlayerBan(playerId: string): Promise<PlayerBan | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('bans')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (error || !data) {
    return null;
  }

  const expiresAt = new Date(data.expires_at);

  // Check if ban has expired
  if (expiresAt < new Date()) {
    return null;
  }

  return {
    playerId: data.player_id,
    reason: data.reason,
    bannedAt: new Date(data.created_at),
    expiresAt,
    gameId: data.game_id
  };
}

// Get remaining ban time in seconds
export async function getBanRemainingSeconds(playerId: string): Promise<number> {
  const ban = await getPlayerBan(playerId);
  if (!ban) return 0;

  const remaining = ban.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}
