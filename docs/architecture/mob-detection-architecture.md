# Man Overboard (MOB) Detection System Architecture

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-16 | 1.0 | Initial MOB detection architecture - BLE-only MVP design | Winston (Architect) |

---

## Document Scope

This document defines the **complete technical architecture** for the Man Overboard (MOB) Detection System using Bluetooth Low Energy (BLE) proximity monitoring. It integrates with the existing Boating Instruments App architecture and Navigation Session infrastructure.

**Related Documents:**
- [MOB Brainstorming Results](../MOB-brainstorming-results.md) - Requirements and feasibility analysis
- [Core Architecture](../architecture.md) - System integration patterns
- [UI Architecture](../ui-architecture.md) - Frontend component design

---

## Executive Summary

### System Overview

The MOB Detection System uses **Bluetooth Low Energy (BLE) proximity monitoring** to detect when crew members fall overboard during active Navigation Sessions. The system consists of:

1. **Tag App** (BLE Peripheral) - Runs on crew smartphones/smartwatches, broadcasts presence
2. **Boating Instruments App** (BLE Central) - Main navigation device, monitors tag presence
3. **Pre-Departure Safety Check** - Verifies all crew devices before navigation starts
4. **MOB Alert & Response System** - Triggers alarms, marks waypoints, coordinates rescue

**Key Capabilities:**
- Auto-discovery of crew devices (zero configuration)
- 8-10 second MOB detection latency (matches commercial systems)
- Cross-platform support (iOS ↔ Android interoperability)
- 30-50 foot effective range (fiberglass boats 20-40 feet)
- Integration with autopilot for automatic rescue patterns

**Target Users:**
- Recreational boaters (20-40 foot fiberglass vessels)
- Solo sailors requiring automatic MOB response
- Families with children needing enhanced monitoring
- Cruising crews wanting safety redundancy

---

## Architecture Principles

### Design Philosophy

**1. Fail-Safe by Default**
- Signal loss = assume MOB emergency (unless explicit logout)
- Better 30% false positive rate than any false negative
- Pre-departure safety check is non-negotiable

**2. Zero Configuration UX**
- Auto-discovery of Tag App devices in range
- Opt-out model (monitored by default) vs. opt-in
- No manual pairing, no device registration

**3. Cross-Platform First**
- iOS and Android crew devices must interoperate seamlessly
- Standard BLE protocols (no proprietary extensions)
- Advertisement-only architecture (no connections = simpler + more reliable)

**4. Battery Consciousness**
- Tag devices advertise at 300ms intervals (6-12 month battery on CR2032)
- Boating Instruments App must run on boat power during navigation
- Low-power background modes on all platforms

**5. Integration with Existing Systems**
- Leverage Navigation Session for "underway" detection
- Use nmeaStore for SOG/COG data (trajectory calculation)
- Integrate with autopilot service for rescue patterns
- Extend alarm system for MOB alerts

---

## System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOATING INSTRUMENTS APP                      │
│                     (BLE Central - iOS/Android)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               MOB Detection Service                      │  │
│  │  - BLE scanning for MOB Service UUID                     │  │
│  │  - Signal loss detection (8-10 second timeout)           │  │
│  │  - Pre-departure safety check orchestration              │  │
│  │  - MOB alert triggering & waypoint marking               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  mobStore (Zustand)                      │  │
│  │  - Crew roster with device status                        │  │
│  │  - Detection state & alert status                        │  │
│  │  - MOB event history & waypoints                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              UI Components                               │  │
│  │  - Pre-Departure Safety Check Screen                     │  │
│  │  - Crew Roster Display (HeaderBar)                       │  │
│  │  - MOB Alert Screen with rescue coordination            │  │
│  │  - Settings: Temporary logout, detection thresholds     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                          ↕ BLE Advertisement
┌─────────────────────────────────────────────────────────────────┐
│                         TAG APP                                 │
│                  (BLE Peripheral - iOS/Android)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            BLE Advertisement Service                     │  │
│  │  - Broadcasts MOB Service UUID at 300ms interval         │  │
│  │  - Includes device ID, battery level, status flags       │  │
│  │  - Background operation (iOS peripheral mode)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 tagStore (Zustand)                       │  │
│  │  - Device registration & identity                        │  │
│  │  - Logout state & temporary pause                        │  │
│  │  - Battery monitoring & charging alerts                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↕                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              UI Components                               │  │
│  │  - Device setup & crew member identification            │  │
│  │  - Temporary logout controls                             │  │
│  │  - Battery status & charging warnings                    │  │
│  │  - Connection status to Boating Instruments App         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

     Integration Points:

     ┌──────────────────────┐
     │  Navigation Session  │ ← MOB monitoring active when session running
     └──────────────────────┘

     ┌──────────────────────┐
     │     nmeaStore        │ ← SOG/COG for trajectory calculation
     └──────────────────────┘

     ┌──────────────────────┐
     │  Autopilot Service   │ ← Trigger MOB rescue pattern
     └──────────────────────┘

     ┌──────────────────────┐
     │    Alarm System      │ ← MOB critical alarm
     └──────────────────────┘
```

---

## BLE Protocol Specification

### MOB Service UUID

**Custom 128-bit UUID:** `A3C8F012-8765-4321-ABCD-1234567890AB`

*(Generated using UUID v4 for this MOB detection service)*

**Why Custom UUID:**
- Avoids conflicts with standard BLE services
- Cross-platform compatibility (iOS/Android)
- Enables background scanning on iOS (requires specific service UUID)
- No proprietary vendor lock-in

### Advertisement Packet Structure

**Total Size:** 22 bytes (within 31-byte BLE 4.2 limit)

```
┌──────────────────────────────────────────────┐
│  Advertisement Packet (Transmitted by Tag)   │
├──────────────────────────────────────────────┤
│  Service UUID (16 bytes)                     │  A3C8F012-8765-4321-ABCD-1234567890AB
│  Device ID (4 bytes)                         │  Unique tag identifier (UUIDv4 first 32 bits)
│  Battery Level (1 byte)                      │  0-100% (0xFF = unknown)
│  Status Flags (1 byte)                       │  Bit flags (see below)
└──────────────────────────────────────────────┘

Status Flags Byte (8 bits):
  Bit 0: Fall detected (accelerometer trigger) - **Phase 2 enhancement**
  Bit 1: Temporary logout active
  Bit 2: Low battery warning (<20%)
  Bit 3: Charging state
  Bit 4: Below deck (user indication)
  Bit 5-7: Reserved for future use

**Phase 2: Accelerometer Fall Detection (Sub-Second Alerts)**

Detect fall events using device accelerometer for immediate MOB alerts:

Tag App monitors accelerometer:
  - Sampling rate: 50-100 Hz (20ms intervals)
  - Detect sudden acceleration change (>2.5g)
  - Pattern: Normal (1g) → Freefall (0.2g) → Impact (>2.5g)
  - Set Bit 0 in status flags

Boating App response:
  - Fall flag detected → Immediate MOB alert (~400-500ms total)
  - No need to wait for missed pings
  - Very high confidence (accelerometer + signal loss)

Detection Timeline with Accelerometer:
```
Person falls:           0ms
Accelerometer detects: 200ms (sensor sampling + processing)
Tag sets fall flag:    250ms
Next advertisement:    300ms (with fall flag set)
Boating App receives:  350ms (BLE latency)
MOB Alert triggered:   400ms

Total: ~400-500ms (sub-second detection!)
```

Trade-offs:
  + Extremely fast detection (10-20× faster than ping mode)
  + Works even in iOS background (flag in advertisement)
  + Very high confidence (physical fall + signal loss)
  - False positives (drop phone, jump, rough seas)
  - Additional battery drain (continuous accelerometer monitoring)
  - Requires motion sensor permissions
```

### BLE Advertising Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Advertising Interval** | 300ms | **Active ping mode:** 3 missed pings = 900ms detection |
| **TX Power** | 0 dBm (medium) | Balance: 30-50 foot range vs battery consumption |
| **Connectable** | No | Advertisement-only simplifies implementation, improves reliability |
| **Scan Response** | No | All data in advertisement packet (iOS background requirement) |
| **Advertisement Type** | ADV_NONCONN_IND | Non-connectable undirected advertising |

**Detection Algorithm: Active Ping Mode**

Instead of passive timeout, use **active ping detection:**

- **Ping Interval:** 300ms (each advertisement = 1 ping)
- **Ping Tolerance:** ±100ms (account for BLE timing jitter)
- **Missed Ping Threshold:** 3 consecutive missed pings
- **Detection Latency:** 900ms - 1.5 seconds (vs 10 seconds passive timeout)
- **Confidence:** 99.9% (3 consecutive misses = extremely high probability of real signal loss)

**Detection Timeline:**
```
Tag advertises at:    0ms    300ms   600ms   900ms   1200ms   1500ms
                       ↓       ↓       ✓       ✗       ✗        ✗
Expected pings:       ✓       ✓    Person    Miss    Miss     Miss
                                    falls     #1      #2       #3
                                                                ↓
                                                          MOB ALERT!

Total detection time: 900ms - 1.5 seconds
Boat travel distance: ~23 feet (at 5 knots) vs 250 feet (10 second timeout)
```

**iOS Background Advertising Interval Constraint:**
- Apple recommends 20ms for fast discovery OR 1022.5ms for battery-constrained
- 300ms is optimal: sub-second ping detection + 6-12 month battery life

---

## Platform-Specific Implementation

### iOS Implementation

#### Tag App (BLE Peripheral)

**Framework:** CoreBluetooth (`CBPeripheralManager`)

**Key Implementation Points:**

1. **Background Mode Configuration**
   ```xml
   <!-- Info.plist -->
   <key>UIBackgroundModes</key>
   <array>
       <string>bluetooth-peripheral</string>
   </array>

   <key>NSBluetoothPeripheralUsageDescription</key>
   <string>This app broadcasts your presence to detect man overboard situations.</string>
   ```

2. **Peripheral Setup**
   ```swift
   class MOBTagPeripheral: NSObject, CBPeripheralManagerDelegate {
       var peripheralManager: CBPeripheralManager!
       let serviceUUID = CBUUID(string: "A3C8F012-8765-4321-ABCD-1234567890AB")

       func startAdvertising(deviceID: UInt32, battery: UInt8, flags: UInt8) {
           // Build advertisement data with service UUID + device info
           var manufacturerData = Data()
           manufacturerData.append(contentsOf: withUnsafeBytes(of: deviceID.bigEndian, Array.init))
           manufacturerData.append(battery)
           manufacturerData.append(flags)

           let advertisementData: [String: Any] = [
               CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
               CBAdvertisementDataLocalNameKey: "MOB-Tag",
               // Device ID, battery, flags encoded in service data
           ]

           peripheralManager.startAdvertising(advertisementData)
       }
   }
   ```

3. **Background State Preservation**
   - Assign restoration identifier to `CBPeripheralManager`
   - Implement state preservation delegate methods
   - **Limitation:** Does NOT work if user force-quits app

#### Boating Instruments App (BLE Central)

**Framework:** CoreBluetooth (`CBCentralManager`)

**Key Implementation Points:**

1. **Background Mode Configuration**
   ```xml
   <!-- Info.plist -->
   <key>UIBackgroundModes</key>
   <array>
       <string>bluetooth-central</string>
   </array>

   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>This app monitors crew proximity to detect man overboard emergencies.</string>

   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>Required for background Bluetooth scanning to monitor crew safety.</string>
   ```

2. **Central Manager Setup (Active Ping Detection)**
   ```swift
   class MOBDetectionService: NSObject, CBCentralManagerDelegate {
       var centralManager: CBCentralManager!
       let serviceUUID = CBUUID(string: "A3C8F012-8765-4321-ABCD-1234567890AB")

       // Ping tracking
       struct PingTracker {
           var deviceID: String
           var lastPingTime: Date
           var missedPings: Int
           var rssiHistory: [Int] // Last 10 RSSI values for trend analysis
       }
       var trackedDevices: [UUID: PingTracker] = [:]

       let PING_INTERVAL: TimeInterval = 0.3 // 300ms
       let PING_TOLERANCE: TimeInterval = 0.1 // ±100ms jitter
       let MAX_MISSED_PINGS = 3 // 3 consecutive misses = MOB

       func startScanning() {
           let options: [String: Any] = [
               CBCentralManagerScanOptionAllowDuplicatesKey: true // CHANGED: Need duplicates for ping detection
           ]

           // CRITICAL: Must scan for specific service UUID in background
           centralManager.scanForPeripherals(withServices: [serviceUUID], options: options)

           // Start ping check loop (every 100ms for responsive detection)
           startPingCheckLoop()
       }

       func centralManager(_ central: CBCentralManager,
                          didDiscover peripheral: CBPeripheral,
                          advertisementData: [String : Any],
                          rssi RSSI: NSNumber) {
           // This is a "ping" from the tag device
           recordPing(deviceID: peripheral.identifier, rssi: RSSI.intValue)
       }

       func recordPing(deviceID: UUID, rssi: Int) {
           if var tracker = trackedDevices[deviceID] {
               // Reset missed ping counter on successful ping
               tracker.lastPingTime = Date()
               tracker.missedPings = 0
               tracker.rssiHistory.append(rssi)

               // Keep only last 10 RSSI values (3 seconds of history)
               if tracker.rssiHistory.count > 10 {
                   tracker.rssiHistory.removeFirst()
               }

               trackedDevices[deviceID] = tracker
           } else {
               // New device discovered
               trackedDevices[deviceID] = PingTracker(
                   deviceID: deviceID.uuidString,
                   lastPingTime: Date(),
                   missedPings: 0,
                   rssiHistory: [rssi]
               )
           }
       }

       func startPingCheckLoop() {
           Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
               self?.checkForMissedPings()
           }
       }

       func checkForMissedPings() {
           let now = Date()

           for (deviceID, var tracker) in trackedDevices {
               let timeSinceLastPing = now.timeIntervalSince(tracker.lastPingTime)
               let expectedNextPing = PING_INTERVAL + PING_TOLERANCE

               if timeSinceLastPing > expectedNextPing {
                   // Ping was missed
                   tracker.missedPings += 1

                   if tracker.missedPings >= MAX_MISSED_PINGS {
                       // 3 consecutive pings missed (900ms - 1.5 seconds)
                       let signalTrend = analyzeSignalTrend(tracker.rssiHistory)
                       triggerMOBAlert(deviceID: tracker.deviceID, signalTrend: signalTrend)
                   }

                   trackedDevices[deviceID] = tracker
               }
           }
       }

       func analyzeSignalTrend(_ rssiHistory: [Int]) -> SignalTrend {
           guard rssiHistory.count >= 5 else { return .stable }

           let recent = Array(rssiHistory.suffix(5))
           let average = Double(recent.reduce(0, +)) / Double(recent.count)
           let variance = recent.map { abs(Double($0) - average) }.reduce(0, +) / Double(recent.count)

           // Stable: RSSI varies within ±5 dBm (person below deck, walking around)
           if variance < 5 { return .stable }

           // Weakening: RSSI gradually decreasing
           let trend = recent.last! - recent.first!
           if trend < -10 { return .weakening } // Dropped 10+ dBm over 1.5 seconds

           return .suddenLoss
       }
   }

   enum SignalTrend {
       case stable        // Below deck likely
       case weakening     // Moving away
       case suddenLoss    // High confidence MOB
   }
   ```

3. **iOS Background Discovery Latency - Critical Issue & Solution**

   **The Problem:**
   - **Background scanning is 55× slower:** 10-20 seconds to discover devices
   - This breaks the active ping mode advantage!
   - `CBCentralManagerScanOptionAllowDuplicatesKey: true` is **ignored in background**

   **Solution: Keep App in Foreground During Navigation Session**

   ```swift
   import AVFoundation

   class NavigationSessionManager {
       var silentAudioPlayer: AVAudioPlayer?

       func startNavigationSession() {
           // Play silent audio to keep app in foreground-equivalent state
           // This is legitimate for safety-critical navigation monitoring
           guard let silentAudioURL = Bundle.main.url(forResource: "silent-1sec", withExtension: "mp3") else {
               return
           }

           do {
               silentAudioPlayer = try AVAudioPlayer(contentsOf: silentAudioURL)
               silentAudioPlayer?.numberOfLoops = -1 // Loop indefinitely
               silentAudioPlayer?.volume = 0.01 // Nearly silent
               silentAudioPlayer?.play()

               // Now BLE scanning runs at full speed!
               // Active ping mode works: 900ms - 1.5s detection
           } catch {
               print("Failed to start silent audio: \(error)")
           }
       }

       func stopNavigationSession() {
           silentAudioPlayer?.stop()
           silentAudioPlayer = nil
       }
   }
   ```

   **Alternative: Require App in Foreground (UI Pattern)**
   - Display "Keep app visible during navigation" message
   - Prevent device from sleeping during Navigation Session
   - Use `UIApplication.shared.isIdleTimerDisabled = true`

   **Detection Performance:**
   - **Foreground:** 900ms - 1.5 seconds (ping mode)
   - **Background (without workaround):** 10-20 seconds (passive timeout)
   - **Background (with silent audio):** 900ms - 1.5 seconds (ping mode)

4. **State Preservation**
   - Assign restoration identifier: `CBCentralManagerOptionRestoreIdentifierKey`
   - Implement `centralManager:willRestoreState:` delegate
   - Restore scanning for service UUID on app relaunch

**iOS Background Limitations:**
- Cannot scan for all devices (`nil` services) in background
- Duplicate discovery events suppressed (can't monitor RSSI continuously)
- State preservation fails if user force-quits app
- "Always Allow" location permission required (triggers App Store scrutiny)

---

### Android Implementation

#### Tag App (BLE Peripheral)

**Framework:** `android.bluetooth.le.BluetoothLeAdvertiser`

**Key Implementation Points:**

1. **Permissions (Android 12+)**
   ```xml
   <!-- AndroidManifest.xml -->
   <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />

   <service android:name=".MOBTagService"
            android:foregroundServiceType="connectedDevice" />
   ```

2. **Peripheral Mode Support Check**
   ```kotlin
   val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
   if (!bluetoothAdapter.isMultipleAdvertisementSupported()) {
       // Device does NOT support peripheral mode
       // Graceful degradation: Show warning, suggest alternative device
       Log.e("MOBTag", "BLE peripheral mode not supported on this device")
       return
   }
   ```

3. **Advertising Setup**
   ```kotlin
   class MOBTagAdvertiser(private val context: Context) {
       private val serviceUUID = UUID.fromString("A3C8F012-8765-4321-ABCD-1234567890AB")

       fun startAdvertising(deviceID: Int, battery: Byte, flags: Byte) {
           val settings = AdvertiseSettings.Builder()
               .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER) // 300ms interval
               .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM) // 0 dBm
               .setConnectable(false) // Non-connectable
               .build()

           val data = AdvertiseData.Builder()
               .addServiceUuid(ParcelUuid(serviceUUID))
               .setIncludeDeviceName(false) // Save bytes
               .addServiceData(ParcelUuid(serviceUUID), buildPayload(deviceID, battery, flags))
               .build()

           bluetoothLeAdvertiser.startAdvertising(settings, data, advertiseCallback)
       }

       private fun buildPayload(deviceID: Int, battery: Byte, flags: Byte): ByteArray {
           val payload = ByteArray(6)
           // Device ID (4 bytes)
           payload[0] = (deviceID shr 24).toByte()
           payload[1] = (deviceID shr 16).toByte()
           payload[2] = (deviceID shr 8).toByte()
           payload[3] = deviceID.toByte()
           // Battery (1 byte)
           payload[4] = battery
           // Flags (1 byte)
           payload[5] = flags
           return payload
       }
   }
   ```

4. **Foreground Service (Required for Reliability)**
   ```kotlin
   class MOBTagService : Service() {
       override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
           val notification = NotificationCompat.Builder(this, CHANNEL_ID)
               .setContentTitle("MOB Tag Active")
               .setContentText("Monitoring for man overboard detection")
               .setSmallIcon(R.drawable.ic_lifebuoy)
               .setPriority(NotificationCompat.PRIORITY_LOW)
               .build()

           startForeground(NOTIFICATION_ID, notification)

           // Start BLE advertising
           mobTagAdvertiser.startAdvertising(...)

           return START_STICKY // Restart if killed
       }
   }
   ```

#### Boating Instruments App (BLE Central)

**Framework:** `android.bluetooth.le.BluetoothLeScanner`

**Key Implementation Points:**

1. **Permissions (Android 12+)**
   ```xml
   <!-- AndroidManifest.xml -->
   <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
   ```

2. **Foreground Service for Background Scanning**
   ```kotlin
   class MOBDetectionService : Service() {
       private val serviceUUID = UUID.fromString("A3C8F012-8765-4321-ABCD-1234567890AB")
       private var discoveredDevices = mutableMapOf<String, Long>() // Device address → timestamp

       override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
           val notification = NotificationCompat.Builder(this, CHANNEL_ID)
               .setContentTitle("MOB Detection Active")
               .setContentText("Monitoring crew proximity")
               .setSmallIcon(R.drawable.ic_radar)
               .setPriority(NotificationCompat.PRIORITY_LOW)
               .setOngoing(true) // Cannot be dismissed
               .build()

           startForeground(NOTIFICATION_ID, notification)
           startBLEScanning()

           return START_STICKY
       }

       private fun startBLEScanning() {
           val scanSettings = ScanSettings.Builder()
               .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY) // Fastest scanning
               .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
               .setMatchMode(ScanSettings.MATCH_MODE_STICKY) // Report even weak signals
               .build()

           val scanFilter = ScanFilter.Builder()
               .setServiceUuid(ParcelUuid(serviceUUID))
               .build()

           bluetoothLeScanner.startScan(listOf(scanFilter), scanSettings, scanCallback)
       }

       private val scanCallback = object : ScanCallback() {
           override fun onScanResult(callbackType: Int, result: ScanResult) {
               val deviceAddress = result.device.address
               val timestamp = System.currentTimeMillis()

               // Parse service data for device ID, battery, flags
               val serviceData = result.scanRecord?.getServiceData(ParcelUuid(serviceUUID))
               if (serviceData != null && serviceData.size >= 6) {
                   val deviceID = ByteBuffer.wrap(serviceData, 0, 4).int
                   val battery = serviceData[4].toInt() and 0xFF
                   val flags = serviceData[5].toInt() and 0xFF

                   // Update mobStore
                   recordDevicePresence(deviceID, battery, flags, timestamp)
               }

               discoveredDevices[deviceAddress] = timestamp
           }
       }
   }
   ```

3. **Detection Loop (Check for Missing Devices)**
   ```kotlin
   private fun startMOBDetectionLoop() {
       handler.postDelayed(object : Runnable {
           override fun run() {
               val now = System.currentTimeMillis()
               val timeout = 10_000L // 10 seconds

               discoveredDevices.forEach { (deviceAddress, lastSeen) ->
                   if (now - lastSeen > timeout) {
                       // Device not seen for >10 seconds → MOB alert
                       triggerMOBAlert(deviceAddress)
                   }
               }

               handler.postDelayed(this, 2000) // Check every 2 seconds
           }
       }, 2000)
   }
   ```

4. **Battery Optimization Whitelist Request**
   ```kotlin
   val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
   if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
       val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
       intent.data = Uri.parse("package:$packageName")
       startActivity(intent)
   }
   ```

**Android Background Advantages:**
- Foreground service provides 100% reliable background scanning
- Near-instant detection (0.5-1 second) even with screen off
- No Doze mode restrictions with foreground service

**Android Background Trade-offs:**
- Persistent notification required (user transparency)
- Users may dismiss notification and break MOB detection
- Must educate users about importance of notification

---

## State Management Architecture

### mobStore (Zustand)

**Location:** `boatingInstrumentsApp/src/core/mobStore.ts`

**Purpose:** Centralized state for MOB detection system in Boating Instruments App

```typescript
import { create } from 'zustand';

export type CrewMemberStatus =
  | 'active'           // Device broadcasting, in range
  | 'below-deck'       // Weak signal, likely below deck
  | 'logged-out'       // Temporary logout active
  | 'low-battery'      // Battery <20%
  | 'missing'          // Not seen for >10 seconds
  | 'mob-alert';       // MOB emergency triggered

export interface CrewMember {
  deviceID: string;           // Unique identifier from Tag App
  name: string;               // Crew member name (user-configured)
  lastSeen: number;           // Timestamp of last advertisement (ping)
  lastPingTime: number;       // Timestamp of last successful ping
  missedPings: number;        // Consecutive missed ping counter
  battery: number;            // 0-100%
  status: CrewMemberStatus;
  rssi?: number;              // Current signal strength
  rssiHistory: number[];      // Last 10 RSSI values for trend analysis
  signalTrend?: 'stable' | 'weakening' | 'sudden_loss';
  flags: {
    fallDetected: boolean;
    loggedOut: boolean;
    lowBattery: boolean;
    charging: boolean;
    belowDeck: boolean;
  };
}

export interface MOBEvent {
  id: string;
  deviceID: string;
  crewMemberName: string;
  timestamp: number;           // When MOB detected
  position?: {                 // GPS position at detection
    lat: number;
    lon: number;
  };
  trajectory?: {               // Calculated backward trajectory
    sog: number;               // Speed over ground at time
    cog: number;               // Course over ground at time
    estimatedMOBPosition: {    // Estimated person position
      lat: number;
      lon: number;
    };
  };
  resolved: boolean;           // False alarm dismissed or person recovered
  resolvedAt?: number;
}

interface MOBStore {
  // Detection state
  monitoringActive: boolean;         // True when Navigation Session active
  crewRoster: CrewMember[];
  mobEvents: MOBEvent[];

  // Pre-departure safety check
  safetyCheckPassed: boolean;
  safetyCheckIssues: string[];

  // Settings
  pingInterval: number;              // Default: 300ms (advertising interval)
  pingTolerance: number;             // Default: 100ms (±jitter tolerance)
  maxMissedPings: number;            // Default: 3 (900ms - 1.5s detection)
  belowDeckRSSIThreshold: number;   // RSSI threshold for below-deck detection (-75 dBm)

  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateCrewMember: (deviceID: string, data: Partial<CrewMember>) => void;
  removeCrewMember: (deviceID: string) => void;
  recordDevicePresence: (deviceID: string, battery: number, flags: number) => void;
  triggerMOBAlert: (deviceID: string) => void;
  resolveMOBEvent: (eventID: string) => void;
  runPreDepartureSafetyCheck: () => Promise<boolean>;
  reset: () => void;
}

export const useMOBStore = create<MOBStore>((set, get) => ({
  monitoringActive: false,
  crewRoster: [],
  mobEvents: [],
  safetyCheckPassed: false,
  safetyCheckIssues: [],
  pingInterval: 300, // 300ms (matches advertising interval)
  pingTolerance: 100, // ±100ms jitter
  maxMissedPings: 3, // 3 consecutive misses = 900ms - 1.5s detection
  belowDeckRSSIThreshold: -75, // dBm

  startMonitoring: () => {
    // Called when Navigation Session starts
    // Verify safety check passed before enabling
    const { safetyCheckPassed } = get();
    if (!safetyCheckPassed) {
      console.warn('Cannot start MOB monitoring without safety check');
      return;
    }
    set({ monitoringActive: true });
  },

  stopMonitoring: () => {
    // Called when Navigation Session ends
    set({ monitoringActive: false });
  },

  recordDevicePresence: (deviceID: string, battery: number, flagsByte: number, rssi?: number) => {
    const now = Date.now();
    const { crewRoster, pingInterval, pingTolerance, maxMissedPings } = get();

    // Parse flags byte
    const flags = {
      fallDetected: (flagsByte & 0x01) !== 0,
      loggedOut: (flagsByte & 0x02) !== 0,
      lowBattery: (flagsByte & 0x04) !== 0,
      charging: (flagsByte & 0x08) !== 0,
      belowDeck: (flagsByte & 0x10) !== 0,
    };

    const existingMember = crewRoster.find(m => m.deviceID === deviceID);

    if (existingMember) {
      // This is a successful "ping" - reset missed ping counter
      const updatedRSSIHistory = rssi !== undefined
        ? [...existingMember.rssiHistory, rssi].slice(-10) // Keep last 10 values
        : existingMember.rssiHistory;

      const signalTrend = analyzeSignalTrend(updatedRSSIHistory);

      set({
        crewRoster: crewRoster.map(member =>
          member.deviceID === deviceID
            ? {
                ...member,
                lastSeen: now,
                lastPingTime: now,
                missedPings: 0, // Reset on successful ping
                battery,
                rssi,
                rssiHistory: updatedRSSIHistory,
                signalTrend,
                flags,
                status: determineStatus(flags, battery, 0), // timeSinceLastSeen = 0 (just seen)
              }
            : member
        ),
      });
    } else {
      // New crew member discovered (auto-discovery)
      const newMember: CrewMember = {
        deviceID,
        name: `Crew ${crewRoster.length + 1}`, // Default name, user can change
        lastSeen: now,
        lastPingTime: now,
        missedPings: 0,
        battery,
        rssi,
        rssiHistory: rssi !== undefined ? [rssi] : [],
        status: 'active',
        flags,
      };
      set({ crewRoster: [...crewRoster, newMember] });
    }

    // If fall detected flag is set, trigger immediate MOB alert (Phase 2)
    if (flags.fallDetected) {
      console.log(`Fall detected on device ${deviceID} - immediate MOB alert`);
      get().triggerMOBAlert(deviceID);
    }
  },

  // Ping check loop - called every 100ms by BLE service
  checkForMissedPings: () => {
    const now = Date.now();
    const { crewRoster, monitoringActive, pingInterval, pingTolerance, maxMissedPings } = get();

    if (!monitoringActive) return;

    const expectedPingInterval = pingInterval + pingTolerance; // 300ms + 100ms = 400ms

    crewRoster.forEach(member => {
      const timeSinceLastPing = now - member.lastPingTime;

      if (timeSinceLastPing > expectedPingInterval) {
        // Ping was missed
        const updatedMissedPings = member.missedPings + 1;

        // Update missed ping counter
        set({
          crewRoster: crewRoster.map(m =>
            m.deviceID === member.deviceID
              ? { ...m, missedPings: updatedMissedPings }
              : m
          ),
        });

        // Check if threshold reached
        if (updatedMissedPings >= maxMissedPings) {
          // 3 consecutive pings missed (900ms - 1.5 seconds)
          console.log(`Device ${member.deviceID} missed ${updatedMissedPings} pings - triggering MOB alert`);
          get().triggerMOBAlert(member.deviceID);
        }
      }
    });
  },

  triggerMOBAlert: (deviceID: string) => {
    const { crewRoster, mobEvents, monitoringActive } = get();

    if (!monitoringActive) {
      console.log('MOB alert suppressed - monitoring not active');
      return;
    }

    const crewMember = crewRoster.find(m => m.deviceID === deviceID);
    if (!crewMember) return;

    // Get current GPS position and navigation data from nmeaStore
    const nmeaData = useNmeaStore.getState().nmeaData;

    const mobEvent: MOBEvent = {
      id: `mob-${Date.now()}`,
      deviceID,
      crewMemberName: crewMember.name,
      timestamp: Date.now(),
      position: nmeaData.gpsPosition,
      trajectory: nmeaData.sog && nmeaData.cog ? {
        sog: nmeaData.sog,
        cog: nmeaData.cog,
        estimatedMOBPosition: calculateMOBPosition(
          nmeaData.gpsPosition!,
          nmeaData.sog,
          nmeaData.cog,
          get().detectionTimeout / 1000 // Convert timeout to seconds
        ),
      } : undefined,
      resolved: false,
    };

    // Update crew member status
    set({
      crewRoster: crewRoster.map(member =>
        member.deviceID === deviceID
          ? { ...member, status: 'mob-alert' }
          : member
      ),
      mobEvents: [...mobEvents, mobEvent],
    });

    // Trigger alarm in nmeaStore
    const { updateAlarms } = useNmeaStore.getState();
    updateAlarms([{
      id: `mob-${deviceID}`,
      message: `MAN OVERBOARD: ${crewMember.name}`,
      level: 'critical',
      timestamp: Date.now(),
    }]);

    // Trigger autopilot MOB rescue pattern (if available)
    // This would integrate with autopilotService
    // triggerMOBRescuePattern(mobEvent);
  },

  runPreDepartureSafetyCheck: async () => {
    const { crewRoster } = get();
    const issues: string[] = [];

    // Check 1: At least one crew member detected
    if (crewRoster.length === 0) {
      issues.push('No crew devices detected');
    }

    // Check 2: All crew members have adequate battery
    crewRoster.forEach(member => {
      if (member.battery < 20) {
        issues.push(`${member.name}: Low battery (${member.battery}%)`);
      }
    });

    // Check 3: No crew members currently charging
    crewRoster.forEach(member => {
      if (member.flags.charging) {
        issues.push(`${member.name}: Device is charging (not worn)`);
      }
    });

    // Check 4: All devices seen recently (within 30 seconds)
    const now = Date.now();
    crewRoster.forEach(member => {
      if (now - member.lastSeen > 30000) {
        issues.push(`${member.name}: Device not responding`);
      }
    });

    const passed = issues.length === 0;
    set({
      safetyCheckPassed: passed,
      safetyCheckIssues: issues,
    });

    return passed;
  },

  // ... other actions
  reset: () => set({
    monitoringActive: false,
    crewRoster: [],
    mobEvents: [],
    safetyCheckPassed: false,
    safetyCheckIssues: [],
  }),
}));

// Helper function to analyze RSSI signal trend
function analyzeSignalTrend(rssiHistory: number[]): 'stable' | 'weakening' | 'sudden_loss' {
  if (rssiHistory.length < 5) return 'stable';

  const recent = rssiHistory.slice(-5); // Last 5 RSSI values
  const average = recent.reduce((a, b) => a + b) / recent.length;
  const variance = recent.map(r => Math.abs(r - average)).reduce((a, b) => a + b) / recent.length;

  // Stable: RSSI varies within ±5 dBm (person below deck, walking around)
  if (variance < 5) return 'stable';

  // Weakening: RSSI gradually decreasing over time
  const trend = recent[recent.length - 1] - recent[0];
  if (trend < -10) return 'weakening'; // Dropped 10+ dBm over 1.5 seconds

  return 'sudden_loss';
}

// Helper function to determine crew member status
function determineStatus(
  flags: CrewMember['flags'],
  battery: number,
  timeSinceLastSeen: number
): CrewMemberStatus {
  if (flags.loggedOut) return 'logged-out';
  if (battery < 20) return 'low-battery';
  if (timeSinceLastSeen > 1500) return 'missing'; // Updated: 1.5 seconds (3 missed pings)
  if (flags.belowDeck) return 'below-deck';
  return 'active';
}

// Helper function to calculate estimated MOB position
function calculateMOBPosition(
  currentPosition: { lat: number; lon: number },
  sog: number, // knots
  cog: number, // degrees
  detectionDelay: number // seconds
): { lat: number; lon: number } {
  // Calculate backward trajectory
  // Distance = speed * time (convert knots to meters/second)
  const distanceMeters = (sog * 0.514444) * detectionDelay;

  // Calculate new position along COG (reverse direction)
  const bearing = (cog + 180) % 360; // Reverse bearing

  // Simple approximation (for more accuracy, use Haversine formula)
  const R = 6371000; // Earth radius in meters
  const lat1 = currentPosition.lat * Math.PI / 180;
  const lon1 = currentPosition.lon * Math.PI / 180;
  const brng = bearing * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
    Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
    Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * 180 / Math.PI,
    lon: lon2 * 180 / Math.PI,
  };
}
```

---

### tagStore (Zustand)

**Location:** `tagApp/src/core/tagStore.ts` *(separate Tag App project)*

**Purpose:** State management for Tag App (crew device)

```typescript
import { create } from 'zustand';

export interface TagDevice {
  deviceID: string;           // Unique identifier (generated on first launch)
  crewMemberName: string;     // User-configured name
  batteryLevel: number;       // 0-100%
  isCharging: boolean;
  lastAdvertisementTime?: number;
}

export interface LogoutSession {
  startTime: number;
  duration: number;           // milliseconds
  reason: string;             // "kayaking", "swimming", "below deck", etc.
  autoResume: boolean;        // Auto-resume when duration expires
}

interface TagStore {
  device: TagDevice;
  advertisingActive: boolean;
  connectedToBoatingApp: boolean;
  currentLogoutSession?: LogoutSession;

  // Actions
  setCrewMemberName: (name: string) => void;
  updateBatteryLevel: (level: number, charging: boolean) => void;
  startAdvertising: () => void;
  stopAdvertising: () => void;
  startTemporaryLogout: (duration: number, reason: string) => void;
  endTemporaryLogout: () => void;
  setConnectedStatus: (connected: boolean) => void;
}

export const useTagStore = create<TagStore>((set, get) => ({
  device: {
    deviceID: '', // Generated on first launch
    crewMemberName: '',
    batteryLevel: 100,
    isCharging: false,
  },
  advertisingActive: false,
  connectedToBoatingApp: false,

  setCrewMemberName: (name: string) => {
    set(state => ({
      device: { ...state.device, crewMemberName: name }
    }));
  },

  updateBatteryLevel: (level: number, charging: boolean) => {
    set(state => ({
      device: { ...state.device, batteryLevel: level, isCharging: charging }
    }));

    // Warn if charging during active session
    if (charging && get().connectedToBoatingApp) {
      // Show notification: "You are no longer monitored - device charging"
    }
  },

  startTemporaryLogout: (duration: number, reason: string) => {
    const session: LogoutSession = {
      startTime: Date.now(),
      duration,
      reason,
      autoResume: true,
    };
    set({ currentLogoutSession: session });

    // Set timer to auto-resume
    setTimeout(() => {
      if (get().currentLogoutSession?.startTime === session.startTime) {
        get().endTemporaryLogout();
      }
    }, duration);
  },

  endTemporaryLogout: () => {
    set({ currentLogoutSession: undefined });
  },

  // ... other actions
}));
```

---

## Integration with Existing Systems

### Navigation Session Integration

**Location:** Existing Navigation Session management (not shown in provided code)

**Integration Points:**

1. **Start Navigation Session**
   ```typescript
   async function startNavigationSession() {
     // Run pre-departure safety check
     const safetyCheckPassed = await useMOBStore.getState().runPreDepartureSafetyCheck();

     if (!safetyCheckPassed) {
       // Show safety check issues to user
       const issues = useMOBStore.getState().safetyCheckIssues;
       const proceed = await confirmOverrideSafetyCheck(issues);

       if (!proceed) {
         return; // Block navigation session start
       }
     }

     // Start MOB monitoring
     useMOBStore.getState().startMonitoring();

     // ... existing navigation session logic
   }
   ```

2. **Stop Navigation Session**
   ```typescript
   function stopNavigationSession() {
     // Stop MOB monitoring
     useMOBStore.getState().stopMonitoring();

     // ... existing navigation session logic
   }
   ```

### nmeaStore Integration

**Extends:** `boatingInstrumentsApp/src/core/nmeaStore.ts`

**Integration:**

- MOB alert triggers critical alarm in existing alarm system
- GPS position (lat/lon) used for MOB waypoint marking
- SOG/COG used for backward trajectory calculation
- Integration with existing alarm evaluation and display

**Code Changes:**

```typescript
// In nmeaStore.ts

// Add MOB alarm type
export type AlarmLevel = 'info' | 'warning' | 'critical' | 'mob';

// MOB alarms automatically prioritized as highest severity
function evaluateAlarms(nmeaData: NmeaData): Alarm[] {
  const alarms: Alarm[] = [];

  // Check for MOB events from mobStore
  const mobEvents = useMOBStore.getState().mobEvents.filter(e => !e.resolved);
  mobEvents.forEach(event => {
    alarms.push({
      id: `mob-${event.deviceID}`,
      message: `MAN OVERBOARD: ${event.crewMemberName}`,
      level: 'mob', // Highest priority
      timestamp: event.timestamp,
    });
  });

  // ... existing alarm rules (depth, battery, etc.)

  return alarms;
}
```

### Autopilot Service Integration

**Extends:** `boatingInstrumentsApp/src/services/autopilotService.ts`

**MOB Rescue Pattern:**

```typescript
export async function triggerMOBRescuePattern(mobEvent: MOBEvent) {
  // Raymarine Evolution autopilot MOB pattern
  // Reference: Story 3.1 autopilot command interface

  // 1. Mark MOB waypoint
  const mobWaypoint = {
    lat: mobEvent.trajectory?.estimatedMOBPosition.lat ?? mobEvent.position!.lat,
    lon: mobEvent.trajectory?.estimatedMOBPosition.lon ?? mobEvent.position!.lon,
    name: `MOB-${mobEvent.crewMemberName}`,
    timestamp: mobEvent.timestamp,
  };

  // 2. Send autopilot MOB command (if supported by autopilot system)
  // This would use NMEA sentences specific to the autopilot
  // Example for Raymarine: "$STALK,84,86,..." (MOB activate)

  // 3. Execute MOB rescue pattern
  //    - Immediate turn to reciprocal heading
  //    - Circle back to MOB waypoint
  //    - Reduce speed as approaching MOB position

  // 4. Attempt to re-establish BLE connectivity for homing
  //    - Scan aggressively for tag device
  //    - Use RSSI for proximity guidance
  //    - Idle motor when signal strength increases (person nearby)

  console.log('MOB Rescue Pattern triggered for', mobEvent.crewMemberName);
}
```

---

## User Interface Components

### Pre-Departure Safety Check Screen

**Location:** `boatingInstrumentsApp/src/screens/PreDepartureSafetyCheckScreen.tsx`

**Purpose:** Verify all crew devices before starting Navigation Session

**UI Design:**

```
┌─────────────────────────────────────────────┐
│  Pre-Departure Safety Check                 │
├─────────────────────────────────────────────┤
│                                             │
│  Crew Roster (Auto-Discovered):            │
│                                             │
│  ✅ John Doe                                │
│     Battery: 85% | Signal: Strong          │
│                                             │
│  ⚠️  Jane Smith                             │
│     Battery: 18% - LOW BATTERY             │
│                                             │
│  ❌ Bob Johnson                             │
│     Device charging - NOT WORN             │
│                                             │
│  ────────────────────────────────────      │
│                                             │
│  [ Refresh Scan ]                          │
│                                             │
│  Issues Detected:                          │
│  • Jane Smith: Low battery (18%)           │
│  • Bob Johnson: Device charging            │
│                                             │
│  ⚠️ Starting navigation with these issues  │
│     increases MOB detection failure risk   │
│                                             │
│  [ Start Anyway ]  [ Cancel ]              │
│                                             │
└─────────────────────────────────────────────┘
```

**Implementation:**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { useMOBStore } from '../core/mobStore';

export function PreDepartureSafetyCheckScreen({ onComplete, onCancel }) {
  const { crewRoster, runPreDepartureSafetyCheck, safetyCheckPassed, safetyCheckIssues } = useMOBStore();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    performCheck();
  }, []);

  const performCheck = async () => {
    setChecking(true);
    await runPreDepartureSafetyCheck();
    setChecking(false);
  };

  const handleStart = () => {
    if (!safetyCheckPassed) {
      // Show confirmation dialog
      confirmOverride();
    } else {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pre-Departure Safety Check</Text>

      <Text style={styles.subtitle}>Crew Roster (Auto-Discovered):</Text>

      <FlatList
        data={crewRoster}
        renderItem={({ item }) => (
          <CrewMemberCard member={item} />
        )}
        keyExtractor={item => item.deviceID}
      />

      <Button title="Refresh Scan" onPress={performCheck} disabled={checking} />

      {!safetyCheckPassed && (
        <View style={styles.issuesContainer}>
          <Text style={styles.issuesTitle}>Issues Detected:</Text>
          {safetyCheckIssues.map((issue, index) => (
            <Text key={index} style={styles.issueText}>• {issue}</Text>
          ))}
          <Text style={styles.warningText}>
            ⚠️ Starting navigation with these issues increases MOB detection failure risk
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <Button
          title={safetyCheckPassed ? "Start Navigation" : "Start Anyway"}
          onPress={handleStart}
          color={safetyCheckPassed ? "green" : "orange"}
        />
        <Button title="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
```

---

### Crew Roster Display (HeaderBar Integration)

**Location:** Extend existing `HeaderBar` component

**Purpose:** Show crew monitoring status during Navigation Session

**UI Design:**

```
┌─────────────────────────────────────────────┐
│ [☰] Connection: WiFi  [👥 3/3] [Settings]  │ ← HeaderBar
│                       ↑                     │
│                 Crew Status Icon            │
│                 (Green = all OK)            │
└─────────────────────────────────────────────┘

Tap icon expands:
┌─────────────────────────────────────────────┐
│  Crew Monitoring: Active                    │
├─────────────────────────────────────────────┤
│  ✅ John Doe         (85% battery)          │
│  ✅ Jane Smith       (92% battery)          │
│  ✅ Bob Johnson      (67% battery)          │
└─────────────────────────────────────────────┘
```

---

### MOB Alert Screen

**Location:** `boatingInstrumentsApp/src/screens/MOBAlertScreen.tsx`

**Purpose:** Full-screen critical alert when MOB detected

**UI Design:**

```
┌─────────────────────────────────────────────┐
│                                             │
│          🚨 MAN OVERBOARD 🚨                │
│                                             │
│            JOHN DOE                         │
│                                             │
│  Detected: 10:34:12 AM                      │
│  Position: 37.7749°N, 122.4194°W           │
│                                             │
│  Estimated MOB Location:                   │
│  37.7745°N, 122.4198°W                     │
│  (0.02 NM astern)                          │
│                                             │
│  ────────────────────────────────────      │
│                                             │
│  Autopilot: MOB PATTERN ACTIVE             │
│  Status: Turning to reciprocal heading     │
│                                             │
│  [ Mark Waypoint ]                         │
│  [ Dismiss (False Alarm) ]                 │
│  [ Call Emergency Services ]               │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests

**BLE Service Tests:**
- Advertisement packet construction (Tag App)
- Advertisement parsing (Boating Instruments App)
- Device discovery and timeout detection
- Status flag encoding/decoding

**State Management Tests:**
- mobStore actions and state transitions
- Crew member status determination logic
- MOB trajectory calculation accuracy
- Safety check validation rules

### Integration Tests

**Cross-Platform BLE Tests:**
- iOS Tag App ↔ iOS Boating Instruments App
- iOS Tag App ↔ Android Boating Instruments App
- Android Tag App ↔ iOS Boating Instruments App
- Android Tag App ↔ Android Boating Instruments App

**Navigation Session Integration:**
- MOB monitoring starts/stops with Navigation Session
- Safety check blocks session start
- Captain override workflow

**Autopilot Integration:**
- MOB rescue pattern triggers
- Waypoint marking accuracy

### Real-Boat Testing

**Phase 1: Laboratory Testing**
- Range testing at various distances (10ft, 20ft, 30ft, 40ft, 50ft)
- Signal penetration testing (below deck, cabin, hull)
- Detection latency measurement (foreground vs background)
- Battery life validation

**Phase 2: Real-Boat Testing**
- 20ft center console (fiberglass)
- 30ft cruiser (fiberglass)
- 40ft sailboat (fiberglass)
- Detection probability mapping
- False alarm rate assessment

---

## Security and Privacy Considerations

### Data Minimization

**What is NOT collected:**
- No GPS tracking of individual crew members
- No historical location data retention
- No personal information beyond crew name (local only)
- No transmission to cloud services

**What IS collected (on-device only):**
- Device ID (random UUID, not linked to person)
- Crew member name (user-configured, local storage)
- Last seen timestamp (ephemeral, cleared after session)
- Battery level (for safety check only)

### BLE Security

**Advertisement Security:**
- No sensitive data in advertisement packet (public broadcast)
- Device ID is random UUID (not MAC address)
- No pairing or bonding required (reduces attack surface)

**Privacy:**
- MAC address rotation on iOS/Android (standard BLE privacy)
- No cross-session tracking possible
- Advertisement data encrypted at BLE stack level (platform-provided)

### Permissions Justification

**iOS:**
- `NSBluetoothAlwaysUsageDescription`: Required for background MOB monitoring
- `NSLocationAlwaysAndWhenInUseUsageDescription`: Required by iOS for background BLE scanning (not used for location tracking)

**Android:**
- `BLUETOOTH_SCAN / BLUETOOTH_ADVERTISE`: Core functionality
- `ACCESS_FINE_LOCATION / ACCESS_BACKGROUND_LOCATION`: Required by Android for BLE scanning (not used for location tracking)
- `FOREGROUND_SERVICE`: Reliable background operation for safety-critical MOB detection

### App Store Compliance

**iOS App Review:**
- Clearly justify "Always Allow" location permission (safety-critical MOB detection)
- Provide user education screens explaining background Bluetooth usage
- No actual location tracking - BLE proximity only

**Android Play Store:**
- Declare foreground service type: `connectedDevice`
- Justify persistent notification (safety-critical monitoring)
- Privacy policy: No data collection, on-device only

---

## Performance Considerations

### Battery Optimization

**Tag App (Crew Device):**
- 300ms advertising interval = 6-12 month battery (CR2032)
- Smartphone: 2-3 days continuous advertising (3000mAh battery)
- Apple Watch: 8-12 hours continuous advertising (400mAh battery)
- **Recommendation:** Charge before each boating trip

**Boating Instruments App (Main Device):**
- iOS background scanning: 2-5% battery per day
- Android foreground scanning: 10-20% battery per day
- **Requirement:** Must be connected to boat power during Navigation Session

### Detection Latency

| Scenario | Expected Latency | Notes |
|----------|------------------|-------|
| **iOS Foreground** | 1-2 seconds | App in foreground, 300ms advertising |
| **iOS Background** | 10-20 seconds | 55× slower discovery in background |
| **Android Foreground Service** | 0.5-1 second | Reliable, near-instant |
| **Commercial Benchmark (ACR OLAS)** | 8 seconds | Industry standard |

**Optimization Strategies:**
- Keep Boating Instruments App in foreground during Navigation Session
- Reduce advertising interval to 100ms for faster detection (reduces battery life)
- Implement accelerometer fall detection for 1-2 second alerts (Phase 2)

### Scalability

**Concurrent Crew Monitoring:**
- BLE scanning handles 10-20 simultaneous devices easily
- Advertisement-only architecture scales linearly
- No connection overhead (no pairing/bonding)

**Stress Testing:**
- Test with 10 Tag App devices simultaneously
- Verify no detection degradation with multiple devices
- Monitor CPU/battery impact

---

## Deployment and Rollout Strategy

### Phase 1: MVP (4-6 weeks)

**Deliverables:**
- iOS Tag App with BLE advertising
- iOS Boating Instruments App with BLE scanning
- Pre-departure safety check UI
- Basic MOB detection and alerting
- Auto-discovery of crew devices

**Testing:**
- Laboratory range/latency testing
- Cross-platform compatibility (iOS ↔ iOS)

**Target:** Internal testing, early adopters

---

### Phase 2: Enhanced Safety (3-4 weeks)

**Deliverables:**
- Android Tag App support
- Android Boating Instruments App support
- Below-deck false positive detection
- Battery monitoring and warnings
- Temporary logout feature

**Testing:**
- Full cross-platform matrix (iOS ↔ Android all combinations)
- Real-boat testing (fiberglass boats 20-40 feet)

**Target:** Beta testing with real boaters

---

### Phase 3: Production Hardening (4-6 weeks)

**Deliverables:**
- User education/onboarding flows
- App Store / Play Store compliance
- Documentation and support materials
- False alarm rate tuning

**Testing:**
- Extended real-boat validation
- Multiple boat types and conditions
- User acceptance testing

**Target:** Public release

---

### Phase 4: Advanced Features (Future)

**Deliverables:**
- Accelerometer fall detection
- Autopilot MOB rescue pattern integration
- Hybrid technology (BLE + UWB)
- Machine learning false positive reduction
- AIS integration

**Testing:**
- Advanced feature validation
- Large vessel testing (40-50 feet)

**Target:** Premium features, larger boats

---

## Known Limitations and Mitigations

| Limitation | Impact | Mitigation |
|------------|--------|-----------|
| **BLE Signal Dies in Water** | Cannot track person in water | Detect during fall (8-10 second window) |
| **iOS Background Scanning Slow** | 10-20 second detection latency | Keep app in foreground, accelerometer fall detection |
| **40-50 Foot Range Limit** | Not suitable for large vessels | Clearly document boat size limits, recommend professional systems for 50+ ft |
| **Aluminum/Steel Boats** | Significant signal attenuation | Extensive testing required, may need external antennas |
| **Device Must Be Worn** | Person without device unmonitored | Pre-departure safety check, charging warnings, user education |
| **Android Persistent Notification** | User may dismiss and break monitoring | Clear warning if notification dismissed, auto-restart service |
| **Force-Quit App** | iOS state preservation fails | User education: "Never force-quit during navigation" |
| **30% False Positive Rate** | Alarm fatigue, user trust erosion | Below-deck detection, adjustable timeouts, user dismissal |

---

## Future Enhancements

### Short-Term (Phase 2-3)

1. **Accelerometer Fall Detection**
   - Detect sudden fall pattern on Tag device
   - Trigger immediate alert (1-2 second latency)
   - Reduces reliance on signal loss timeout

2. **Below-Deck Signal Pattern Analysis**
   - Machine learning model to classify weak but stable signal
   - Differentiate below-deck (safe) vs MOB (emergency)
   - Reduce false positive rate to <10%

3. **Charging Scenario Warnings**
   - Alert when Tag device plugged in during Navigation Session
   - Alert when sufficiently charged ("safe to wear again")
   - Prevent major false negative scenario

### Medium-Term (Phase 4)

4. **Hybrid BLE + UWB**
   - iPhone 11+ / Apple Watch 6+ precision distance measurement
   - Sub-meter accuracy for proximity guidance during rescue
   - Fallback to BLE for older devices

5. **Autopilot MOB Rescue Pattern**
   - Full integration with Raymarine Evolution autopilot
   - Automatic turn to reciprocal heading
   - Circle back to MOB waypoint
   - Motor idle when signal re-established

6. **Multiple Receiver Support**
   - Deploy multiple iPads/iPhones as receivers on large boats
   - Mesh coverage for 40-50+ foot vessels
   - Synchronized MOB detection and alerting

### Long-Term (Beyond Phase 4)

7. **Multi-Vessel MOB Network**
   - Nearby boats assist in MOB search
   - Broadcast MOB position to nearby Boating Instruments App users
   - Community safety net

8. **AI-Powered False Positive Elimination**
   - Train model on real-boat signal patterns
   - Adaptive thresholds per boat type
   - 90%+ false alarm reduction

9. **AIS MOB Integration**
   - Transmit MOB position via AIS MOB message
   - Integration with professional marine rescue systems
   - Offshore/long-range scenarios

---

## Appendix

### BLE Technical Reference

**Bluetooth 5.0 Specification:**
- [Bluetooth Core Specification v5.0](https://www.bluetooth.com/specifications/specs/core-specification-5-0/)
- Generic Access Profile (GAP)
- Generic Attribute Profile (GATT)

**Platform Documentation:**
- [iOS CoreBluetooth Framework](https://developer.apple.com/documentation/corebluetooth)
- [Android Bluetooth LE Guide](https://developer.android.com/guide/topics/connectivity/bluetooth/ble-overview)

### Commercial MOB System References

**ACR OLAS:**
- Technology: BLE proximity detection
- Range: 40-50 feet on vessels up to 40-50 feet
- Detection: 8 seconds
- Cost: $299 (system) + $79 per tag

**CrewWatcher:**
- Technology: BLE proximity + water sensor
- Range: Up to 45 feet (non-metal vessels)
- Detection: 5 seconds (fall detection)
- Status: Company defunct (no longer available)

### Related User Stories

- [Story 3.1: Autopilot Command Interface](../stories/story-3.1-autopilot-command-interface.md)
- [Story 3.2: Autopilot Control UI](../stories/story-3.2-autopilot-control-ui.md)
- [Story 3.3: Autopilot Safety Systems](../stories/story-3.3-autopilot-safety-systems.md)

---

*Document Version: 1.0*
*Last Updated: 2025-10-16*
*Author: Winston (System Architect)*
