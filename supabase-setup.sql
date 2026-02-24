-- =====================================================
-- SHITHEAD GAME - SUPABASE DATABASE SETUP
-- =====================================================
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xcjayoccyssxrnllnhnb/sql
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PLAYERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_name_lower TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_game_id UUID,
  current_lobby_id UUID,
  stats JSONB DEFAULT '{"gamesPlayed": 0, "gamesLost": 0, "totalTimeouts": 0}'::jsonb
);

-- Index for device_id lookups
CREATE INDEX IF NOT EXISTS idx_players_device_id ON players(device_id);
-- Index for display name uniqueness checks
CREATE INDEX IF NOT EXISTS idx_players_display_name_lower ON players(display_name_lower);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policies for players
DROP POLICY IF EXISTS "Players can view all players" ON players;
CREATE POLICY "Players can view all players" ON players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Players can insert their own profile" ON players;
CREATE POLICY "Players can insert their own profile" ON players
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Players can update their own profile" ON players;
CREATE POLICY "Players can update their own profile" ON players
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 2. LOBBIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lobbies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('random', 'private')),
  code TEXT,
  target_player_count INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_game', 'closed')),
  game_id UUID,
  players JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding lobbies by code
CREATE INDEX IF NOT EXISTS idx_lobbies_code ON lobbies(code) WHERE code IS NOT NULL;
-- Index for finding available lobbies
CREATE INDEX IF NOT EXISTS idx_lobbies_status_type ON lobbies(status, type);

-- Enable RLS
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;

-- Policies for lobbies
DROP POLICY IF EXISTS "Anyone can view lobbies" ON lobbies;
CREATE POLICY "Anyone can view lobbies" ON lobbies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create lobbies" ON lobbies;
CREATE POLICY "Authenticated users can create lobbies" ON lobbies
  FOR INSERT WITH CHECK (auth.uid() = host_player_id);

DROP POLICY IF EXISTS "Lobby members can update lobby" ON lobbies;
CREATE POLICY "Lobby members can update lobby" ON lobbies
  FOR UPDATE USING (
    -- Allow if already a member or host
    players ? auth.uid()::text
    OR host_player_id = auth.uid()
    -- Allow anyone to update a waiting lobby (for joining)
    OR status = 'waiting'
  );

DROP POLICY IF EXISTS "Host can delete lobby" ON lobbies;
CREATE POLICY "Host can delete lobby" ON lobbies
  FOR DELETE USING (host_player_id = auth.uid());

-- =====================================================
-- 3. GAMES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id UUID REFERENCES lobbies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'swapping' CHECK (status IN ('swapping', 'playing', 'ended')),
  player_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  players JSONB NOT NULL DEFAULT '{}'::jsonb,
  deck JSONB NOT NULL DEFAULT '[]'::jsonb,
  deck_count INTEGER NOT NULL DEFAULT 1,
  deck_empty BOOLEAN NOT NULL DEFAULT false,
  discard_pile JSONB NOT NULL DEFAULT '[]'::jsonb,
  burn_pile JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_player_index INTEGER NOT NULL DEFAULT 0,
  turn_state JSONB,
  swap_phase JSONB,
  loser_id UUID,
  reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding games by lobby
CREATE INDEX IF NOT EXISTS idx_games_lobby_id ON games(lobby_id);
-- Index for active games
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policies for games
DROP POLICY IF EXISTS "Game participants can view game" ON games;
CREATE POLICY "Game participants can view game" ON games
  FOR SELECT USING (
    players ? auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
CREATE POLICY "Authenticated users can create games" ON games
  FOR INSERT WITH CHECK (
    players ? auth.uid()::text
  );

DROP POLICY IF EXISTS "Game participants can update game" ON games;
CREATE POLICY "Game participants can update game" ON games
  FOR UPDATE USING (
    players ? auth.uid()::text
  );

-- =====================================================
-- 4. BANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bans (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID,
  reason TEXT NOT NULL DEFAULT 'afk_timeout',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;

-- Policies for bans
DROP POLICY IF EXISTS "Players can view their own bans" ON bans;
CREATE POLICY "Players can view their own bans" ON bans
  FOR SELECT USING (player_id = auth.uid());

DROP POLICY IF EXISTS "System can create bans" ON bans;
CREATE POLICY "System can create bans" ON bans
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update bans" ON bans;
CREATE POLICY "System can update bans" ON bans
  FOR UPDATE USING (true);

-- =====================================================
-- 5. REALTIME SUBSCRIPTIONS
-- =====================================================
-- Enable realtime for lobbies and games tables

-- First, check if the publication exists and add tables
DO $$
BEGIN
  -- Add tables to realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE lobbies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE games;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 6. AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for lobbies
DROP TRIGGER IF EXISTS update_lobbies_updated_at ON lobbies;
CREATE TRIGGER update_lobbies_updated_at
  BEFORE UPDATE ON lobbies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for games
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ENABLE ANONYMOUS SIGN-INS
-- =====================================================
-- Note: You also need to enable Anonymous Sign-ins in the Supabase Dashboard:
-- Authentication -> Providers -> Anonymous -> Enable

-- =====================================================
-- DONE!
-- =====================================================
-- After running this script:
-- 1. Go to Authentication -> Providers -> Enable "Anonymous Sign-ins"
-- 2. Test your app with: ionic serve
-- =====================================================
