# 🎨 BONUS SYSTEM - FRONTEND DISPLAY GUIDE

**Date:** November 7, 2024  
**Purpose:** Visual guide for bonus display across the application

---

## 📱 DISPLAY LOCATIONS

### **1. GAME PAGE HEADER (MobileTopBar)**

**Location:** Top right corner, next to wallet  
**Always Visible:** Yes (when bonus > 0)

#### **Visual States:**

**A. Has Unlocked Bonus (Green, Pulsing):**
```
┌─────────────────────────────────────────────┐
│ [R1]  [👤]  [🎁 ₹1,250]  [💰 ₹25,000]    │
│              ↑ GREEN                        │
│           PULSING                           │
└─────────────────────────────────────────────┘
```
- **Shows:** Total of ALL bonuses (locked + unlocked)
- **Color:** Green background with pulsing animation
- **Icon:** Gift icon (🎁)
- **Tooltip:** "You have ₹750 unlocked bonus ready to claim!"
- **Click:** Navigate to `/profile?tab=bonuses`

**B. Only Locked Bonus (Yellow, Static):**
```
┌─────────────────────────────────────────────┐
│ [R1]  [👤]  [🔒 ₹500]  [💰 ₹25,000]       │
│              ↑ YELLOW                       │
│            NO PULSE                         │
└─────────────────────────────────────────────┘
```
- **Shows:** Total of ALL bonuses (all locked)
- **Color:** Yellow background, no animation
- **Icon:** Lock icon (🔒)
- **Tooltip:** "Keep playing to unlock ₹500 bonus (45% complete)"
- **Click:** Navigate to `/profile?tab=bonuses`

**C. No Bonus (Hidden):**
```
┌─────────────────────────────────────────────┐
│ [R1]  [👤]  [💰 ₹25,000]                   │
│              ↑ NO BONUS CHIP                │
└─────────────────────────────────────────────┘
```
- **Shows:** Nothing (chip hidden)
- **When:** totalBonus === 0

---

### **2. PROFILE PAGE - BONUSES TAB**

**Location:** New tab in profile page  
**Tab Order:** Profile → Transactions → Game History → **Bonuses** → Referral

#### **Full Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ PROFILE PAGE - BONUSES TAB                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💰 BONUS OVERVIEW                                       ││
│ ├─────────────────────────────────────────────────────────┤│
│ │ ┌──────────┬──────────┬──────────┬──────────┐          ││
│ │ │Available │  Locked  │ Credited │ Lifetime │          ││
│ │ │  ₹1,250  │  ₹750   │  ₹5,000  │ ₹7,000  │          ││
│ │ │  🎁      │  🔒     │  ✅      │  📊     │          ││
│ │ └──────────┴──────────┴──────────┴──────────┘          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💳 DEPOSIT BONUSES (3 Active)                           ││
│ ├─────────────────────────────────────────────────────────┤│
│ │                                                          ││
│ │ ┌──────────────────────────────────────────────────┐   ││
│ │ │ Deposit: ₹10,000 → Bonus: ₹500                   │   ││
│ │ │ ┌────────────────────────────────────────────┐   │   ││
│ │ │ │ ████████████████████░░░░░░░░░░░░░░░░░░░░░ │   │   ││
│ │ │ └────────────────────────────────────────────┘   │   ││
│ │ │ Wagered: ₹3,750 / ₹5,000 (75% Complete)         │   ││
│ │ │ 🔓 UNLOCKED - Will auto-credit when 100%         │   ││
│ │ │ Added: Nov 7, 2024 10:00 AM                      │   ││
│ │ └──────────────────────────────────────────────────┘   ││
│ │                                                          ││
│ │ ┌──────────────────────────────────────────────────┐   ││
│ │ │ Deposit: ₹5,000 → Bonus: ₹250                    │   ││
│ │ │ ┌────────────────────────────────────────────┐   │   ││
│ │ │ │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │   ││
│ │ │ └────────────────────────────────────────────┘   │   ││
│ │ │ Wagered: ₹750 / ₹2,500 (30% Complete)           │   ││
│ │ │ 🔒 LOCKED - Keep playing to unlock               │   ││
│ │ │ Added: Nov 6, 2024 3:45 PM                       │   ││
│ │ └──────────────────────────────────────────────────┘   ││
│ │                                                          ││
│ │ ┌──────────────────────────────────────────────────┐   ││
│ │ │ Deposit: ₹20,000 → Bonus: ₹1,000                 │   ││
│ │ │ ┌────────────────────────────────────────────┐   │   ││
│ │ │ │ ████████████████████████████████████████ │   │   ││
│ │ │ └────────────────────────────────────────────┘   │   ││
│ │ │ Wagered: ₹10,000 / ₹10,000 (100% Complete)      │   ││
│ │ │ ✅ CREDITED - Added to balance on Nov 5          │   ││
│ │ │ Credited: Nov 5, 2024 8:20 PM                    │   ││
│ │ └──────────────────────────────────────────────────┘   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 👥 REFERRAL BONUSES (2 Total)                           ││
│ ├─────────────────────────────────────────────────────────┤│
│ │                                                          ││
│ │ ┌──────────────────────────────────────────────────┐   ││
│ │ │ [👤] User123                                      │   ││
│ │ │      Deposited: ₹10,000                           │   ││
│ │ │      Your Bonus: ₹100                      ✅    │   ││
│ │ │      Credited: Nov 6, 2024 2:15 PM               │   ││
│ │ └──────────────────────────────────────────────────┘   ││
│ │                                                          ││
│ │ ┌──────────────────────────────────────────────────┐   ││
│ │ │ [👤] User456                                      │   ││
│ │ │      Deposited: ₹5,000                            │   ││
│ │ │      Your Bonus: ₹50                       ✅    │   ││
│ │ │      Credited: Nov 5, 2024 5:30 PM               │   ││
│ │ └──────────────────────────────────────────────────┘   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📜 BONUS HISTORY (Last 10 Events)                       ││
│ ├─────────────────────────────────────────────────────────┤│
│ │                                                          ││
│ │ ● ✅ Bonus Credited                        +₹1,000     ││
│ │ │    Deposit bonus unlocked and credited                ││
│ │ │    Nov 5, 2024 8:20 PM                                ││
│ │ │                                                        ││
│ │ ● 🔓 Bonus Unlocked                         ₹1,000     ││
│ │ │    Wagering requirement met (100%)                    ││
│ │ │    Nov 5, 2024 8:20 PM                                ││
│ │ │                                                        ││
│ │ ● 📊 Wagering Progress                      ₹500       ││
│ │ │    Deposit bonus: 50% → 75% complete                  ││
│ │ │    Nov 5, 2024 6:15 PM                                ││
│ │ │                                                        ││
│ │ ● 🎁 Bonus Added                            +₹500      ││
│ │ │    Deposit bonus: ₹10,000 deposit                     ││
│ │ │    Nov 5, 2024 2:00 PM                                ││
│ │ │                                                        ││
│ │ [Load More]                                              ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 COLOR SCHEME

### **Status Colors:**

| Status | Background | Border | Text | Icon |
|--------|-----------|--------|------|------|
| **Unlocked** | Green/20 | Green/50 | Green/400 | 🔓 |
| **Locked** | Yellow/20 | Yellow/50 | Yellow/400 | 🔒 |
| **Credited** | Blue/20 | Blue/50 | Blue/400 | ✅ |
| **Expired** | Gray/20 | Gray/50 | Gray/400 | ⏰ |

### **Progress Bar Colors:**

| Progress | Color | Gradient |
|----------|-------|----------|
| 0-30% | Red | from-red-500 to-red-600 |
| 31-70% | Yellow | from-yellow-500 to-yellow-600 |
| 71-99% | Green | from-green-500 to-green-600 |
| 100% | Blue | from-blue-500 to-blue-600 |

---

## 📊 DATA FLOW

### **Game Page Header:**

```typescript
// Fetch cumulative bonus
const { data } = await apiClient.get('/api/user/bonus-summary');

// Calculate totals
const totalUnlocked = data.depositBonuses.unlocked + data.referralBonuses.pending;
const totalLocked = data.depositBonuses.locked;
const totalBonus = totalUnlocked + totalLocked;

// Display logic
if (totalBonus > 0) {
  showBonusChip({
    amount: totalBonus,
    isUnlocked: totalUnlocked > 0,
    progress: calculateOverallProgress(data)
  });
}
```

### **Bonuses Tab:**

```typescript
// Fetch detailed data
const [depositBonuses, setDepositBonuses] = useState([]);
const [referralBonuses, setReferralBonuses] = useState([]);
const [bonusHistory, setBonusHistory] = useState([]);

useEffect(() => {
  if (activeTab === 'bonuses') {
    fetchDepositBonuses();
    fetchReferralBonuses();
    fetchBonusHistory();
  }
}, [activeTab]);

// Real-time updates
useEffect(() => {
  const handleBonusUpdate = (event) => {
    // Refresh all bonus data
    fetchDepositBonuses();
    fetchBonusHistory();
  };
  
  window.addEventListener('bonus-updated', handleBonusUpdate);
  return () => window.removeEventListener('bonus-updated', handleBonusUpdate);
}, []);
```

---

## 🔔 NOTIFICATIONS

### **Automatic Notifications:**

**1. Bonus Unlocked:**
```
🔓 Bonus Unlocked!
₹500 deposit bonus is now unlocked
75% wagering requirement complete
```

**2. Bonus Auto-Credited:**
```
✅ Bonus Credited!
₹500 automatically added to your balance
Wagering requirement met (100%)
```

**3. Wagering Progress:**
```
📊 Wagering Progress
50% complete for ₹500 bonus
Keep playing to unlock!
```

**4. New Referral Bonus:**
```
👥 Referral Bonus!
₹100 earned from User123's deposit
Credited to your account
```

---

## 📱 RESPONSIVE DESIGN

### **Mobile (< 768px):**
- Overview cards: 2x2 grid
- Deposit bonuses: Full width, stacked
- Progress bars: Full width
- History: Compact timeline

### **Tablet (768px - 1024px):**
- Overview cards: 4x1 grid
- Deposit bonuses: 2 columns
- Progress bars: Full width
- History: Standard timeline

### **Desktop (> 1024px):**
- Overview cards: 4x1 grid
- Deposit bonuses: 2 columns
- Progress bars: Full width
- History: Expanded timeline with details

---

## 🎯 USER EXPERIENCE FLOW

### **Scenario 1: New Deposit**

```
User deposits ₹10,000
    ↓
Deposit approved by admin
    ↓
Bonus created: ₹500 (5%)
    ↓
Status: LOCKED
    ↓
Wagering required: ₹5,000
    ↓
Game header shows: 🔒 ₹500 (yellow)
    ↓
Bonuses tab shows: Progress bar at 0%
    ↓
Notification: "🎁 ₹500 bonus added! Play to unlock"
```

### **Scenario 2: Playing & Wagering**

```
User places bet: ₹100
    ↓
Wagering tracked: ₹100 / ₹5,000
    ↓
Progress updated: 2%
    ↓
Progress bar updates in real-time
    ↓
Every 25% milestone: Notification
    ↓
"📊 25% complete! ₹1,250 / ₹5,000 wagered"
```

### **Scenario 3: Bonus Unlocked**

```
User reaches ₹5,000 wagered
    ↓
Wagering complete: 100%
    ↓
Status: UNLOCKED
    ↓
Auto-credit to balance: +₹500
    ↓
Status: CREDITED
    ↓
Game header updates: Shows next bonus or hides chip
    ↓
Notification: "✅ ₹500 bonus credited to your balance!"
    ↓
Balance updates immediately
    ↓
History logged: "Bonus credited"
```

---

## ✅ IMPLEMENTATION CHECKLIST

### **Game Header:**
- [ ] Show cumulative bonus chip
- [ ] Green pulsing for unlocked
- [ ] Yellow static for locked
- [ ] Hide when no bonus
- [ ] Click navigates to Bonuses tab
- [ ] Tooltip shows breakdown

### **Bonuses Tab:**
- [ ] Overview card with 4 stats
- [ ] Deposit bonuses list with progress bars
- [ ] Referral bonuses list
- [ ] Bonus history timeline
- [ ] Real-time updates
- [ ] Loading states
- [ ] Empty states

### **Notifications:**
- [ ] Bonus added
- [ ] Wagering progress (25%, 50%, 75%)
- [ ] Bonus unlocked
- [ ] Bonus credited
- [ ] Referral bonus received

### **Data Fetching:**
- [ ] GET /api/user/bonus-summary
- [ ] GET /api/user/deposit-bonuses
- [ ] GET /api/user/referral-bonuses
- [ ] GET /api/user/bonus-transactions
- [ ] WebSocket updates

---

**Status:** 🟢 **DESIGN COMPLETE**  
**Next:** Implement backend API endpoints  
**Then:** Build frontend components
