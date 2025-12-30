# Implementation Plan - ShitHead Card Game

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Ionic Vue Project
- Create new Ionic Vue 3 project with TypeScript
- Configure Vite build tool
- Setup ESLint and Prettier
- Configure path aliases (@/ for src/)

### 1.2 Install Dependencies
```bash
npm install pinia @vueuse/core
npm install -D vitest @vue/test-utils
```

### 1.3 Setup Project Structure
- Create directory structure as defined in CLAUDE.md
- Setup Pinia store configuration
- Configure Vue Router with routes

---

## Phase 2: Core Game Engine

### 2.1 Type Definitions (`src/types/`)
- `Card` interface
- `Player` interface
- `GameState` interface
- `GamePhase` enum
- `MoveResult` type

### 2.2 Deck Service (`src/services/deckService.ts`)
- `createDeck()` - Generate 52 cards (or 104 for 2 decks)
- `shuffleDeck()` - Fisher-Yates shuffle
- `dealCards()` - Distribute cards to players

### 2.3 Game Engine (`src/services/gameEngine.ts`)
- `initializeGame()` - Setup game with players
- `canPlayCards()` - Validate if cards can be played
- `playCards()` - Execute a move
- `checkForBurn()` - Check 10 or four-of-a-kind
- `pickupPile()` - Player takes discard pile
- `drawCards()` - Replenish hand from deck
- `getNextPlayer()` - Determine next player
- `checkGameOver()` - Check if game ended
- `getCurrentPhase()` - Determine player's phase (hand/faceup/facedown)

### 2.4 Special Card Logic
- `handleTwo()` - Reset pile
- `handleThree()` - Glass card (look through)
- `handleSeven()` - Cap at 7 or lower
- `handleTen()` - Burn pile
- `getEffectiveTopCard()` - Handle 3s stacking

### 2.5 Unit Tests for Game Engine
- Test all card combinations
- Test special card interactions
- Test burn conditions
- Test game phase transitions

---

## Phase 3: State Management

### 3.1 Game Store (`src/stores/gameStore.ts`)
```typescript
- state: GameState
- actions: startGame, playCards, pickupPile, endTurn
- getters: currentPlayer, canPlay, isGameOver
```

### 3.2 Settings Store (`src/stores/settingsStore.ts`)
```typescript
- playerCount
- aiDifficulty
- soundEnabled
- animationSpeed
```

---

## Phase 4: UI Components

### 4.1 Card Components
- `CardComponent.vue` - Single card display (face-up/face-down)
- `CardStack.vue` - Stack of cards (for piles)
- `CardHand.vue` - Fan of cards in hand
- `CardSelector.vue` - Multi-select cards from hand

### 4.2 Game Board Components
- `GameBoard.vue` - Main game layout
- `PlayerArea.vue` - Player's cards (hand, face-up, face-down)
- `DiscardPile.vue` - Central discard pile
- `DrawPile.vue` - Draw pile with count
- `BurnPile.vue` - Burned cards indicator

### 4.3 UI Components
- `PlayerTurnIndicator.vue` - Show whose turn
- `GameMessage.vue` - Show game events (Burn!, etc.)
- `ActionButtons.vue` - Play, Pickup, Pass buttons

### 4.4 Opponent Display
- `OpponentHand.vue` - Show opponent cards (hidden/visible)
- `OpponentArea.vue` - Compact opponent view

---

## Phase 5: Game Views/Pages

### 5.1 Pages
- `HomePage.vue` - Main menu
- `GameSetupPage.vue` - Player count, names, AI settings
- `GamePage.vue` - Active game
- `GameOverPage.vue` - Results screen
- `RulesPage.vue` - Game rules explanation
- `SettingsPage.vue` - App settings

### 5.2 Routing
```typescript
/home
/setup
/game
/game-over
/rules
/settings
```

---

## Phase 6: AI Opponent

### 6.1 AI Service (`src/services/aiPlayer.ts`)
- `calculateMove()` - Determine best move
- `evaluateHand()` - Score current position
- `shouldPlaySpecialCard()` - When to use 2, 3, 7, 10

### 6.2 Difficulty Levels
- **Easy**: Play first valid card(s)
- **Medium**:
  - Save special cards for emergencies
  - Play lowest valid cards
  - Try to complete four-of-a-kind burns
- **Hard**:
  - Track played cards
  - Predict opponent hands
  - Optimal special card timing
  - Strategic pile pickups

### 6.3 AI Delay
- Add realistic thinking delay (0.5-2s based on difficulty)
- Show "thinking" indicator

---

## Phase 7: Polish & UX

### 7.1 Animations
- Card dealing animation
- Card play animation
- Burn animation (fire effect)
- Shuffle animation
- Pickup pile animation

### 7.2 Sound Effects (optional)
- Card play sound
- Burn sound
- Win/lose jingle
- Turn notification

### 7.3 Visual Feedback
- Highlight playable cards
- Show valid drop zones
- Turn timer (optional)
- Card count indicators

### 7.4 Responsive Design
- Phone portrait (primary)
- Phone landscape
- Tablet support

---

## Phase 8: Android Build

### 8.1 Capacitor Setup
- Add Android platform
- Configure app icon and splash screen
- Setup Android permissions (if needed)

### 8.2 Testing
- Test on Android emulator
- Test on physical devices
- Performance optimization

### 8.3 Build & Release
- Generate signed APK
- Prepare for Play Store (optional)

---

## Phase 9: Online Multiplayer (Future)

### 9.1 Firebase Setup
- Create Firebase project
- Setup Firestore for game state
- Setup Firebase Auth (anonymous/Google)
- Setup Cloud Functions for game logic validation

### 9.2 Online Features
- Create/join game rooms
- Real-time game state sync
- Matchmaking
- Friend system
- Chat

### 9.3 Security
- Server-side move validation
- Anti-cheat measures
- Rate limiting

---

## Implementation Order (Recommended)

1. **Week 1**: Phase 1 + Phase 2 (Foundation + Game Engine)
2. **Week 2**: Phase 3 + Phase 4 (State + UI Components)
3. **Week 3**: Phase 5 + Phase 6 (Pages + AI)
4. **Week 4**: Phase 7 + Phase 8 (Polish + Android)
5. **Future**: Phase 9 (Online Multiplayer)

---

## Getting Started

To begin development, run:
```bash
npm create ionic-vue@latest shithead -- --template blank
cd shithead
npm install
ionic serve
```

Then follow Phase 1.2 and 1.3 to complete the project setup.
