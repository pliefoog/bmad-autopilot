# Maritime Alarm Audio Standards

## ISO and USCG Conventions

### Standard Alarm Patterns (ISO 9692, IEC 60092-504)

**Priority 1 - Navigation Safety (Immediate Danger)**
- Pattern: Continuous (uninterrupted tone)
- Frequency: 400-800 Hz
- Use: Collision, grounding, fire
- Example: Shallow Water

**Priority 2 - Navigation Alert (Attention Required)**
- Pattern: 2 short + 1 long (·· —)
- Frequency: 800-1200 Hz
- Use: Autopilot failure, navigation system loss
- Morse: "U" for "You are running into danger"

**Priority 3 - Equipment Warning**
- Pattern: Single pulse repeating
- Frequency: 600-900 Hz
- Use: Engine overheat, mechanical issues

**Priority 4 - General Alert**
- Pattern: Triple pulse
- Frequency: 400-600 Hz
- Use: Low battery, general warnings

**Priority 5 - Information**
- Pattern: Intermittent (long on, short off)
- Frequency: 300-500 Hz
- Use: GPS loss (informational before critical)

### Frequency Allocation
- **800 Hz**: Navigation hazards (shallow water)
- **1000 Hz**: Autopilot/steering (Morse "U" pattern)
- **1200 Hz**: Engine/mechanical (warble)
- **600 Hz**: Electrical/power (intermittent)
- **900 Hz**: GPS/communications (descending)

### Pattern Timing Standards
- **Continuous**: No breaks
- **Rapid Pulse**: 4-6 Hz (urgent)
- **Morse "U"**: 0.2s short, 0.6s long, 0.2s gap
- **Warble**: 2-4 Hz modulation
- **Triple Blast**: 3x 0.2s with 0.1s gaps, 1.5s pause
- **Intermittent**: 0.8s on, 0.4s off

## Implementation Mapping

### Visual Alarm Standards (Red-Night Mode Compliance)

**CRITICAL:** Visual alarms must preserve scotopic vision for safe night navigation.

**Night Vision Requirements:**
- **Wavelength Range:** 625-750nm (red spectrum only) in red-night mode
- **Zero Blue/Green:** No wavelengths <620nm that bleach rhodopsin
- **Brightness Control:** Maximum 5% screen brightness, 2 cd/m² luminance (IMO SOLAS)
- **Animation Over Color:** Use pulse/flicker patterns for alarm differentiation when color unavailable

**See:** [marine-night-vision-standards.md](marine-night-vision-standards.md) for comprehensive scientific foundation, USCG/IMO compliance standards, and implementation guidelines.

**Visual Alarm Hierarchy (Red-Night Compliant):**
- **Critical:** Rapid flicker (300ms) + bright red (#FCA5A5) - maximum contrast
- **Warning:** Gentle pulse (1.5s) + medium red (#DC2626) - attention without panic
- **Caution:** Steady glow + dark red (#991B1B) - persistent notification
- **Info:** No animation + theme red - passive information

### Audio-Visual Integration

| Alarm Type | Priority | Pattern | Frequency | Rationale |
|------------|----------|---------|-----------|-----------|
| Shallow Water | 1 | Rapid Pulse | 800 Hz | Immediate grounding danger - highest priority |
| Autopilot Failure | 2 | Morse "U" (2+1) | 1000 Hz | Navigation safety - "You are in danger" |
| Engine Overheat | 3 | Warble | 1200 Hz | Mechanical warning - distinctive modulation |
| Low Battery | 4 | Triple Blast | 600 Hz | Power system - general alert |
| GPS Loss | 5 | Descending | 900 Hz | Information/attention - signal degradation |

## Non-Overlapping Design

Each alarm has a unique combination of:
1. **Frequency** (50-200 Hz separation)
2. **Pattern** (rhythmically distinct)
3. **Tempo** (different pulse rates)

This ensures simultaneous alarms are distinguishable even in noisy marine environments.
