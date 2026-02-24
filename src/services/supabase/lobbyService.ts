import { getSupabase } from '@/supabase';
import type { Lobby, LobbyPlayer, LobbyType, LobbyStatus } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const supabase = getSupabase();

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

  const players: Record<string, LobbyPlayer> = {
    [hostPlayerId]: hostPlayer
  };

  const { data, error } = await supabase
    .from('lobbies')
    .insert({
      host_player_id: hostPlayerId,
      type,
      code,
      target_player_count: targetPlayerCount,
      status: 'waiting' as LobbyStatus,
      game_id: null,
      players
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create lobby: ${error?.message}`);
  }

  return {
    id: data.id,
    hostPlayerId,
    type,
    code,
    targetPlayerCount,
    status: 'waiting',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    gameId: null,
    players
  };
}

// Generate a unique lobby code
async function generateUniqueLobbyCode(): Promise<string> {
  const supabase = getSupabase();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateLobbyCode();

    const { data } = await supabase
      .from('lobbies')
      .select('id')
      .eq('code', code)
      .eq('status', 'waiting')
      .limit(1);

    if (!data || data.length === 0) {
      return code;
    }

    attempts++;
  }

  throw new Error('Could not generate unique lobby code');
}

// Get lobby by ID
export async function getLobby(lobbyId: string): Promise<Lobby | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single();

  if (error || !data) {
    return null;
  }

  return docToLobby(data);
}

// Get lobby by code
export async function getLobbyByCode(code: string): Promise<Lobby | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return docToLobby(data);
}

// Join a lobby
export async function joinLobby(
  lobbyId: string,
  playerId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  try {
    // First get the lobby
    const { data: lobby, error: fetchError } = await supabase
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (fetchError || !lobby) {
      return { success: false, error: 'Lobby bestaat niet' };
    }

    if (lobby.status !== 'waiting') {
      return { success: false, error: 'Lobby is niet meer beschikbaar' };
    }

    const players = lobby.players || {};
    const playerCount = Object.keys(players).length;

    if (playerCount >= lobby.target_player_count) {
      return { success: false, error: 'Lobby is vol' };
    }

    if (players[playerId]) {
      return { success: false, error: 'Je zit al in deze lobby' };
    }

    // Add player to lobby
    players[playerId] = {
      playerId,
      displayName,
      joinedAt: new Date().toISOString(),
      ready: false,
      isHost: false
    };

    const { error: updateError } = await supabase
      .from('lobbies')
      .update({
        players,
        updated_at: new Date().toISOString()
      })
      .eq('id', lobbyId)
      .eq('status', 'waiting'); // Optimistic locking

    if (updateError) {
      return { success: false, error: 'Kon niet joinen' };
    }

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
  const supabase = getSupabase();

  // First get the lobby
  const { data: lobby } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single();

  if (!lobby) {
    return;
  }

  const players = { ...lobby.players };
  delete players[playerId];

  const remainingPlayerIds = Object.keys(players);

  // If no players left, delete the lobby
  if (remainingPlayerIds.length === 0) {
    await supabase.from('lobbies').delete().eq('id', lobbyId);
    return;
  }

  // If host left, assign new host
  let newHostId = lobby.host_player_id;
  if (playerId === lobby.host_player_id) {
    newHostId = remainingPlayerIds[0];
    players[newHostId] = {
      ...players[newHostId],
      isHost: true
    };
  }

  await supabase
    .from('lobbies')
    .update({
      players,
      host_player_id: newHostId,
      updated_at: new Date().toISOString()
    })
    .eq('id', lobbyId);
}

// Set player ready status
export async function setPlayerReady(
  lobbyId: string,
  playerId: string,
  ready: boolean
): Promise<void> {
  const supabase = getSupabase();

  // Get current players
  const { data: lobby } = await supabase
    .from('lobbies')
    .select('players')
    .eq('id', lobbyId)
    .single();

  if (!lobby || !lobby.players[playerId]) {
    return;
  }

  const players = { ...lobby.players };
  players[playerId] = {
    ...players[playerId],
    ready
  };

  await supabase
    .from('lobbies')
    .update({
      players,
      updated_at: new Date().toISOString()
    })
    .eq('id', lobbyId);
}

// Start the game (host only)
export async function startLobbyGame(
  lobbyId: string,
  gameId: string
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from('lobbies')
    .update({
      status: 'in_game',
      game_id: gameId,
      updated_at: new Date().toISOString()
    })
    .eq('id', lobbyId);
}

// Close a lobby
export async function closeLobby(lobbyId: string): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from('lobbies')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString()
    })
    .eq('id', lobbyId);
}

// Delete a lobby
export async function deleteLobby(lobbyId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('lobbies').delete().eq('id', lobbyId);
}

// Subscribe to lobby updates
export function subscribeLobby(
  lobbyId: string,
  callback: (lobby: Lobby | null) => void
): () => void {
  const supabase = getSupabase();

  // Track the most recent updatedAt we've delivered to prevent a stale initial
  // fetch from overwriting a realtime event that already arrived.
  let latestDeliveredAt: Date | null = null;

  const safeCallback = (lobby: Lobby | null) => {
    if (lobby && latestDeliveredAt && lobby.updatedAt < latestDeliveredAt) {
      return; // stale data – a newer realtime event already arrived
    }
    if (lobby) latestDeliveredAt = lobby.updatedAt;
    callback(lobby);
  };

  // Subscribe to changes first so no events are missed during the initial fetch.
  const channel: RealtimeChannel = supabase
    .channel(`lobby:${lobbyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lobbies',
        filter: `id=eq.${lobbyId}`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
        } else if (payload.new) {
          safeCallback(docToLobby(payload.new as Record<string, unknown>));
        }
      }
    )
    .subscribe();

  // Fetch the current state after subscribing so we don't miss events.
  getLobby(lobbyId).then(safeCallback);

  return () => {
    supabase.removeChannel(channel);
  };
}

// Find available random lobbies
export async function findAvailableLobbies(
  targetPlayerCount: number
): Promise<Lobby[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('type', 'random')
    .eq('status', 'waiting')
    .eq('target_player_count', targetPlayerCount);

  if (error || !data) {
    return [];
  }

  return data
    .map(docToLobby)
    .filter(lobby => {
      const playerCount = Object.keys(lobby.players).length;
      return playerCount < lobby.targetPlayerCount;
    });
}

// Helper: Convert database row to Lobby
function docToLobby(data: Record<string, unknown>): Lobby {
  const playersData = (data.players as Record<string, Record<string, unknown>>) || {};
  const players: Record<string, LobbyPlayer> = {};

  for (const [playerId, playerData] of Object.entries(playersData)) {
    players[playerId] = {
      playerId: playerData.playerId as string,
      displayName: playerData.displayName as string,
      joinedAt: new Date(playerData.joinedAt as string),
      ready: playerData.ready as boolean,
      isHost: playerData.isHost as boolean
    };
  }

  return {
    id: data.id as string,
    hostPlayerId: data.host_player_id as string,
    type: data.type as LobbyType,
    code: data.code as string | null,
    targetPlayerCount: data.target_player_count as number,
    status: data.status as LobbyStatus,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
    gameId: data.game_id as string | null,
    players
  };
}
