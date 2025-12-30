# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShitHead is a cross-platform card game app built with Ionic and Vue 3. The game is a shedding-type card game where the goal is to be the first to get rid of all your cards - there are no winners, only one loser (the last player with cards).

## Tech Stack

- **Framework**: Ionic 7+ with Vue 3
- **Language**: TypeScript
- **State Management**: Pinia
- **Build Tool**: Vite
- **Future Backend**: Firebase (for online multiplayer)
- **Target Platforms**: Android (primary), iOS, Web

## Common Commands

```bash
# Install dependencies
npm install

# Development server
ionic serve

# Build for production
ionic build

# Android development
ionic cap add android
ionic cap sync android
ionic cap open android

# Run on Android device/emulator
ionic cap run android

# iOS development (macOS only)
ionic cap add ios
ionic cap sync ios
ionic cap open ios

# Run tests
npm run test
npm run test:unit

# Lint
npm run lint
```

## Game Rules (Shithead)

### Setup
- Each player receives: 4 face-down cards, 4 face-up cards (on top of face-down), 4 hand cards
- Player count: 2-4 players (1 deck), 4-8 players (2 decks)

### Gameplay
- Players take turns playing one or more cards of the same rank onto the discard pile
- Played cards must be equal to or higher than the top card
- After each turn, draw from the deck to maintain 4 hand cards
- When you cannot play, pick up the entire discard pile

### Special Cards
| Card | Effect |
|------|--------|
| **2** | Can be played on anything, resets the pile (next card can be anything) |
| **3** | "Glass" card - can be played on anything, next player must beat the card below the 3 |
| **7** | Can only be played on 7 or lower. Next card must be 7 or lower |
| **10** | "Burn" - removes the entire discard pile from the game |

### Burn Mechanic
The discard pile is burned (removed from game) when:
- A 10 is played
- Four cards of the same rank are on top of the pile

### End Game Phases
1. **Hand phase**: Play from hand, draw to replenish
2. **Face-up phase**: When deck is empty and hand is empty, play face-up cards
3. **Face-down phase**: Play face-down cards blindly (pick without looking)

The last player with cards is the **loser** (Shithead).

## Architecture

### Directory Structure
```
src/
├── components/        # Reusable Vue components
│   ├── game/         # Game-specific components (Card, Hand, Pile, etc.)
│   └── ui/           # Generic UI components
├── composables/      # Vue 3 composables for shared logic
├── stores/           # Pinia stores
│   ├── gameStore.ts  # Main game state
│   └── settingsStore.ts
├── views/            # Page components (Ionic pages)
├── services/         # Business logic
│   ├── gameEngine.ts # Core game rules and logic
│   ├── aiPlayer.ts   # AI opponent logic
│   └── deckService.ts
├── types/            # TypeScript interfaces and types
├── utils/            # Helper functions
└── router/           # Vue Router configuration
```

### Key Design Patterns

1. **Game State Machine**: The game engine uses a state machine pattern for game phases (SETUP, PLAYING, HAND_PHASE, FACEUP_PHASE, FACEDOWN_PHASE, ENDED)

2. **Card Representation**: Cards use a simple object structure:
   ```typescript
   interface Card {
     suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
     rank: number; // 2-14 (11=J, 12=Q, 13=K, 14=A)
     id: string;   // Unique identifier
   }
   ```

3. **Player State**:
   ```typescript
   interface Player {
     id: string;
     name: string;
     hand: Card[];
     faceUp: Card[];
     faceDown: Card[];
     isAI: boolean;
   }
   ```

4. **Move Validation**: All moves are validated through `gameEngine.ts` which checks:
   - Is it the player's turn?
   - Are the cards playable based on current pile state?
   - Special card rules (2, 3, 7, 10)

### AI Implementation
The AI uses a strategy pattern with difficulty levels:
- **Easy**: Random valid moves
- **Medium**: Basic strategy (save special cards, play lowest valid)
- **Hard**: Advanced strategy (card counting, optimal special card usage)

## Testing Strategy

- Unit tests for game engine logic (critical path)
- Component tests for Vue components
- Integration tests for game flow
- Use Vitest as test runner

## Future Considerations

- Firebase integration for online multiplayer
- Matchmaking system
- Player statistics and leaderboards
- Animations and sound effects
- Multiple game variations/house rules
