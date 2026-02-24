/**
 * Integration test voor de volledige online multiplayer flow.
 *
 * Simuleert twee onafhankelijke spelers met aparte Supabase clients.
 * Test stap voor stap:
 *   1. Authenticatie (anoniem inloggen)
 *   2. Spelersprofiel aanmaken
 *   3. Lobby aanmaken (speler 1)
 *   4. Realtime abonnement activeren (speler 1)
 *   5. Lobby joinen (speler 2)
 *   6. ✅ Realtime update ontvangen bij speler 1 (spelerslijst bijwerken)
 *   7. Klaar melden (speler 2)
 *   8. Spel starten (speler 1 / host)
 *   9. Spelstatus controleren bij beide spelers
 *  10. Opruimen
 *
 * Gebruik: npm run test:integration
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xcjayoccyssxrnllnhnb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjamF5b2NjeXNzeHJubGxuaG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjMwMzAsImV4cCI6MjA4NzQ5OTAzMH0.uXtB7uYIF7dSU9WBOYcugggB-uHVyV9OeEFyxmLfv5g';

// ─── Terminal kleuren ──────────────────────────────────────────────────────────
const C = {
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  reset:  '\x1b[0m',
};

const pass  = (msg: string) => console.log(`${C.green}  ✓${C.reset} ${msg}`);
const fail  = (msg: string) => console.log(`${C.red}  ✗${C.reset} ${msg}`);
const info  = (msg: string) => console.log(`${C.cyan}  →${C.reset} ${msg}`);
const header = (msg: string) => console.log(`\n${C.bold}${C.yellow}▶ ${msg}${C.reset}`);
const wait  = (ms: number)   => new Promise<void>(r => setTimeout(r, ms));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function signIn(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`Auth mislukt: ${error?.message}`);
  return data.user.id;
}

async function createProfile(
  client: SupabaseClient,
  playerId: string,
  displayName: string,
): Promise<void> {
  const { error } = await client.from('players').insert({
    id: playerId,
    device_id: `test_device_${playerId.slice(0, 8)}_${Date.now()}`,
    display_name: displayName,
    display_name_lower: displayName.toLowerCase(),
    stats: { gamesPlayed: 0, gamesLost: 0, totalTimeouts: 0 },
    current_game_id: null,
    current_lobby_id: null,
  });
  if (error) throw new Error(`Profiel aanmaken mislukt: ${error.message}`);
}

async function createLobby(
  client: SupabaseClient,
  hostId: string,
  hostName: string,
): Promise<string> {
  const { data, error } = await client
    .from('lobbies')
    .insert({
      host_player_id: hostId,
      type: 'private',
      code: `T${Date.now().toString().slice(-5)}`,
      target_player_count: 2,
      status: 'waiting',
      players: {
        [hostId]: {
          playerId: hostId,
          displayName: hostName,
          joinedAt: new Date().toISOString(),
          ready: false,
          isHost: true,
        },
      },
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Lobby aanmaken mislukt: ${error?.message}`);
  return data.id;
}

async function joinLobby(
  client: SupabaseClient,
  lobbyId: string,
  playerId: string,
  displayName: string,
): Promise<void> {
  const { data: current, error: fetchErr } = await client
    .from('lobbies')
    .select('players')
    .eq('id', lobbyId)
    .single();
  if (fetchErr || !current) throw new Error(`Lobby ophalen mislukt: ${fetchErr?.message}`);

  const players = { ...(current.players as Record<string, unknown>) };
  players[playerId] = {
    playerId,
    displayName,
    joinedAt: new Date().toISOString(),
    ready: false,
    isHost: false,
  };

  const { error } = await client
    .from('lobbies')
    .update({ players, updated_at: new Date().toISOString() })
    .eq('id', lobbyId)
    .eq('status', 'waiting');
  if (error) throw new Error(`Join mislukt: ${error.message}`);
}

async function setReady(
  client: SupabaseClient,
  lobbyId: string,
  playerId: string,
): Promise<void> {
  const { data: current, error: fetchErr } = await client
    .from('lobbies')
    .select('players')
    .eq('id', lobbyId)
    .single();
  if (fetchErr || !current) throw new Error(`Lobby ophalen mislukt: ${fetchErr?.message}`);

  const players = { ...(current.players as Record<string, Record<string, unknown>>) };
  players[playerId] = { ...players[playerId], ready: true };

  const { error } = await client
    .from('lobbies')
    .update({ players, updated_at: new Date().toISOString() })
    .eq('id', lobbyId);
  if (error) throw new Error(`Klaar melden mislukt: ${error.message}`);
}

async function startGame(
  client: SupabaseClient,
  lobbyId: string,
  playerOrder: string[],
  playerNames: Record<string, string>,
): Promise<string> {
  const { data, error } = await client
    .from('games')
    .insert({
      lobby_id: lobbyId,
      status: 'swapping',
      player_order: playerOrder,
      players: Object.fromEntries(
        playerOrder.map(pid => [
          pid,
          {
            displayName: playerNames[pid],
            hand: [],
            faceUp: [],
            faceDown: [],
            isOut: false,
            connectionStatus: 'connected',
            lastPingAt: new Date().toISOString(),
            timeoutsThisGame: 0,
            swapConfirmed: false,
          },
        ]),
      ),
      deck: [],
      deck_count: 1,
      deck_empty: false,
      discard_pile: [],
      burn_pile: [],
      current_player_index: 0,
      turn_state: {
        playerId: playerOrder[0],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        phase: 'swap',
      },
      swap_phase: {
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        confirmedPlayers: [],
      },
      reactions: [],
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Spel aanmaken mislukt: ${error?.message}`);

  await client
    .from('lobbies')
    .update({ status: 'in_game', game_id: data.id, updated_at: new Date().toISOString() })
    .eq('id', lobbyId);

  return data.id;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(opts: {
  client1: SupabaseClient;
  client2: SupabaseClient;
  gameId: string | null;
  lobbyId: string | null;
  player1Id: string | null;
  player2Id: string | null;
}) {
  header('Opruimen');
  const { client1, client2, gameId, lobbyId, player1Id, player2Id } = opts;

  if (gameId) {
    const { error } = await client1.from('games').delete().eq('id', gameId);
    error ? fail(`Spel verwijderen mislukt: ${error.message}`) : info(`Spel verwijderd`);
  }
  if (lobbyId) {
    const { error } = await client1.from('lobbies').delete().eq('id', lobbyId);
    error ? fail(`Lobby verwijderen mislukt: ${error.message}`) : info(`Lobby verwijderd`);
  }
  if (player1Id) {
    await client1.from('players').delete().eq('id', player1Id);
    await client1.auth.signOut();
    info('Speler 1 verwijderd');
  }
  if (player2Id) {
    await client2.from('players').delete().eq('id', player2Id);
    await client2.auth.signOut();
    info('Speler 2 verwijderd');
  }
}

// ─── Hoofdscript ──────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${C.bold}╔═══════════════════════════════════════╗`);
  console.log(`║   Online Multiplayer Flow — Test      ║`);
  console.log(`╚═══════════════════════════════════════╝${C.reset}`);

  const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const client2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let player1Id:  string | null = null;
  let player2Id:  string | null = null;
  let lobbyId:    string | null = null;
  let gameId:     string | null = null;
  let errors = 0;

  // Realtime staat
  let realtimeReceived = false;
  let realtimePlayersAfterJoin: Record<string, unknown> | null = null;
  let lobbyStatusUpdate: string | null = null;

  try {
    // ── Stap 1: Authenticatie ─────────────────────────────────────────────────
    header('Stap 1: Authenticatie');
    player1Id = await signIn(client1);
    pass(`Speler 1 ingelogd (${player1Id.slice(0, 8)}…)`);
    player2Id = await signIn(client2);
    pass(`Speler 2 ingelogd (${player2Id.slice(0, 8)}…)`);

    // ── Stap 2: Profielen ─────────────────────────────────────────────────────
    header('Stap 2: Spelersprofielen aanmaken');
    const name1 = `TestSpeler1_${Date.now()}`;
    const name2 = `TestSpeler2_${Date.now()}`;
    await createProfile(client1, player1Id, name1);
    pass(`Speler 1 profiel: "${name1}"`);
    await createProfile(client2, player2Id, name2);
    pass(`Speler 2 profiel: "${name2}"`);

    // ── Stap 3: Lobby aanmaken ────────────────────────────────────────────────
    header('Stap 3: Lobby aanmaken (speler 1 is host)');
    lobbyId = await createLobby(client1, player1Id, name1);
    pass(`Lobby aangemaakt (${lobbyId.slice(0, 8)}…)`);

    // ── Stap 4: Realtime abonnement speler 1 ──────────────────────────────────
    header('Stap 4: Realtime abonnement activeren (speler 1)');

    const channel = client1
      .channel(`lobby:${lobbyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          if (!newRow) return;

          const players = newRow.players as Record<string, unknown>;
          if (players && player2Id && players[player2Id]) {
            realtimeReceived = true;
            realtimePlayersAfterJoin = players;
            info(`[Realtime] Speler 1 ontving update met ${Object.keys(players).length} spelers`);
          }

          if (newRow.status === 'in_game') {
            lobbyStatusUpdate = newRow.game_id as string;
            info(`[Realtime] Speler 1 ontving lobby status: in_game, game_id=${String(newRow.game_id).slice(0, 8)}…`);
          }
        },
      )
      .subscribe((status) => {
        info(`[Realtime] Subscriptie: ${status}`);
      });

    // Wacht tot de subscriptie echt actief is
    await wait(2000);
    pass('Realtime abonnement actief');

    // ── Stap 5: Speler 2 joint ────────────────────────────────────────────────
    header('Stap 5: Speler 2 joint de lobby');
    await joinLobby(client2, lobbyId, player2Id, name2);
    pass('Speler 2 heeft gejoind');

    // ── Stap 6: Realtime update controleren ───────────────────────────────────
    header('Stap 6: Realtime update spelerslijst controleren bij speler 1');
    info('Wachten op realtime update (max 10 sec)…');

    const deadline = Date.now() + 10_000;
    while (!realtimeReceived && Date.now() < deadline) {
      await wait(200);
    }

    if (!realtimeReceived) {
      fail('Speler 1 ontving GEEN realtime update toen speler 2 joinde! (spelerslijst bug)');
      errors++;

      // Extra diagnose: controleer of de DB wel bijgewerkt is
      const { data: dbCheck } = await client1
        .from('lobbies')
        .select('players')
        .eq('id', lobbyId)
        .single();
      const dbPlayers = Object.keys((dbCheck?.players as Record<string, unknown>) ?? {});
      info(`Database bevat wel ${dbPlayers.length} speler(s) → realtime werkt niet`);
    } else {
      const count = Object.keys(realtimePlayersAfterJoin!).length;
      pass(`Speler 1 ontving de update: ${count} spelers in de lobby ✓`);

      if (realtimePlayersAfterJoin![player2Id]) {
        pass('Speler 2 is zichtbaar in de spelerslijst van speler 1 ✓');
      } else {
        fail('Speler 2 ontbreekt in de realtime update');
        errors++;
      }
    }

    // ── Stap 7: Klaar melden ──────────────────────────────────────────────────
    header('Stap 7: Speler 2 meldt zich klaar');
    await setReady(client2, lobbyId, player2Id);
    pass('Speler 2 is klaar');

    // ── Stap 8: Spel starten ──────────────────────────────────────────────────
    header('Stap 8: Spel starten (speler 1 / host)');

    const { data: lobbySnap } = await client1
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();
    if (!lobbySnap) throw new Error('Lobby niet gevonden voor start');

    const playerOrder = Object.keys(lobbySnap.players as Record<string, unknown>);
    const playerNames: Record<string, string> = {};
    for (const [pid, pdata] of Object.entries(
      lobbySnap.players as Record<string, Record<string, string>>,
    )) {
      playerNames[pid] = pdata.displayName;
    }

    info(`Spelers in lobby: ${playerOrder.length} — ${playerOrder.map(id => playerNames[id]).join(', ')}`);
    if (playerOrder.length < 2) {
      fail(`Lobby heeft maar ${playerOrder.length} speler(s)`);
      errors++;
    }

    gameId = await startGame(client1, lobbyId, playerOrder, playerNames);
    pass(`Spel aangemaakt (${gameId.slice(0, 8)}…)`);

    // ── Stap 9: Spelstatus controleren ────────────────────────────────────────
    header('Stap 9: Spelstatus controleren bij beide spelers');

    const { data: game1 } = await client1.from('games').select('*').eq('id', gameId).single();
    const { data: game2 } = await client2.from('games').select('*').eq('id', gameId).single();

    if (!game1) { fail('Speler 1 kan het spel NIET zien (RLS probleem?)'); errors++; }
    else           pass('Speler 1 kan het spel zien ✓');

    if (!game2) { fail('Speler 2 kan het spel NIET zien (RLS probleem?)'); errors++; }
    else           pass('Speler 2 kan het spel zien ✓');

    if (game1) {
      const inGame = Object.keys(game1.players as Record<string, unknown>);
      if (inGame.includes(player1Id) && inGame.includes(player2Id)) {
        pass('Beide spelers zitten in het spel ✓');
      } else {
        fail(`Spel mist spelers: ${JSON.stringify(inGame)}`);
        errors++;
      }
    }

    // Wacht even op de realtime lobby status update
    const lobbyDeadline = Date.now() + 5_000;
    while (!lobbyStatusUpdate && Date.now() < lobbyDeadline) await wait(200);

    if (lobbyStatusUpdate) {
      pass(`Speler 1 ontving realtime lobby status 'in_game' update ✓`);
    } else {
      info('Speler 1 ontving geen realtime lobby status update (optioneel)');
    }

    await client1.removeChannel(channel);

  } catch (err) {
    fail(`Onverwachte fout: ${err instanceof Error ? err.message : String(err)}`);
    errors++;
  } finally {
    await cleanup({ client1, client2, gameId, lobbyId, player1Id, player2Id });

    // ── Eindresultaat ─────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${'═'.repeat(43)}`);
    if (errors === 0) {
      console.log(`${C.green}  ✓ ALLE TESTS GESLAAGD${C.reset}`);
    } else {
      console.log(`${C.red}  ✗ ${errors} TEST(S) MISLUKT${C.reset}`);
    }
    console.log(`${C.bold}${'═'.repeat(43)}${C.reset}\n`);

    if (errors > 0) process.exit(1);
  }
}

run().catch(err => {
  console.error('Onverwachte fout:', err);
  process.exit(1);
});
