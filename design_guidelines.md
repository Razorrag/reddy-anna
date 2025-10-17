# Andar Bahar Casino Game - Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based with Premium Casino Aesthetic

Drawing inspiration from industry leaders like Bet365, DraftKings, and modern casino platforms, combined with live streaming elements from Twitch. This is a high-stakes, real-time gaming experience where visual trust, excitement, and clarity are paramount.

**Core Design Principles:**
- **Premium Trust:** Luxurious aesthetic that conveys security and professionalism
- **Real-time Clarity:** Instant visual feedback for every game state change
- **Responsive Excitement:** Dynamic elements that heighten engagement without overwhelming
- **Mobile-First Precision:** Touch-optimized controls with generous hit areas

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- **Background Foundation:** 
  - Primary: 0 0% 8% (deep charcoal, almost black)
  - Secondary: 0 0% 12% (slightly elevated surfaces)
  - Tertiary: 0 0% 16% (card containers, panels)

- **Gold Accents (Brand Identity):**
  - Primary Gold: 45 100% 51% (vibrant gold for CTAs, winning states)
  - Muted Gold: 45 35% 45% (borders, inactive states)
  - Highlight Gold: 45 90% 65% (hover states, glows)

- **Game State Colors:**
  - Andar Side: 10 80% 55% (warm red-orange)
  - Bahar Side: 220 75% 55% (cool blue)
  - Success/Win: 142 76% 36% (emerald green)
  - Warning/Timer: 38 92% 50% (amber)
  - Error/Loss: 0 84% 60% (red)

- **Neutrals:**
  - Text Primary: 0 0% 98% (near white)
  - Text Secondary: 0 0% 70% (muted gray)
  - Borders: 0 0% 25% (subtle dividers)

**Gradient Overlays:**
- Hero/Header: Linear gradient from 0 0% 8% to 0 0% 4% (subtle depth)
- Card Glow (winning): Radial gradient using primary gold with 40% opacity
- Betting Chip Shine: Linear gradient from 45 100% 60% to 45 100% 40%

### B. Typography

**Font Family:** Poppins (Google Fonts)
- Primary: 'Poppins', -apple-system, system-ui, sans-serif
- Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Type Scale:**
- **Hero/Display:** text-5xl md:text-6xl lg:text-7xl, font-bold, tracking-tight
- **H1 (Game Title):** text-4xl md:text-5xl, font-semibold
- **H2 (Section Headers):** text-2xl md:text-3xl, font-semibold
- **H3 (Card Labels):** text-xl md:text-2xl, font-medium
- **Body Large (Bet Amounts):** text-lg md:text-xl, font-medium
- **Body (UI Text):** text-base, font-regular
- **Small (Labels):** text-sm, font-medium
- **Tiny (Metadata):** text-xs, font-regular

**Special Typography:**
- **Timer Display:** text-6xl md:text-8xl, font-bold, tabular-nums (monospace numbers)
- **Bet Amounts:** text-3xl, font-bold, tracking-wide with ₹ symbol
- **Card Ranks:** text-4xl, font-bold (A, K, Q, J, or number)

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- **Micro spacing:** p-2, gap-2 (8px) - chip spacing, icon gaps
- **Component padding:** p-4, p-6 (16-24px) - cards, buttons
- **Section spacing:** p-8, py-12 (32-48px) - major layout sections
- **Major gaps:** gap-16, gap-20 (64-80px) - between game areas

**Grid System:**
- **Player Interface:** Three-column layout on desktop (25% Andar | 50% Center | 25% Bahar), stacks to single column on mobile
- **Admin Card Grid:** 13 columns × 4 rows responsive grid (grid-cols-13 on lg, grid-cols-6 on md, grid-cols-4 on base)
- **Betting Chips:** Horizontal auto-fit grid with min-width constraints

**Responsive Breakpoints:**
- Mobile: base (< 768px) - single column stacked layout
- Tablet: md (768px+) - two-column hybrid
- Desktop: lg (1024px+) - full three-column glory
- Large: xl (1280px+) - max-width constraints with centered content

### D. Component Library

**Card Components:**
- **Playing Card:** 
  - Size: w-16 h-24 md:w-20 md:h-32 (aspect ratio 2:3)
  - Background: White with subtle gradient
  - Border: 2px solid with suit color
  - Corner radius: rounded-lg
  - Shadow: shadow-lg with glow on win
  - Transform: scale-110 on hover, rotate-3 on deal animation
  
- **Opening Card Display:**
  - Size: w-32 h-48 md:w-40 md:h-60 (larger, focal)
  - Glow effect: ring-4 ring-gold with pulse animation
  - Elevation: shadow-2xl

**Timer Component:**
- **Circular Progress:**
  - Diameter: w-48 h-48 md:w-64 md:h-64
  - SVG circle with stroke-dasharray animation
  - Gradient stroke from gold to amber as time decreases
  - Center number with countdown (text-6xl)
  - Pulse effect at < 10 seconds

**Betting Interface:**
- **Chip Selectors:**
  - Circular buttons: w-16 h-16 md:w-20 md:h-20
  - Background: Radial gradient simulating 3D chip
  - Labels: Text overlay with ₹ value
  - Active state: ring-4 ring-gold, scale-110
  - Stack effect: Multiple chips visual with shadow layers

- **Bet Display Panels:**
  - Container: p-6, rounded-2xl, backdrop-blur-md
  - Background: bg-tertiary/80 with border-muted-gold
  - Amount: text-4xl font-bold text-gold
  - Label: text-sm uppercase tracking-wider

**Video Stream:**
- **Container:** aspect-video, rounded-xl, overflow-hidden
- **Overlay Controls:** Absolute positioned with gradient backdrop
- **Quality Indicator:** Top-right badge (LIVE with red dot pulse)
- **Fallback:** Placeholder with game logo and "Stream Starting" message

**Navigation & Controls:**
- **Primary Buttons:**
  - Size: px-8 py-4, rounded-full
  - Background: bg-gold with hover:bg-highlight-gold
  - Text: text-dark font-semibold text-lg
  - Shadow: shadow-lg hover:shadow-xl
  - Transition: all 200ms ease

- **Secondary Buttons:**
  - Variant: border-2 border-gold text-gold
  - Hover: bg-gold/10
  
- **Icon Buttons:** w-12 h-12, rounded-full, flex center

**Game History:**
- **Result Indicators:**
  - Circles: w-10 h-10, rounded-full
  - Andar (A): bg-andar text-white
  - Bahar (B): bg-bahar text-white
  - Layout: Horizontal scroll on mobile, grid on desktop

**Admin Card Grid:**
- **Card Selection Tiles:**
  - Size: w-full aspect-card (scalable)
  - Background: bg-white with suit-colored accents
  - Hover: scale-105, shadow-xl, brightness-110
  - Selected: ring-4 ring-gold, bg-gold/20
  - Disabled: opacity-50, cursor-not-allowed

### E. Animations

**Use Sparingly - Only for Critical Feedback:**

- **Card Deal Animation:**
  - Entry: translate-y-[-100vh] to translate-y-0 over 500ms
  - Easing: ease-out with slight bounce
  - Stagger: 100ms delay between cards

- **Win State:**
  - Glow pulse: 0 to shadow-2xl-gold over 1s infinite
  - Scale: 1 to 1.05 subtle pulse
  - Confetti: Brief particle effect on game complete

- **Timer Warning:**
  - Pulse at < 10 seconds: scale 1 to 1.1 over 500ms
  - Color shift: gold to amber to red

- **Chip Selection:**
  - Click feedback: scale-95 momentary
  - Hover: scale-110 with 200ms transition

**No Animations:**
- Background movements
- Continuous scrolling effects
- Distracting particle systems
- Page transitions

---

## Images

**Live Video Stream:**
- **Location:** Center column in player interface, full-width on mobile
- **Type:** Real-time video feed or placeholder
- **Treatment:** Rounded corners (rounded-xl), subtle shadow, quality badge overlay
- **Fallback:** Game logo with animated gold ring border

**Betting Chips:**
- **Location:** Bottom betting panel in horizontal scroll
- **Type:** Pre-designed chip images with denominations
- **Treatment:** Circular, gradient backgrounds simulating casino chips, drop shadow for depth
- **Colors:** Gold, Red, Blue, Green, Purple based on denominations

**Card Suit Icons:**
- **Location:** On playing cards, admin grid headers
- **Type:** SVG icons for ♠ ♥ ♦ ♣
- **Treatment:** Solid colors (black for spades/clubs, red for hearts/diamonds)

**No Large Hero Image:** This is a game interface, not a marketing page - focus is on live gameplay and real-time interaction.

---

## Special Considerations

**Trust & Security Signals:**
- "LIVE" indicator with pulsing red dot on video stream
- SSL badge or security icon in footer
- Real-time sync indicator (green dot when connected)
- Transparent bet amount displays updated in real-time

**Mobile Optimization:**
- Minimum touch target: 44px × 44px for all interactive elements
- Sticky betting panel at bottom on mobile
- Swipe gestures for chip selection
- Landscape mode support for video stream

**Accessibility:**
- High contrast text (WCAG AAA on dark backgrounds)
- Keyboard navigation for all controls
- Screen reader labels for card values and game state
- Focus indicators with gold outline ring-2

**Performance:**
- Lazy load card images
- Optimize WebSocket payload size
- CSS transforms for animations (GPU accelerated)
- Debounce bet amount updates to prevent server spam

This premium casino aesthetic balances luxury with clarity, creating an immersive yet trustworthy real-time gaming experience.