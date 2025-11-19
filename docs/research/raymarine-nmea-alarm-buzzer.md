# Raymarine NMEA Buzzer & Alarm Implementation Research

**Date:** November 19, 2025  
**Purpose:** Investigation of Raymarine NMEA-connected buzzer functionality and message protocols for marine alarm systems

## Overview

Raymarine marine electronics systems support both **NMEA 0183** and **NMEA 2000** protocols for alarm signaling and buzzer control. This document outlines the message formats and protocols used to trigger audible alerts on Raymarine equipment across both standards.

## Table of Contents
- [NMEA 0183 Protocol](#nmea-0183-protocol)
- [NMEA 2000 Protocol](#nmea-2000-protocol)
- [Protocol Comparison](#protocol-comparison)
- [Implementation Recommendations](#implementation-recommendations)

---

---

## NMEA 0183 Protocol

### Key NMEA Sentences for Alarms

#### 1. ALR - Set Alarm State (NMEA 0183 Standard)

The `ALR` sentence is the primary NMEA 0183 standard sentence for communicating alarm conditions.

**Format:**
```
$--ALR,hhmmss.ss,xxx,A,A,c--c*hh<CR><LF>
```

**Fields:**
1. **UTC Time** - `hhmmss.ss` - Time of alarm condition
2. **Local Alarm Number** - `xxx` - Device-specific alarm identifier (001-999)
3. **Alarm Condition** - `A/V` - A = Alarm acknowledged, V = Alarm not acknowledged
4. **Alarm State** - `A/V` - A = Alarm active, V = Alarm silenced/inactive  
5. **Alarm Description** - `c--c` - Text description of alarm condition
6. **Checksum** - `*hh` - Standard NMEA checksum

**Example:**
```nmea
$IIALR,120000.00,001,V,A,SHALLOW WATER*4E
$IIALR,120030.00,002,V,A,ENGINE OVERHEAT*52
$IIALR,120100.00,003,A,V,LOW BATTERY*3D
```

**Talker ID:** Typically `$II` (Integrated Instrumentation) for Raymarine systems

#### 2. AKD - Acknowledge Alarm (NMEA 0183)

Used to acknowledge an active alarm condition.

**Format:**
```
$--AKD,hhmmss.ss,xxx*hh<CR><LF>
```

**Fields:**
1. **UTC Time** - Time of acknowledgment
2. **Local Alarm Number** - Alarm being acknowledged
3. **Checksum**

**Example:**
```nmea
$IIAKD,120045.00,001*3A
```

### 3. ALA - Set Alarm Condition (NMEA 0183)

Used to configure alarm thresholds and conditions.

**Format:**
```
$--ALA,hhmmss.ss,xxx,A,c--c*hh<CR><LF>
```

**Fields:**
1. **UTC Time**
2. **Local Alarm Number**
3. **Alarm State** - A = Active, V = Inactive
4. **Alarm Description**
5. **Checksum**

## Raymarine-Specific Implementation

### Alarm Priority Levels

Raymarine systems typically implement a 3-level alarm priority system:

| Priority | Sound Pattern | Visual | NMEA Field 3 Value |
|----------|--------------|--------|-------------------|
| **CRITICAL** | Continuous rapid beeping | Red flashing | `V` (not acknowledged) |
| **WARNING** | Intermittent beeping | Yellow | `V` (not acknowledged) |
| **CAUTION** | Single beep | Amber | `V` (not acknowledged) |
| **ACKNOWLEDGED** | Silent | Displayed only | `A` (acknowledged) |

### Common Alarm Types and Numbers

Based on marine industry standards, typical alarm numbering:

| Alarm Number | Description | Priority | NMEA Description Field |
|--------------|-------------|----------|----------------------|
| 001 | Shallow Water (Depth) | CRITICAL | `SHALLOW WATER` |
| 002 | Anchor Drag | WARNING | `ANCHOR ALARM` |
| 003 | Off Course/XTE | WARNING | `OFF COURSE` |
| 004 | Arrival at Waypoint | CAUTION | `WAYPOINT ARRIVAL` |
| 005 | MOB (Man Overboard) | CRITICAL | `MAN OVERBOARD` |
| 010 | Autopilot Failure | CRITICAL | `AUTOPILOT FAIL` |
| 020 | Engine Overheat | CRITICAL | `ENGINE OVERHEAT` |
| 021 | Low Oil Pressure | CRITICAL | `LOW OIL PRESSURE` |
| 022 | Engine RPM High | WARNING | `HIGH RPM` |
| 030 | Low Battery Voltage | WARNING | `LOW BATTERY` |
| 031 | High Bilge Water | WARNING | `HIGH BILGE` |
| 040 | GPS Signal Loss | WARNING | `GPS LOST` |
| 041 | AIS Signal Loss | CAUTION | `AIS LOST` |
| 050 | Wind Speed High | WARNING | `HIGH WIND` |
| 051 | Wind Angle Shift | CAUTION | `WIND SHIFT` |

### Buzzer Control Sequence

**To trigger a Raymarine buzzer alarm:**

1. **Send ALR sentence with alarm active:**
   ```nmea
   $IIALR,120500.00,001,V,A,SHALLOW WATER*4E
   ```
   - Field 3 = `V` (not acknowledged) triggers audible alarm
   - Field 4 = `A` (alarm active) indicates current alarm state

2. **Buzzer will sound according to priority level**

3. **To silence buzzer (user acknowledgment):**
   ```nmea
   $IIAKD,120515.00,001*3B
   ```
   - Sends acknowledgment
   - Buzzer stops, visual alert continues

4. **To clear alarm completely:**
   ```nmea
   $IIALR,120520.00,001,A,V,SHALLOW WATER*4D
   ```
   - Field 3 = `A` (acknowledged)
   - Field 4 = `V` (alarm inactive/cleared)

### Integration with Other NMEA Sentences

Alarms often correlate with specific sensor data:

**Depth Alarm → DBT/DPT Sentences:**
```nmea
$SDDBT,3.5,f,1.1,M,0.6,F*0A    # Shallow depth reading
$IIALR,120500.00,001,V,A,SHALLOW WATER*4E  # Alarm triggered
```

**Autopilot Alarm → APB Sentence:**
```nmea
$GPAPB,V,V,0.00,R,N,V,V,000,M,DEST,000,M,000,M*43  # AP data invalid
$IIALR,120600.00,010,V,A,AUTOPILOT FAIL*52  # Alarm triggered
```

**Engine Alarm → XDR Sentence:**
```nmea
$IIXDR,C,95.0,C,ENGINE TEMP*3A  # High temperature reading
$IIALR,120700.00,020,V,A,ENGINE OVERHEAT*51  # Alarm triggered
```

#### 1. Alarm Manager Integration (NMEA 0183)

Create NMEA 0183 alarm message generator in `NmeaBridge`:

```typescript
interface NmeaAlarmMessage {
  alarmNumber: number;
  description: string;
  acknowledged: boolean;
  active: boolean;
  timestamp?: Date;
}

function generateALRSentence(alarm: NmeaAlarmMessage): string {
  const time = alarm.timestamp || new Date();
  const utc = formatNmeaTime(time);
  const num = String(alarm.alarmNumber).padStart(3, '0');
  const ack = alarm.acknowledged ? 'A' : 'V';
  const state = alarm.active ? 'A' : 'V';
  
  const sentence = `$IIALR,${utc},${num},${ack},${state},${alarm.description}`;
  const checksum = calculateNmeaChecksum(sentence);
  
  return `${sentence}*${checksum}\r\n`;
}
```

#### 2. Alarm Type Mapping (NMEA 0183)

Map BMad alarm types to NMEA 0183 alarm numbers:

```typescript
const ALARM_MAPPING = {
  'SHALLOW_WATER': { number: 1, description: 'SHALLOW WATER' },
  'ENGINE_OVERHEAT': { number: 20, description: 'ENGINE OVERHEAT' },
  'LOW_BATTERY': { number: 30, description: 'LOW BATTERY' },
  'AUTOPILOT_FAILURE': { number: 10, description: 'AUTOPILOT FAIL' },
  'GPS_LOSS': { number: 40, description: 'GPS LOST' },
};
```

#### 3. Alarm Broadcasting (NMEA 0183)

When CriticalAlarmManager detects alarm condition:

```typescript
// In CriticalAlarmManager
onAlarmStateChange(alarmType: AlarmType, state: AlarmState) {
  if (state.isActive && !state.isAcknowledged) {
    const nmeaMessage = generateALRSentence({
      alarmNumber: ALARM_MAPPING[alarmType].number,
      description: ALARM_MAPPING[alarmType].description,
      acknowledged: state.isAcknowledged,
      active: state.isActive,
    });
    
    // Broadcast via NMEA bridge
    nmeaBridge.sendMessage(nmeaMessage);
  }
}
```

#### 4. Testing with Raymarine Equipment (NMEA 0183)

**Test Scenario:**
1. Connect BMad app to WiFi bridge on NMEA network
2. Configure Raymarine MFD to receive alarm messages
3. Trigger shallow water alarm in BMad app
4. Verify Raymarine buzzer sounds
5. Acknowledge alarm in BMad
6. Send AKD sentence
7. Verify Raymarine buzzer stops

---

## NMEA 2000 Protocol

### Overview

NMEA 2000 is a CAN-based network standard that provides higher bandwidth and more structured messaging than NMEA 0183. For alarm/alert functionality, NMEA 2000 uses a comprehensive PGN (Parameter Group Number) system.

### Key PGNs for Alert/Alarm Messages

#### PGN 126983 - Alert

**Purpose:** Broadcast active alarm/alert conditions on the network

**Message Structure:**
- **PGN:** 126983 (0x1F007)
- **Format:** Fast-packet (multi-frame)
- **Length:** 28 bytes
- **Priority:** Typically 2-4 (high priority)
- **Transmission:** Event-driven (on alarm state change)

**Data Fields:**

| Field # | Field Name | Size | Description | Values |
|---------|------------|------|-------------|--------|
| 1 | Alert Type | 4 bits | Severity classification | 1=Emergency, 2=Alarm, 5=Warning, 8=Caution |
| 2 | Alert Category | 4 bits | System category | 0=Navigational, 1=Technical |
| 3 | Alert System | 8 bits | Major system identifier | Device-specific (0-255) |
| 4 | Alert Sub-System | 8 bits | Sub-system identifier | Device-specific (0-255) |
| 5 | Alert ID | 16 bits | Unique alert identifier | 0-65535 |
| 6 | Data Source Network ID | 64 bits | NAME of device generating alert | ISO 11783 NAME format |
| 7 | Data Source Instance | 8 bits | Instance of data source | 0-255 |
| 8 | Data Source Index | 8 bits | Index within instance | 0-255 |
| 9 | Alert Occurrence Number | 8 bits | Sequential occurrence counter | 0-255 |
| 10 | Temporary Silence Status | 1 bit | Buzzer temporarily silenced | 0=No, 1=Yes |
| 11 | Acknowledge Status | 1 bit | Alert acknowledged by user | 0=No, 1=Yes |
| 12 | Escalation Status | 1 bit | Alert has escalated | 0=No, 1=Yes |
| 13 | Temporary Silence Support | 1 bit | Device supports temp silence | 0=No, 1=Yes |
| 14 | Acknowledge Support | 1 bit | Device supports acknowledgment | 0=No, 1=Yes |
| 15 | Escalation Support | 1 bit | Device supports escalation | 0=No, 1=Yes |
| 16 | Reserved | 2 bits | Reserved for future use | - |
| 17 | Acknowledge Source NAME | 64 bits | Device that acknowledged alert | ISO 11783 NAME |
| 18 | Trigger Condition | 4 bits | How alert was triggered | 0=Manual, 1=Auto, 2=Test |
| 19 | Threshold Status | 4 bits | Relation to threshold | Various states |
| 20 | Alert Priority | 8 bits | Numeric priority value | 0-255 (higher = more urgent) |
| 21 | Alert State | 8 bits | Current state of alert | See Alert State table |

**Alert Type Values:**
```
1 = Emergency Alarm (immediate action required)
2 = Alarm (requires timely action)
5 = Warning (requires awareness/monitoring)
8 = Caution (informational, no immediate action)
```

**Alert Category Values:**
```
0 = Navigational (GPS, depth, collision, etc.)
1 = Technical (engine, electrical, system failures)
```

**Alert State Values:**
```
0 = Disabled
1 = Normal (no alarm)
2 = Active (alarm condition present)
3 = Silenced (acknowledged but still active)
4 = Acked (acknowledged and cleared)
5 = Test
```

**Example Alert Message (Shallow Water):**
```javascript
{
  pgn: 126983,
  alertType: 2,              // Alarm
  alertCategory: 0,          // Navigational
  alertSystem: 10,           // Depth sounder
  alertSubSystem: 0,
  alertId: 1,                // Shallow water
  dataSourceNetworkId: 0x1234567890ABCDEF,  // Device NAME
  dataSourceInstance: 0,
  dataSourceIndex: 0,
  alertOccurrenceNumber: 1,
  temporarySilenceStatus: 0, // Not silenced (buzzer ON)
  acknowledgeStatus: 0,      // Not acknowledged
  escalationStatus: 0,
  temporarySilenceSupport: 1,
  acknowledgeSupport: 1,
  escalationSupport: 0,
  triggerCondition: 1,       // Auto-triggered
  thresholdStatus: 2,        // Below threshold
  alertPriority: 200,        // High priority
  alertState: 2              // Active
}
```

#### PGN 126984 - Alert Response

**Purpose:** Send user response to an active alert (acknowledge, silence, etc.)

**Message Structure:**
- **PGN:** 126984 (0x1F008)
- **Format:** Fast-packet
- **Length:** 25 bytes
- **Priority:** 2-4 (high priority)
- **Transmission:** Event-driven (on user action)

**Data Fields:**

| Field # | Field Name | Size | Description |
|---------|------------|------|-------------|
| 1-9 | (Same as PGN 126983) | - | Identifies which alert is being responded to |
| 10 | Acknowledge Source NAME | 64 bits | Device sending the response |
| 11 | Response Command | 2 bits | Action being taken |
| 12 | Reserved | 6 bits | Reserved |

**Response Command Values:**
```
0 = Acknowledge (user has seen and acknowledged)
1 = Temporary Silence (silence buzzer temporarily)
2 = Test Command Off (cancel test mode)
3 = Test Command On (enter test mode)
```

**Example: Acknowledge Alarm**
```javascript
{
  pgn: 126984,
  alertType: 2,
  alertCategory: 0,
  alertSystem: 10,
  alertSubSystem: 0,
  alertId: 1,
  dataSourceNetworkId: 0x1234567890ABCDEF,
  dataSourceInstance: 0,
  dataSourceIndex: 0,
  alertOccurrenceNumber: 1,
  acknowledgeSourceName: 0xFEDCBA0987654321,  // MFD device
  responseCommand: 0  // Acknowledge
}
```

#### PGN 126985 - Alert Text

**Purpose:** Provide human-readable text description of alert

**Message Structure:**
- **PGN:** 126985 (0x1F009)
- **Format:** Fast-packet
- **Length:** Variable (minimum 17 bytes)
- **Transmission:** Sent after PGN 126983 to provide details

**Data Fields:**

| Field # | Field Name | Description |
|---------|------------|-------------|
| 1-9 | (Same as PGN 126983) | Alert identification |
| 10 | Language ID | Language of text (0=English US, 1=English UK, etc.) |
| 11 | Alert Text Description | Variable-length string describing alert |
| 12 | Alert Location Text | Variable-length string describing location |

**Example:**
```javascript
{
  pgn: 126985,
  alertId: 1,
  languageId: 0,  // English (US)
  alertTextDescription: "Depth below minimum safe depth",
  alertLocationText: "Forward depth sounder"
}
```

#### PGN 65288 - Raymarine/SeaTalk Proprietary Alarm (PGN 0xFF08)

**Purpose:** Raymarine-specific alarm message for SeaTalk ng (NMEA 2000) systems

**Message Structure:**
- **PGN:** 65288 (0xFF08)
- **Format:** Single-frame (8 bytes)
- **Manufacturer Code:** 1851 (Raymarine)
- **Industry Code:** 4 (Marine)

**Data Fields:**

| Field # | Field Name | Size | Values |
|---------|------------|------|--------|
| 1 | Manufacturer Code | 11 bits | 1851 (Raymarine) |
| 2 | Reserved | 2 bits | - |
| 3 | Industry Code | 3 bits | 4 (Marine) |
| 4 | SID | 8 bits | Sequence ID |
| 5 | Alarm Status | 8 bits | See SeaTalk alarm status table |
| 6 | Alarm ID | 8 bits | Raymarine-specific alarm code |
| 7 | Alarm Group | 8 bits | Alarm category grouping |
| 8 | Alarm Priority | 16 bits | Priority value |

**Common Raymarine Alarm IDs:**
```
10 = Shallow water
20 = Deep water
30 = Anchor alarm
38 = MOB (Man Overboard)
42 = Engine alarm
43 = Autopilot alarm
47 = GPS failure
80 = AIS alarm
```

**Alarm Status Values:**
```
0 = Alarm off
1 = Alarm on (buzzer active)
2 = Alarm acknowledged (buzzer silenced)
3 = Alarm condition cleared
```

### NMEA 2000 Buzzer Control Logic

**To Trigger Buzzer on NMEA 2000 Network:**

1. **Broadcast PGN 126983 with alarm active:**
   - `alertState = 2` (Active)
   - `acknowledgeStatus = 0` (Not acknowledged)
   - `temporarySilenceStatus = 0` (Not silenced)
   - **Result:** All displays with buzzer capability will sound alarm

2. **Broadcast PGN 126985 (optional but recommended):**
   - Provides text description for display
   - Helps operators understand alarm context

3. **To Silence Buzzer (Temporary):**
   - User presses "Silence" button on MFD
   - MFD sends PGN 126984 with `responseCommand = 1`
   - Original device updates PGN 126983 with `temporarySilenceStatus = 1`
   - Buzzer stops, visual indication continues

4. **To Acknowledge Alarm:**
   - User presses "Acknowledge" button
   - MFD sends PGN 126984 with `responseCommand = 0`
   - Original device updates PGN 126983 with `acknowledgeStatus = 1`
   - Alarm remains visible but not audible

5. **To Clear Alarm:**
   - When condition resolves, update PGN 126983 with `alertState = 1` (Normal)
   - All devices remove alarm from display

### Implementation Example (NMEA 2000)

```javascript
// Generate Alert Message (PGN 126983)
function generateN2KAlert(alarm) {
  return {
    pgn: 126983,
    priority: 2,
    src: deviceAddress,
    dst: 255,  // Broadcast
    fields: {
      alertType: getAlertTypeFromPriority(alarm.priority),
      alertCategory: alarm.category === 'navigation' ? 0 : 1,
      alertSystem: alarm.systemId,
      alertSubSystem: alarm.subSystemId,
      alertId: alarm.id,
      dataSourceNetworkId: deviceName,
      dataSourceInstance: 0,
      dataSourceIndex: 0,
      alertOccurrenceNumber: alarm.occurrenceCount,
      temporarySilenceStatus: alarm.isSilenced ? 1 : 0,
      acknowledgeStatus: alarm.isAcknowledged ? 1 : 0,
      escalationStatus: 0,
      temporarySilenceSupport: 1,
      acknowledgeSupport: 1,
      escalationSupport: 0,
      triggerCondition: 1,  // Auto
      thresholdStatus: 2,
      alertPriority: alarm.priorityValue,
      alertState: alarm.isActive ? 2 : 1
    }
  };
}

// Generate Alert Text (PGN 126985)
function generateN2KAlertText(alarm) {
  return {
    pgn: 126985,
    priority: 6,
    src: deviceAddress,
    dst: 255,
    fields: {
      alertType: getAlertTypeFromPriority(alarm.priority),
      alertCategory: alarm.category === 'navigation' ? 0 : 1,
      alertSystem: alarm.systemId,
      alertSubSystem: alarm.subSystemId,
      alertId: alarm.id,
      dataSourceNetworkId: deviceName,
      dataSourceInstance: 0,
      dataSourceIndex: 0,
      alertOccurrenceNumber: alarm.occurrenceCount,
      languageId: 0,  // English (US)
      alertTextDescription: alarm.description,
      alertLocationText: alarm.location || ''
    }
  };
}

// Handle Alert Response (PGN 126984)
function handleAlertResponse(msg) {
  if (msg.pgn === 126984) {
    const cmd = msg.fields.responseCommand;
    switch(cmd) {
      case 0:  // Acknowledge
        alarmManager.acknowledgeAlarm(msg.fields.alertId);
        break;
      case 1:  // Temporary silence
        alarmManager.silenceAlarm(msg.fields.alertId);
        break;
    }
  }
}
```

### Common Alert System/ID Mappings

**Navigational Alerts (Category 0):**

| System | Sub-System | Alert ID | Description |
|--------|------------|----------|-------------|
| 10 | 0 | 1 | Shallow water |
| 10 | 0 | 2 | Deep water |
| 20 | 0 | 10 | Anchor drag |
| 30 | 0 | 20 | Off course (XTE) |
| 30 | 0 | 21 | Waypoint arrival |
| 40 | 0 | 30 | Man overboard (MOB) |
| 50 | 0 | 40 | Collision alarm |
| 60 | 0 | 50 | GPS signal loss |

**Technical Alerts (Category 1):**

| System | Sub-System | Alert ID | Description |
|--------|------------|----------|-------------|
| 100 | 0 | 10 | Autopilot failure |
| 110 | 0 | 20 | Engine overheat |
| 110 | 0 | 21 | Low oil pressure |
| 110 | 0 | 22 | High RPM |
| 120 | 0 | 30 | Low battery voltage |
| 120 | 0 | 31 | High battery voltage |
| 130 | 0 | 40 | High bilge water |
| 140 | 0 | 50 | AIS failure |

### Testing NMEA 2000 Alerts

**Test Sequence:**

1. Connect NMEA 2000 network analyzer (e.g., YDEN-02, Actisense NGT-1)
2. Send PGN 126983 with `alertState=2`, `acknowledgeStatus=0`
3. Verify MFD displays alarm and buzzer sounds
4. Send PGN 126984 acknowledgment from another device
5. Verify buzzer stops but visual alert remains
6. Send PGN 126983 with `alertState=1` to clear
7. Verify alarm disappears from all displays

**Tools for Testing:**
- **Actisense NMEA Reader:** Read/decode PGN messages
- **CANboat Analyzer:** Open-source CAN message decoder
- **Simrad/B&G/Raymarine Diagnostics:** Manufacturer test modes

---

## Protocol Comparison

### NMEA 0183 vs NMEA 2000 Alarms

| Feature | NMEA 0183 (ALR) | NMEA 2000 (PGN 126983) |
|---------|-----------------|------------------------|
| **Transport** | Serial RS-422/RS-232 | CAN bus |
| **Speed** | 4800-38400 baud | 250 kbps |
| **Topology** | Point-to-point/multi-drop | Multi-master network |
| **Message Size** | 82 bytes max | 223 bytes per PGN |
| **Priority Levels** | Not specified | Built-in (0-7) |
| **Acknowledgment** | Separate sentence (AKD) | Built-in response PGN |
| **Text Description** | In alarm sentence | Separate PGN (126985) |
| **Unique Device ID** | No (talker ID only) | Yes (NAME field) |
| **State Management** | Manual flags | Comprehensive state machine |
| **Silence Support** | Not standardized | Built-in flag |
| **Multi-language** | No | Yes (language ID field) |
| **Collision Handling** | None | CAN arbitration |

**Recommendation:** Use NMEA 2000 (PGN 126983) for modern installations with CAN-based networks. Use NMEA 0183 (ALR) for legacy equipment or serial-only systems.

---

## Implementation Recommendations for BMad Autopilot

### Dual Protocol Support

Implement both NMEA 0183 and NMEA 2000 alarm broadcasting for maximum compatibility:

```typescript
class AlarmBroadcaster {
  private n0183Bridge: Nmea0183Bridge;
  private n2000Bridge: Nmea2000Bridge;
  
  broadcastAlarm(alarm: Alarm) {
    // Broadcast on both protocols simultaneously
    if (this.n0183Bridge.isConnected()) {
      this.n0183Bridge.sendALR(alarm);
    }
    if (this.n2000Bridge.isConnected()) {
      this.n2000Bridge.sendPGN126983(alarm);
      this.n2000Bridge.sendPGN126985(alarm);  // Text description
    }
  }
}
```

**Benefits:**
- **Maximum Compatibility:** Works with legacy NMEA 0183 and modern NMEA 2000 equipment
- **Redundancy:** If one protocol fails, alarms still broadcast on other
- **Future-Proof:** Ready for transition to all-NMEA 2000 networks

---

## Standards References

### NMEA 0183 Alarm Sentences

**Official NMEA Standard:** NMEA 0183 Version 4.11  
**Relevant Sections:**
- 5.3.1 - ALR - Set Alarm State
- 5.3.2 - AKD - Acknowledge Detail Alarm Condition
- 5.3.3 - ALA - Set Detail Alarm Condition

**Note:** Full NMEA 0183 standard is proprietary and requires purchase from NMEA.org

### NMEA 2000 Alert PGNs

**Official NMEA Standard:** NMEA 2000 Version 3.000+  
**Relevant PGNs:**
- **PGN 126983** - Alert (alarm notification broadcast)
- **PGN 126984** - Alert Response (acknowledge, silence commands)
- **PGN 126985** - Alert Text (human-readable descriptions)
- **PGN 126986** - Alert Configuration (threshold settings)
- **PGN 126987** - Alert Threshold (trigger values)
- **PGN 126988** - Alert Value (current values)

**Raymarine Proprietary:**
- **PGN 65288** (0xFF08) - SeaTalk/Raymarine proprietary alarm (Manufacturer Code 1851)

**Note:** Full NMEA 2000 standard requires licensing from NMEA.org

### IEC Standards

**IEC 61162-1:2016** - Maritime navigation (NMEA 0183 equivalent)  
**IEC 61162-3:2008** - Digital interfaces Part 3: NMEA 2000 equivalent

Both include alarm/alert message specifications.

### ISO 11783 (J1939)

NMEA 2000 is based on ISO 11783, which defines CAN 2.0B physical layer and alert functionality per ISO 11783-7.

### Raymarine Documentation

**SeaTalk ng Technical Reference** - Raymarine's NMEA 2000 implementation  
**Integration Guides** - Standard NMEA 0183 ALR and NMEA 2000 PGN 126983 for third-party integration

## Security Considerations

### NMEA 0183
1. **Alarm Spoofing:** No authentication - malicious actors can send false ALR messages
2. **Alarm Flooding:** Rate-limit transmission to prevent network saturation  
3. **Critical Alarms:** No priority mechanism - implement application-level prioritization

### NMEA 2000
1. **Alarm Spoofing:** Limited authentication via device NAME field (can be spoofed)
2. **Priority Arbitration:** CAN bus priority prevents critical alarms from being blocked
3. **Denial of Service:** Bus-off state possible if device floods network with errors

### General Recommendations
- **Multi-path Alerting:** Implement local + network buzzers for critical alarms
- **Rate Limiting:** Maximum 1 update per second per alarm ID
- **Alarm Validation:** Cross-check alarm conditions with sensor data
- **Network Monitoring:** Log all alarm messages for security audit

## Testing Checklist

### NMEA 0183 Testing
- [ ] Generate ALR sentence with alarm active
- [ ] Verify buzzer sounds on Raymarine equipment
- [ ] Test alarm acknowledgment (AKD sentence)
- [ ] Verify buzzer stops after acknowledgment
- [ ] Test alarm clearing (ALR with inactive state)
- [ ] Verify visual indicator remains after buzzer silenced
- [ ] Test multiple simultaneous alarms
- [ ] Verify alarm priority levels respected
- [ ] Test alarm persistence across device restart
- [ ] Validate NMEA checksum calculation

### NMEA 2000 Testing
- [ ] Send PGN 126983 with alertState=2, acknowledgeStatus=0
- [ ] Verify MFD displays alert and buzzer sounds
- [ ] Send PGN 126985 with descriptive text
- [ ] Verify alert text appears on MFD
- [ ] Send PGN 126984 with responseCommand=1 (silence)
- [ ] Verify buzzer stops but visual alert continues
- [ ] Send PGN 126984 with responseCommand=0 (acknowledge)
- [ ] Verify alert status changes on display
- [ ] Send PGN 126983 with alertState=1 to clear
- [ ] Verify alert disappears from all displays
- [ ] Test multiple simultaneous alerts
- [ ] Verify alert priority handling
- [ ] Monitor CAN bus traffic for proper PGN formatting

### Cross-Protocol Testing
- [ ] Test NMEA 0183 → NMEA 2000 gateway conversion
- [ ] Test NMEA 2000 → NMEA 2000 gateway conversion
- [ ] Verify alarm synchronization across protocols
- [ ] Test mixed equipment (some N0183, some N2K)

## Additional Resources

### NMEA 0183
- **NMEA 0183 Revealed:** https://gpsd.gitlab.io/gpsd/NMEA.html
- **Marine Electronics Forum:** Raymarine alarm integration discussions
- **IEC 61162-1 Standard:** International maritime navigation standard

### NMEA 2000
- **CANboat Project:** https://github.com/canboat/canboat (open-source NMEA 2000 analyzer)
- **Actisense NMEA Reader:** Commercial NMEA 2000 diagnostic tool
- **Signal K Alarm Spec:** https://signalk.org (modern marine data standard)

### Development Tools
- **YDEN-02 (Yacht Devices):** NMEA 2000 gateway and logger
- **Actisense NGT-1:** USB to NMEA 2000 gateway
- **CANable:** Low-cost CAN bus analyzer

## Conclusion

Raymarine equipment supports alarm/buzzer control via both NMEA 0183 and NMEA 2000:

**NMEA 0183:** Use `ALR` sentence with Field 3='V' (not acknowledged) and Field 4='A' (active) to trigger buzzer.

**NMEA 2000:** Use PGN 126983 with `alertState=2` (Active) and `acknowledgeStatus=0` (not acknowledged) to trigger buzzer across all networked displays.

For BMad autopilot integration, implement dual-protocol broadcasting for maximum compatibility. Map alarm types to standard NMEA alarm numbers following maritime conventions. This ensures proper integration with Raymarine equipment and other NMEA-compliant marine electronics.
