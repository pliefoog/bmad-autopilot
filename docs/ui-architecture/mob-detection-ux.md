# Man Overboard (MOB) Detection - User Experience Design

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-16 | 1.0 | Initial MOB detection UX design specification | Winston (Architect) |

---

## Document Scope

This document defines the **complete user experience** for the Man Overboard (MOB) Detection System, including screen designs, user workflows, interaction patterns, and visual specifications.

**Related Documents:**
- [MOB Detection Architecture](../architecture/mob-detection-architecture.md) - Technical implementation
- [MOB Brainstorming Results](../MOB-brainstorming-results.md) - Requirements and feasibility
- [UI Architecture](index.md) - Overall design system

---

## Design Principles

### MOB-Specific UX Principles

**1. Safety-Critical Clarity**
- Zero ambiguity in safety status and alerts
- High-contrast colors for critical states (red for MOB, green for all-OK)
- Large touch targets for emergency scenarios (minimum 60px)
- Clear, concise language (no jargon)

**2. Fail-Safe Visibility**
- Crew monitoring status always visible in HeaderBar
- Pre-departure safety check blocks Navigation Session start
- MOB alerts are full-screen, modal, impossible to miss

**3. Trust Through Transparency**
- Show exactly who is being monitored
- Display device battery levels and connection status
- Explain why safety checks fail (actionable feedback)
- Make system status obvious at a glance

**4. Minimize False Alarm Fatigue**
- One-tap dismissal for false alarms (from both devices)
- Clear indication when crew member goes below deck
- Adjustable detection timeout in settings

**5. Consistent Marine Design Language**
- Aligns with existing widget and HeaderBar patterns
- Uses established theme system (day/night/red-night modes)
- Follows grid-based layout principles
- Marine equipment familiarity (instruments, not consumer apps)

---

## User Workflows

### Primary User Journeys

#### Journey 1: First-Time Setup (Tag App)

```
1. Install Tag App on crew smartphone/watch
   └─> Launch app
       └─> Welcome screen explaining MOB detection
           └─> Enter crew member name
               └─> Grant Bluetooth permissions
                   └─> Start advertising (Tag active)
                       └─> Confirmation: "You are now being monitored"
```

**Screen Sequence:**
1. Welcome & Explanation
2. Name Entry
3. Permission Requests (Bluetooth, Notifications)
4. Active Status Confirmation

---

#### Journey 2: Pre-Departure Safety Check (Boating Instruments App)

```
User wants to start Navigation Session
   └─> Tap "Start Navigation" button
       └─> Pre-Departure Safety Check screen appears
           ├─> All crew OK? → Start Navigation immediately
           │   └─> App enters foreground monitoring mode
           │       └─> Active ping detection enabled (900ms - 1.5s detection)
           └─> Issues detected?
               ├─> View issue details
               ├─> Wait for crew to fix (refresh scan)
               └─> Captain override → Start anyway (with warning)
```

**Decision Points:**
- **All crew devices detected, charged, ready** → Green light, proceed
- **Issues detected** → Yellow warning, show details, offer override
- **No crew devices detected** → Red warning, strongly discourage start

---

#### Journey 3: Normal Navigation Session (Monitoring Active)

```
Navigation Session running
   └─> Crew roster visible in HeaderBar
       ├─> All crew OK → Green indicator "👥 3/3"
       ├─> One crew below deck → Yellow indicator "👥 2/3" (1 weak signal)
       └─> MOB detected → Full-screen alert (see Journey 4)
```

**Continuous Monitoring:**
- HeaderBar shows real-time crew status
- Tap crew icon to expand roster details
- System silently monitors BLE signals every 2 seconds

---

#### Journey 4: MOB Emergency Detected

**Phase 1 MVP: Active Ping Detection (900ms - 1.5s)**
```
3 consecutive BLE pings missed (900ms - 1.5 seconds) + Navigation Session active
   └─> MOB Alert screen (full-screen, modal)
       ├─> Display crew member name, time, position
       ├─> Trigger critical alarm (sound + vibration)
       ├─> Mark MOB waypoint automatically
       ├─> Show estimated MOB location (backward trajectory)
       ├─> Display signal trend (sudden loss / weakening / stable)
       └─> User actions available:
           ├─> Dismiss false alarm
           ├─> Mark waypoint manually
           ├─> Trigger autopilot MOB pattern (Phase 4)
           └─> Call emergency services
```

**Phase 2: Accelerometer Fall Detection (400-500ms)**
```
Fall detected by Tag App accelerometer
   └─> Fall flag set in BLE advertisement
       └─> Boating App receives advertisement with fall flag
           └─> IMMEDIATE MOB Alert (no ping delay)
               └─> "Fall detected" indicator shown
               └─> Very high confidence alert
```

**Critical Path:**
- **Phase 1:** Alert visible within 0.9-1.5 seconds of signal loss
- **Phase 2:** Alert visible within 0.4-0.5 seconds of fall detection
- Impossible to miss (full-screen, sound, vibration)
- Clear actions for both false alarm and real emergency

**Detection Performance:**
- **Ping mode:** 900ms - 1.5s (boat travels ~23 feet at 5 knots)
- **Fall detection:** 400-500ms (boat travels ~10 feet at 5 knots)
- **Commercial benchmark:** ACR OLAS claims 8 seconds

---

#### Journey 5: Temporary Logout (Tag App)

```
Crew member going below deck / kayaking / intentional activity
   └─> Open Tag App
       └─> Tap "Temporary Logout"
           └─> Select duration (15 min, 30 min, 1 hour, custom)
               └─> Optionally add reason ("Kayaking", "Below deck", etc.)
                   └─> Confirmation: "Monitoring paused for 30 minutes"
                       └─> Timer countdown displayed
                           └─> Auto-resume after duration
                               └─> Notification: "Monitoring resumed"
```

**Workflow Variants:**
- **Auto-resume** (default): Monitoring restarts after timer
- **Manual resume**: User taps "Resume Monitoring" early
- **Re-entry prompt**: When device re-enters range, ask to resume

---

## Screen Designs

### 1. Pre-Departure Safety Check Screen

**Purpose:** Verify all crew devices before starting Navigation Session

**Layout:** Full-screen modal, appears on "Start Navigation" tap

#### Visual Design (Day Theme)

```
┌─────────────────────────────────────────────────────────────┐
│  ✕                                                           │ ← Close button (cancel)
│                                                               │
│        🛟 Pre-Departure Safety Check                         │ ← Title (24px bold)
│                                                               │
│  Ensure all crew devices are ready before departure          │ ← Subtitle (14px)
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Crew Roster (Auto-Discovered)                               │ ← Section header (16px semibold)
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ John Doe                                           │  │ ← Crew member card
│  │    Battery: 85% ████████░░ | Signal: Strong          │  │   (Green check = OK)
│  │    iPhone 13 Pro                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⚠️  Jane Smith                                        │  │ ← Yellow warning
│  │    Battery: 18% ██░░░░░░░░ | Signal: Strong          │  │   (Low battery)
│  │    Apple Watch Series 8                               │  │
│  │    ⚠️ LOW BATTERY - Charge recommended                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ❌ Bob Johnson                                        │  │ ← Red X = critical issue
│  │    Battery: 67% ██████░░░░ | Signal: N/A             │  │   (Charging)
│  │    Samsung Galaxy S23                                 │  │
│  │    🔌 DEVICE CHARGING - Not worn or monitored         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [ Refresh Scan ]                                            │ ← Secondary action button
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  ⚠️  Issues Detected                                         │ ← Warning section
│                                                               │
│  • Jane Smith: Low battery (18%) - charging recommended      │
│  • Bob Johnson: Device charging - not worn                   │
│                                                               │
│  Starting navigation with these issues increases MOB         │
│  detection failure risk. Address issues before departing.    │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  [ Start Navigation Anyway ]     [ Cancel ]                  │ ← Action buttons
│    ↑ Orange (caution)              ↑ Gray (cancel)           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Visual Design (All Crew OK - Green State)

```
┌─────────────────────────────────────────────────────────────┐
│  ✕                                                           │
│                                                               │
│        🛟 Pre-Departure Safety Check                         │
│                                                               │
│  All crew devices ready for departure                        │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Crew Roster (Auto-Discovered)                               │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ John Doe                                           │  │
│  │    Battery: 85% ████████░░ | Signal: Strong          │  │
│  │    iPhone 13 Pro                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ Jane Smith                                         │  │
│  │    Battery: 92% █████████░ | Signal: Strong          │  │
│  │    Apple Watch Series 8                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ Bob Johnson                                        │  │
│  │    Battery: 67% ██████░░░░ | Signal: Strong          │  │
│  │    Samsung Galaxy S23                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [ Refresh Scan ]                                            │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  ✅ All Checks Passed                                        │ ← Success banner
│                                                               │
│  All crew devices detected, charged, and ready for           │
│  monitoring. Safe to start navigation session.               │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│             [ Start Navigation Session ]                     │ ← Primary action (green)
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Specifications

**Crew Member Card States:**

| Status | Icon | Card Border | Background | Text Color |
|--------|------|-------------|------------|------------|
| **All OK** | ✅ | None | White (day) / Dark (night) | Default |
| **Low Battery** | ⚠️ | 2px yellow | Light yellow tint | Default |
| **Critical Issue** | ❌ | 2px red | Light red tint | Default |
| **Below Deck** | 🔵 | 2px blue | Light blue tint | Default |
| **Logged Out** | 💤 | 2px gray | Light gray tint | Muted |

**Touch Targets:**
- Card tap: Show device details (battery history, last seen timestamp)
- Refresh Scan: Re-run BLE discovery (2-second scan)
- Start Navigation Anyway: Confirm override with dialog
- Cancel: Close safety check, return to dashboard

**Battery Display:**
- Visual bar: 10 segments (each 10%)
- Color coding: Green (>50%), Yellow (20-50%), Red (<20%)
- Charging indicator: ⚡ icon next to percentage

**Signal Strength:**
- Strong (>-60 dBm): "Strong"
- Medium (-60 to -75 dBm): "Medium"
- Weak (<-75 dBm): "Weak" (possible below deck)
- N/A: "No Signal" (device not responding)

---

### 2. Crew Roster Display (HeaderBar Integration)

**Purpose:** Show real-time crew monitoring status during Navigation Session

**Layout:** Integrated into existing HeaderBar component

#### Visual Design (HeaderBar with Crew Status)

```
Normal HeaderBar (Before MOB Integration):
┌─────────────────────────────────────────────────────────────┐
│ [☰] Connection: WiFi ● Connected         [Settings ⚙]      │
└─────────────────────────────────────────────────────────────┘

Enhanced HeaderBar (With MOB Monitoring):
┌─────────────────────────────────────────────────────────────┐
│ [☰] Connection: WiFi ● Connected   [👥 3/3] [Settings ⚙]   │
│                                      ↑                       │
│                                Crew Status Icon              │
└─────────────────────────────────────────────────────────────┘

Crew Status Icon States:
  [👥 3/3]  ← Green background (all crew OK)
  [👥 2/3]  ← Yellow background (1 crew weak signal / below deck)
  [👥 ⚠️]   ← Red background (MOB alert active)
  [👥 --]   ← Gray (monitoring inactive / no crew)
```

#### Expanded Crew Roster (Dropdown)

**Trigger:** Tap on crew status icon in HeaderBar

```
┌─────────────────────────────────────────────────────────────┐
│ [☰] Connection: WiFi ● Connected   [👥 2/3] [Settings ⚙]   │ ← HeaderBar
└─────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────┐
  │  Crew Monitoring: Active                    [✕ Close]  │  ← Dropdown panel
  ├─────────────────────────────────────────────────────────┤
  │                                                         │
  │  ✅ John Doe           85% ████████░░  Strong          │  ← Active crew
  │                        Last seen: Just now              │
  │                                                         │
  │  ✅ Jane Smith         92% █████████░  Strong          │
  │                        Last seen: Just now              │
  │                                                         │
  │  🔵 Bob Johnson        67% ██████░░░░  Weak            │  ← Below deck
  │                        Last seen: 3 sec ago             │
  │                        ℹ️ Possibly below deck            │
  │                                                         │
  │  [ View Safety Check ]   [ Settings ]                  │  ← Actions
  │                                                         │
  └─────────────────────────────────────────────────────────┘
```

#### Interaction Specifications

**Crew Status Icon:**
- **Display format:** `[👥 X/Y]` where X = active crew, Y = total crew
- **Color coding:**
  - Green: All crew active and in range
  - Yellow: 1+ crew with weak signal or below deck
  - Red: MOB alert triggered
  - Gray: Monitoring inactive

**Dropdown Panel:**
- **Trigger:** Tap crew status icon
- **Dismiss:** Tap outside panel, tap Close (✕), or tap icon again
- **Auto-refresh:** Update every 2 seconds while open
- **Scroll:** If >5 crew members, panel scrolls vertically

**Crew Member Row (in Dropdown):**
- **Name:** Crew member name (from Tag App)
- **Battery:** Percentage + visual bar
- **Signal:** Strength indicator (Strong/Medium/Weak)
- **Last Seen:** Timestamp (Just now, 3 sec ago, 10 sec ago, etc.)
- **Status note:** Below deck, logged out, low battery

---

### 3. MOB Alert Screen

**Purpose:** Full-screen critical alert when crew member falls overboard

**Layout:** Modal overlay (blocks all interaction with dashboard)

#### Visual Design (MOB Emergency Alert)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                                                               │
│                    🚨 MAN OVERBOARD 🚨                        │ ← 32px bold, red
│                                                               │
│                                                               │
│                      JOHN DOE                                 │ ← 28px bold, white
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  📍 Detection Details                                         │ ← 18px semibold
│                                                               │
│  Time:     10:34:12 AM                                        │ ← 16px monospace
│  Position: 37.7749°N, 122.4194°W                             │
│  Course:   180° (S)                                           │
│  Speed:    5.2 knots                                          │
│  Detection: 3 missed pings (1.2 seconds)                     │
│  Signal:   Sudden loss (high confidence)                     │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  📌 Estimated MOB Location                                    │ ← 18px semibold
│                                                               │
│  Coordinates: 37.7745°N, 122.4198°W                          │ ← 16px monospace
│  Distance:    0.02 NM astern                                  │
│  Bearing:     000° (N)                                        │
│                                                               │
│  ⓘ Based on 1.2-second detection delay                       │ ← 14px muted
│     Speed: 5.2 knots, Course: 180°                           │
│     Distance traveled: ~23 feet                               │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  🎯 Autopilot Status                                          │ ← 18px semibold
│                                                               │
│  [■] MOB PATTERN ACTIVE                                       │ ← Status indicator
│                                                               │
│  Turning to reciprocal heading (000°)...                     │ ← 16px
│  ETA to MOB position: 2 minutes                               │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Actions:                                                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          📍 Mark Waypoint (MOB-John-1034)           │    │ ← 60px tall button
│  └─────────────────────────────────────────────────────┘    │   Green
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          ✕ Dismiss (False Alarm)                    │    │ ← 60px tall button
│  └─────────────────────────────────────────────────────┘    │   Orange
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          📞 Call Emergency Services                  │    │ ← 60px tall button
│  └─────────────────────────────────────────────────────┘    │   Red
│                                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Background: Solid red (#D32F2F) with 90% opacity
Text: White for high contrast
Animations: Pulsing border effect, attention-grabbing
Sound: Critical alarm (3-tone siren, repeating)
Vibration: Continuous strong pattern
```

#### Visual Design (False Alarm Resolved)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                    ✅ False Alarm Dismissed                   │ ← Green banner
│                                                               │
│  John Doe - MOB alert at 10:34:12 AM                         │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  This MOB event has been marked as a false alarm.            │
│  Monitoring continues for all crew members.                  │
│                                                               │
│  Autopilot: Returning to original course (180°)              │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│                    [ Return to Dashboard ]                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Auto-dismiss after 5 seconds
Background: Solid green (#388E3C) with 90% opacity
```

#### Interaction Specifications

**Alert Behavior:**
- **Trigger:** BLE signal lost for >10 seconds during Navigation Session
- **Display:** Full-screen modal, blocks all other interaction
- **Sound:** 3-tone siren pattern, repeating every 3 seconds
- **Vibration:** Continuous strong pattern (200ms on, 100ms off)
- **Auto-silence:** Sound/vibration stop after 30 seconds (visual alert remains)
- **Cannot dismiss accidentally:** Requires explicit button tap

**Action Buttons:**
- **Mark Waypoint:** Creates MOB waypoint with timestamp and position
  - Waypoint name format: `MOB-{Name}-{HHMM}`
  - Saves to navigation history
  - Can be marked multiple times (MOB-John-1034, MOB-John-1035, etc.)

- **Dismiss (False Alarm):**
  - Shows confirmation dialog: "Confirm this is a false alarm?"
  - On confirm: Resolves MOB event, stops alarm, returns to dashboard
  - Event logged in MOB history as "False Alarm"

- **Call Emergency Services:**
  - Opens phone dialer with emergency number (based on region)
  - Pre-fills with vessel position and MOB details
  - Continues to display MOB screen in background

**Autopilot Integration (Phase 4):**
- If autopilot available and MOB pattern supported:
  - Automatically trigger MOB rescue pattern
  - Display autopilot status and ETA
- If autopilot not available:
  - Show manual instructions: "Turn to reciprocal heading, reduce speed"

---

### 4. Tag App UI (Crew Device)

**Purpose:** Lightweight app for crew smartphones/watches to broadcast presence

**Layout:** Single-screen app with minimal controls

#### Visual Design (Tag App Main Screen)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                   🛟 MOB Tag App                              │ ← Title
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  👤 Crew Member                                               │ ← Section
│                                                               │
│  Name: John Doe                                [Edit]        │
│  Device: iPhone 13 Pro                                       │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  📡 Monitoring Status                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         ✅ ACTIVE & MONITORED                       │    │ ← Status card
│  │                                                     │    │   Green background
│  │    Broadcasting to Boating Instruments App         │    │
│  │    Connected to: "Vessel Name" or "iPad Pro"       │    │
│  │                                                     │    │
│  │    Battery: 85% ████████░░                         │    │
│  │    Last seen: Just now                              │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Quick Actions:                                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         💤 Temporary Logout                          │    │ ← 60px button
│  │    (Going below deck, kayaking, etc.)               │    │   Blue
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         ℹ️ About MOB Detection                       │    │ ← 60px button
│  └─────────────────────────────────────────────────────┘    │   Gray
│                                                               │
│                                                               │
│  ⓘ Keep this app running in background for safety           │ ← Info banner
│     monitoring. Do not force-quit the app.                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Visual Design (Tag App - Charging Warning)

```
┌─────────────────────────────────────────────────────────────┐
│                   🛟 MOB Tag App                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  👤 Crew Member                                               │
│  Name: John Doe                                [Edit]        │
│  Device: iPhone 13 Pro                                       │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  📡 Monitoring Status                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         ⚠️ MONITORING PAUSED                        │    │ ← Status card
│  │                                                     │    │   Orange background
│  │    ⚡ Device is charging                            │    │
│  │                                                     │    │
│  │    ⚠️ You are NOT being monitored while charging   │    │
│  │                                                     │    │
│  │    Unplug device and wear it to resume monitoring  │    │
│  │                                                     │    │
│  │    Battery: 67% ██████░░░░ (Charging)              │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  🔔 Notification                                              │
│                                                               │
│  When battery reaches 80%, you'll receive a notification    │
│  reminder to unplug and resume monitoring.                   │
│                                                               │
│  [ Notify at 80% ]  ✓ Enabled                                │ ← Toggle setting
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Visual Design (Tag App - Temporary Logout)

```
Temporary Logout Dialog (appears when "Temporary Logout" tapped):

┌─────────────────────────────────────────────────────────────┐
│                                                               │
│            💤 Temporary Logout                                │ ← Title
│                                                               │
│  Pause MOB monitoring for a specific activity                │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Duration:                                                    │
│                                                               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ 15 min │ │ 30 min │ │ 1 hour │ │ Custom │               │ ← Duration chips
│  └────────┘ └────────┘ └────────┘ └────────┘               │   (tap to select)
│      ↑                                                        │
│   Selected (blue outline)                                    │
│                                                               │
│  Reason (optional):                                          │
│                                                               │
│  ┌────────────────┐ ┌────────────────┐                      │
│  │ Below Deck     │ │ Kayaking       │                      │ ← Reason chips
│  └────────────────┘ └────────────────┘                      │
│  ┌────────────────┐ ┌────────────────┐                      │
│  │ Swimming       │ │ Other          │                      │
│  └────────────────┘ └────────────────┘                      │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  ⚠️ Monitoring will automatically resume after 15 minutes   │ ← Info banner
│                                                               │
│  [ Start Logout ]                [ Cancel ]                  │ ← Actions
│                                                               │
└─────────────────────────────────────────────────────────────┘

After logout starts:

┌─────────────────────────────────────────────────────────────┐
│                   🛟 MOB Tag App                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  📡 Monitoring Status                                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         💤 LOGGED OUT                               │    │ ← Status card
│  │                                                     │    │   Gray background
│  │    Monitoring paused - Below Deck                  │    │
│  │                                                     │    │
│  │    ⏱️ Time remaining: 14:32                         │    │ ← Countdown timer
│  │                                                     │    │
│  │    Auto-resume at: 10:49 AM                        │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         ✓ Resume Monitoring Now                     │    │ ← 60px button
│  └─────────────────────────────────────────────────────┘    │   Green
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Interaction Specifications

**Tag App States:**

| State | Status Card Color | Icon | Message |
|-------|------------------|------|---------|
| **Active & Monitored** | Green (#4CAF50) | ✅ | "Active & Monitored - Broadcasting" |
| **Not Connected** | Gray (#9E9E9E) | ⚠️ | "Not connected to Boating Instruments App" |
| **Charging** | Orange (#FF9800) | ⚡ | "Monitoring paused - Device charging" |
| **Logged Out** | Gray (#9E9E9E) | 💤 | "Logged out - {Reason}" |
| **Low Battery** | Red (#F44336) | 🔋 | "Low battery - Charge soon" |

**Notifications:**
- **Charging detected:** "⚠️ Monitoring paused - You are NOT being monitored while charging"
- **80% charged:** "🔋 Battery charged to 80% - Safe to unplug and resume monitoring"
- **Logout expiring soon:** "⏱️ Monitoring will resume in 2 minutes"
- **Logout auto-resumed:** "✅ Monitoring resumed - You are being monitored again"

---

### 5. Settings Integration

**Purpose:** MOB detection settings within Boating Instruments App hamburger menu

#### Visual Design (Settings - MOB Detection Section)

```
Hamburger Menu → Settings → MOB Detection

┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                  │ ← Back button
│                                                               │
│  🛟 MOB Detection                                            │ ← Section title
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  General Settings                                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Enable MOB Detection                                │    │ ← Toggle switch
│  │                                              [ON ✓] │    │   (Green when ON)
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Missed Ping Threshold                               │    │ ← Dropdown
│  │ Consecutive pings before MOB alert      [3 pings]  │    │
│  └─────────────────────────────────────────────────────┘    │
│    Options: 2 pings (600ms), 3 pings (900ms-1.5s), 4 pings (1.2-2s), 5 pings (1.5-2.5s) │
│                                                               │
│  ⓘ Lower = faster detection, higher = fewer false alarms    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Below Deck RSSI Threshold                           │    │ ← Slider
│  │ Signal strength for below-deck detection            │    │
│  │                                                     │    │
│  │    Strong  ─────●─────────────  Weak               │    │
│  │              -75 dBm                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Phase 2: Accelerometer Fall Detection                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Fall Detection (Phase 2)                            │    │ ← Toggle switch
│  │ Use accelerometer for sub-second alerts            │    │   (Future)
│  │                                             [OFF  ] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ⓘ When enabled, Tag App uses accelerometer to detect       │
│     sudden falls. Provides 400-500ms detection vs 900ms.     │
│     May increase false positives.                            │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Alert Settings                                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Sound Alarm                                         │    │ ← Toggle switch
│  │                                              [ON ✓] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Vibration                                           │    │ ← Toggle switch
│  │                                              [ON ✓] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Autopilot MOB Pattern (Phase 4)                     │    │ ← Toggle switch
│  │ Trigger automatic rescue pattern                   │    │   (Disabled if no
│  │                                             [OFF  ] │    │    autopilot)
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  Safety Check Settings                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Require Safety Check Before Navigation             │    │ ← Toggle switch
│  │                                              [ON ✓] │    │   (Recommended ON)
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Minimum Battery Level                               │    │ ← Dropdown
│  │ Warn if crew device below threshold      [20%]     │    │
│  └─────────────────────────────────────────────────────┘    │
│    Options: 10%, 15%, 20%, 25%, 30%                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Allow Captain Override                              │    │ ← Toggle switch
│  │ Start navigation despite safety issues             │    │
│  │                                              [ON ✓] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  [ Test MOB Alert ]                                          │ ← Test button
│                                                               │
│  Trigger a test MOB alert to verify sound, vibration,       │
│  and screen display.                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Theme Integration

### Day Theme (Default)

**Colors:**
- Background: White (#FFFFFF)
- Text: Dark Gray (#212121)
- Success (All OK): Green (#4CAF50)
- Warning (Low Battery): Orange (#FF9800)
- Critical (MOB Alert): Red (#D32F2F)
- Info (Below Deck): Blue (#2196F3)

### Night Theme

**Colors:**
- Background: Dark Gray (#212121)
- Text: Light Gray (#E0E0E0)
- Success: Green (#66BB6A)
- Warning: Orange (#FFA726)
- Critical: Red (#EF5350)
- Info: Blue (#42A5F5)

### Red-Night Theme (Marine Compliant)

**Colors:**
- Background: Very Dark Red (#1A0000)
- Text: Soft Red (#FF6B6B)
- Success: Dark Green (#2E7D32) (reduced intensity)
- Warning: Dark Orange (#E65100) (reduced intensity)
- Critical: Bright Red (#FF1744) (high visibility for emergency)
- Info: Dark Blue (#1565C0) (reduced intensity)

**MOB Alert Special Case:**
- Even in red-night mode, MOB alert uses bright red background (#D32F2F)
- Safety-critical > night vision preservation

---

## Accessibility Specifications

### Screen Reader Support

**Pre-Departure Safety Check:**
- "Pre-Departure Safety Check. 3 crew members detected."
- "John Doe: Battery 85%, signal strong, all OK"
- "Jane Smith: Battery 18%, signal strong, low battery warning"
- "Bob Johnson: Device charging, not monitored, critical issue"
- "Issues detected: 2. Tap for details."
- "Start navigation anyway button. Caution: safety issues detected."

**Crew Roster (HeaderBar):**
- "Crew monitoring: 3 of 3 active. All crew OK."
- "Crew monitoring: 2 of 3 active. 1 crew member below deck or weak signal."
- "Man overboard alert. Critical emergency."

**MOB Alert Screen:**
- "Critical alert: Man overboard. John Doe. Detected at 10:34 AM."
- "Mark waypoint button. Creates MOB waypoint with timestamp."
- "Dismiss false alarm button. Caution: only use if this is not a real emergency."
- "Call emergency services button. Opens phone dialer."

### Touch Target Sizes

**Minimum Sizes (WCAG 2.1 AAA):**
- Primary actions: 60px × 60px minimum
- Secondary actions: 48px × 48px minimum
- Toggle switches: 48px × 32px minimum
- Card taps: Entire card is tappable

**MOB Alert Screen:**
- All action buttons: 60px tall × full width
- Large touch targets for emergency scenarios (gloves, wet hands, panic)

### Color Contrast

**WCAG 2.1 AAA Compliance:**
- Text on background: 7:1 minimum ratio
- Critical alerts: Red background (#D32F2F) + White text = 8.2:1 ratio
- Success messages: Green background (#4CAF50) + White text = 4.6:1 ratio (AA)
- Warning messages: Orange background (#FF9800) + Black text = 6.4:1 ratio

---

## Animation and Feedback

### MOB Alert Animations

**Pulsing Border Effect:**
```css
@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 20px rgba(211, 47, 47, 0.8); }
  50% { box-shadow: 0 0 40px rgba(211, 47, 47, 1.0); }
}
Animation duration: 1.5 seconds, infinite loop
```

**Attention-Grabbing Header:**
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
Animation duration: 0.5 seconds, play 3 times then stop
```

### Crew Status Transitions

**Crew Member Card State Changes:**
- Fade transition: 200ms ease-in-out
- Border color change: 300ms ease
- Background color change: 300ms ease

**HeaderBar Crew Icon:**
- Color change: 300ms ease
- Number update: No animation (instant)
- Icon bounce on MOB alert: 3× bounce over 1 second

---

## Error States and Edge Cases

### No Crew Devices Detected

```
┌─────────────────────────────────────────────────────────────┐
│        🛟 Pre-Departure Safety Check                         │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  ⚠️ No Crew Devices Detected                                 │
│                                                               │
│  No Tag App devices found in range.                          │
│                                                               │
│  Make sure:                                                  │
│  • Tag App is installed on crew smartphones/watches         │
│  • Bluetooth is enabled on all devices                      │
│  • Crew members are within 50 feet                          │
│  • Tag App is running in background                         │
│                                                               │
│  [ Refresh Scan ]                                            │
│                                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                               │
│  ⓘ Solo sailing? You can start navigation without crew      │
│     monitoring, but MOB detection will not be active.        │
│                                                               │
│  [ Start Without MOB Monitoring ]    [ Cancel ]              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Bluetooth Disabled

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Bluetooth Disabled                                        │
│                                                               │
│  MOB detection requires Bluetooth to monitor crew devices.  │
│                                                               │
│  [ Open Bluetooth Settings ]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Permissions Denied

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Bluetooth Permission Required                            │
│                                                               │
│  MOB detection needs Bluetooth access to monitor crew       │
│  proximity. This is essential for safety.                    │
│                                                               │
│  Why this permission is needed:                              │
│  • Detect when crew members fall overboard                  │
│  • Monitor crew device battery levels                        │
│  • Verify crew presence before departure                    │
│                                                               │
│  [ Grant Permission ]                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## User Education

### First-Time Setup Wizard (Tag App)

**Screen 1: Welcome**
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                   Welcome to MOB Tag                          │
│                                                               │
│                       🛟                                      │
│                                                               │
│  This app helps detect man overboard situations by           │
│  monitoring your proximity to the boat.                      │
│                                                               │
│  How it works:                                               │
│  • Your device broadcasts a "I'm here" signal                │
│  • The Boating Instruments App monitors the signal          │
│  • If signal lost for 10 seconds → MOB alert                │
│                                                               │
│                    [ Get Started ]                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Screen 2: Name Entry**
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                 What's your name?                            │
│                                                               │
│  This helps identify you in MOB alerts.                      │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Your Name                                             │  │ ← Text input
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  Examples: "John Doe", "Captain Sarah", "Skipper"           │
│                                                               │
│                      [ Continue ]                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Screen 3: Permissions**
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│              Permissions Needed                              │
│                                                               │
│  MOB Tag needs these permissions to work:                    │
│                                                               │
│  📡 Bluetooth                                                │
│     Broadcast your presence to the boat                      │
│                                                               │
│  🔔 Notifications                                            │
│     Alert you when charging or logged out                    │
│                                                               │
│  🔋 Background Activity                                       │
│     Continue broadcasting when app is backgrounded           │
│                                                               │
│                [ Grant Permissions ]                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Screen 4: Setup Complete**
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                   ✅ Setup Complete!                          │
│                                                               │
│  You're now being monitored for safety.                     │
│                                                               │
│  Important reminders:                                        │
│  • Keep this app running in background                      │
│  • Don't force-quit the app                                 │
│  • Charge device before boating trips                       │
│  • Wear device at all times on deck                         │
│                                                               │
│                   [ Start Monitoring ]                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### UI Responsiveness

**Pre-Departure Safety Check:**
- Initial scan: 2-second BLE discovery
- Refresh scan: 2-second BLE discovery
- Crew card rendering: <16ms per card (60 FPS)
- Battery bar animation: Hardware-accelerated (GPU)

**Crew Roster Dropdown:**
- Open animation: 200ms ease-out
- Close animation: 150ms ease-in
- Update frequency: Every 2 seconds (while open)
- Smooth scroll: RecyclerView (Android) / UITableView (iOS)

**MOB Alert Screen:**
- Trigger latency: <100ms after MOB detection
- Animation performance: 60 FPS minimum (pulsing, shaking)
- Sound latency: <50ms
- Vibration latency: Immediate

### Memory Footprint

**Tag App:**
- Base memory: 20-30 MB
- BLE advertising: +5-10 MB
- Background mode: 30-40 MB total

**Boating Instruments App (MOB feature):**
- mobStore: 1-2 MB (10 crew members)
- BLE scanning: +10-15 MB
- UI components: +5-10 MB
- Total overhead: 15-30 MB

---

## Testing Checklist

### Visual QA

- [ ] All screens render correctly in portrait and landscape
- [ ] Day/Night/Red-Night themes applied correctly
- [ ] Color contrast meets WCAG 2.1 AAA standards
- [ ] Touch targets meet 60px × 60px minimum (critical actions)
- [ ] Fonts render clearly at all sizes
- [ ] Icons aligned and visually balanced
- [ ] Animations smooth (60 FPS)

### Functional QA

- [ ] Pre-Departure Safety Check detects all crew devices
- [ ] Battery levels display accurately
- [ ] Signal strength indicators match RSSI values
- [ ] Crew roster updates in real-time (2-second intervals)
- [ ] MOB alert triggers within 10 seconds of signal loss
- [ ] Sound and vibration work on MOB alert
- [ ] False alarm dismissal resolves event correctly
- [ ] Temporary logout pauses monitoring
- [ ] Auto-resume after logout duration works
- [ ] Charging warning appears immediately
- [ ] Settings changes persist across app restarts

### Accessibility QA

- [ ] Screen reader announces all elements correctly
- [ ] All actions accessible via keyboard (desktop)
- [ ] Focus indicators visible and clear
- [ ] Color is not the only indicator (icons + text)
- [ ] Animations can be disabled (iOS Reduce Motion)

### Cross-Platform QA

- [ ] iOS Tag App ↔ iOS Boating Instruments App
- [ ] iOS Tag App ↔ Android Boating Instruments App
- [ ] Android Tag App ↔ iOS Boating Instruments App
- [ ] Android Tag App ↔ Android Boating Instruments App
- [ ] iPhone, iPad, Android phone, Android tablet form factors
- [ ] Apple Watch, Wear OS smartwatch compatibility

---

## Implementation Priority

### Phase 1: MVP (4-6 weeks)

**Must-Have UI:**
1. Pre-Departure Safety Check Screen ✓
2. Crew Roster Display (HeaderBar) ✓
3. MOB Alert Screen (basic) ✓
4. Tag App Main Screen ✓
5. Settings (basic toggles) ✓

**Can Defer:**
- Temporary logout workflow (manual only)
- Advanced settings (use defaults)
- User education wizard (basic instructions)

---

### Phase 2: Enhanced Safety (3-4 weeks)

**Add:**
1. Temporary logout UI (Tag App)
2. Charging warning screens
3. Below-deck signal strength indicators
4. Advanced settings (timeout, RSSI threshold)
5. User education wizard (Tag App)

---

### Phase 3: Production Polish (4-6 weeks)

**Add:**
1. Onboarding tutorials
2. In-app help and tooltips
3. MOB event history viewer
4. Test MOB alert button
5. Accessibility refinements
6. Animation polish and microinteractions

---

## Appendix

### Design Assets

**Icons Required:**
- 🛟 Lifebuoy (MOB detection)
- 👥 Crew members
- 📡 Broadcasting / signal
- 🔋 Battery levels
- ⚡ Charging
- 💤 Logged out / sleeping
- ✅ Success / all OK
- ⚠️ Warning
- ❌ Error / critical
- 🔵 Info / below deck
- 📍 Waypoint / location
- 📞 Phone / emergency
- ⏱️ Timer / countdown

**Color Palette:**
```
Success Green:   #4CAF50 (day), #66BB6A (night)
Warning Orange:  #FF9800 (day), #FFA726 (night)
Critical Red:    #D32F2F (day), #EF5350 (night)
Info Blue:       #2196F3 (day), #42A5F5 (night)
Background:      #FFFFFF (day), #212121 (night), #1A0000 (red-night)
Text:            #212121 (day), #E0E0E0 (night), #FF6B6B (red-night)
```

---

*Document Version: 1.0*
*Last Updated: 2025-10-16*
*Author: Winston (Architect - UX Design Mode)*
