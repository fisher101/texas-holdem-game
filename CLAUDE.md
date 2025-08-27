# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start the server (production)
npm start

# Start with auto-reload for development
npm run dev

# Install dependencies
npm install
```

The server runs on port 3000 by default and serves the web interface at `http://localhost:3000`.

## Architecture Overview

This is a real-time multiplayer Texas Hold'em poker game built with Node.js/Socket.io backend and vanilla JavaScript frontend.

### Core Architecture Pattern
- **State Machine Design**: Game progresses through strict stages (waiting → preflop → flop → turn → river → showdown)
- **Event-Driven Communication**: All game actions flow through Socket.io events between client and server
- **Server-Authoritative**: All game logic, card dealing, and validation happens server-side for security
- **Player Confirmation System**: End-of-round requires all players to confirm results before proceeding

### Key Backend Classes (`server.js`)
- **PokerGame**: Main game state manager handling 2-8 players, betting rounds, and game flow
- **Player**: Individual player state (chips, cards, bets, statistics)
- **HandEvaluator**: Texas Hold'em hand ranking logic (Royal Flush → High Card)
- **Card/Deck**: Card representation and shuffling

### Frontend Structure (`public/`)
- **PokerGameClient** class in `game.js` manages all client-side state and UI updates
- Real-time UI updates driven by Socket.io events from server
- Responsive design with mobile-first approach in `styles.css`
- Modal system for round results showing winners, settlement, and all player hands

### Socket.io Event Flow
```
Client → Server: join-game, start-game, player-action, chat-message, confirm-round-result, get-room-list
Server → Client: game-state, joined-game, game-started, round-result, chat-message, round-confirmations-update, room-list
```

### Game State Synchronization
- Each player receives personalized game state (only their own cards visible)
- During showdown, all cards become visible to all players
- Statistics and game history are maintained server-side and synced to all clients

### Round Completion Flow
1. Hand ends → server calculates winners and settlement
2. Server sends `round-result` event with all details
3. Frontend displays modal with winners, settlement, and all hands
4. Each player must click "confirm" button
5. When all players confirm → automatically start next round

### Mobile Responsiveness
- CSS Grid layout adjusts from desktop (game area + sidebar) to mobile (stacked)
- Card sizes and player positions scale based on screen size
- Touch-optimized button sizing and spacing
- Community cards repositioned to avoid overlap on small screens

## Important Implementation Details

- **Hand Evaluation**: Uses combinatorial algorithm to find best 5-card hand from 7 available cards
- **Betting Logic**: Supports check/call/raise/fold with all-in detection and side pot handling
- **Dealer Button**: Rotates clockwise after each hand with proper blind posting
- **Statistics Tracking**: Real-time win rate, total winnings, games played per player
- **Chat System**: Text chat with preset quick messages and emoji support

### Real-time Room Management System
- **Room Discovery**: Homepage displays live list of active rooms with player counts and game status
- **Auto-broadcast**: Server automatically broadcasts room list updates when:
  - Players join/leave rooms
  - Games start/end
  - Room states change
- **Player Reconnection**: Existing players can reconnect without losing game state

### Fixed Layout System
- **Sidebar Sections**: Chat (400px), Stats (280px), History (200px) have fixed heights to prevent layout shifts
- **Responsive Breakpoints**: 
  - Desktop: Vertical sidebar layout
  - 1200px: Horizontal sidebar (300px height)
  - 768px: Stacked layout (320px height)
  - 480px: Compressed layout (250px height)
- **Content Overflow**: All sections use scrollable content areas to maintain stable interface dimensions

## File-Specific Notes

- `server-old.js`: Previous version without round confirmation system - can be used for reference
- Chinese requirements document (`德州扑克线上游戏开发需求_.md`) contains original specifications
- No database - all data is in-memory (resets on server restart)
- Game rooms are automatically created on first join and cleaned up when empty

## Common Development Patterns

When modifying game logic:
1. Always update server-side logic first in `PokerGame` class
2. Emit appropriate Socket.io events to sync clients
3. Update client-side UI in response to server events
4. Test with multiple browser tabs to simulate multiplayer

When adding new features:
- Follow the existing event-driven pattern
- Maintain server authority for all game state
- Ensure mobile responsiveness in CSS
- Update both game state sync and UI display logic
- Call `broadcastRoomList()` after any room state changes

When modifying UI layout:
- Maintain fixed height constraints for sidebar sections to prevent layout shifts
- Use `calc()` for precise height calculations accounting for headers/footers
- Test across all responsive breakpoints (desktop, 1200px, 768px, 480px)
- Ensure overflow content uses proper scrolling containers