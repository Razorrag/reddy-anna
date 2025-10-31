# GameAdmin Component Structure

This directory contains the React implementation of the GameAdmin interface that recreates the exact HTML frontend with proper component architecture.

## Component Structure

### Main Components
- **GameAdmin.jsx** - Main container component that orchestrates all game admin functionality
- **GameHeader.jsx** - Header with title and settings button
- **OpeningCardSection.jsx** - Section for selecting the opening card
- **AndarBaharSection.jsx** - Section for dealing cards during gameplay

### Reusable Components
- **CardGrid/** - Reusable card selection grid component
- **CountdownTimer/** - Timer component for game phases
- **BettingStats/** - Component to display betting statistics
- **NotificationSystem/** - Toast notification system
- **SettingsModal/** - Game settings configuration modal

### Context Providers
- **GameStateContext** - Centralized game state management
- **WebSocketContext** - Real-time communication with backend

## Key Features

1. **Exact Visual Replication**: Maintains the same look and feel as the original HTML implementation
2. **Component Architecture**: Proper separation of concerns with reusable components
3. **State Management**: Centralized state with React Context API
4. **Real-time Updates**: WebSocket integration for live game updates
5. **Responsive Design**: Mobile-friendly layout that adapts to different screen sizes

## Usage

```jsx
import GameAdmin from './components/GameAdmin';

function App() {
  return <GameAdmin />;
}
```

## Game Flow

1. **Opening Phase**: Admin selects an opening card from the grid
2. **Betting Phase**: Timer counts down while players place bets
3. **Playing Phase**: Admin deals cards alternately to Andar/Bahar
4. **Complete Phase**: Game ends when matching card is found

## Styling

All components use CSS modules with a consistent design system:
- Color palette: Gold (#ffd700), dark backgrounds
- Typography: Poppins font family
- Effects: Gradients, shadows, and smooth transitions
- Responsive: Mobile-first approach with breakpoints

## Integration

The component integrates with:
- Backend API for game state persistence
- WebSocket server for real-time updates
- Local storage for settings persistence