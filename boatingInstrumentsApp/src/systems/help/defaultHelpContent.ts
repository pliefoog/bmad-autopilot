/**
 * Default Help Content - Initial help content for offline use
 *
 * Provides comprehensive help content including:
 * - User manual sections
 * - FAQ
 * - Equipment compatibility guide
 * - Best practices for marine use
 */

import { HelpContent } from './types';

/**
 * Getting Started Guide
 */
const gettingStartedContent: HelpContent = {
  id: 'getting-started',
  type: 'guide',
  title: 'Getting Started with BMad Autopilot',
  description: 'Complete guide to setting up and using the BMad Autopilot app',
  content: `# Getting Started with BMad Autopilot

## Welcome Aboard

BMad Autopilot transforms your smartphone, tablet, or computer into a comprehensive marine instrument display with Raymarine autopilot control. This guide will help you get started quickly and safely.

## What You'll Need

- **WiFi NMEA Bridge**: A device that connects your boat's NMEA network to WiFi (e.g., ActisenseW2K, Digital Yacht WLN10, SeaSmart.NET Gateway)
- **Compatible Device**: iOS, Android, or desktop computer
- **NMEA Network**: NMEA 0183 or NMEA 2000 network on your boat
- **Autopilot** (optional): For autopilot control features

## Quick Setup (5 Minutes)

1. **Power On Your WiFi Bridge**: Ensure your NMEA WiFi bridge is powered and its WiFi network is broadcasting
2. **Connect to Bridge WiFi**: Join the bridge's WiFi network on your device
3. **Open BMad Autopilot App**: Launch the application
4. **Configure Connection**:
   - Tap hamburger menu (☰) → Connection
   - Enter bridge IP address (typically 192.168.1.1 or 10.0.0.1)
   - Enter TCP port (typically 10110 for NMEA 0183)
   - Tap Connect
5. **Verify Data**: You should see live data appearing on dashboard widgets

## First Dashboard

The default dashboard includes essential widgets:
- **Speed**: Boat speed through water (SOG/SOW)
- **Depth**: Water depth below transducer
- **Compass**: Magnetic heading
- **GPS**: Position and COG

You can customize your dashboard by adding, removing, or repositioning widgets.

## Safety First

⚠️ **IMPORTANT**: This app is a navigation aid, not a replacement for proper seamanship:
- Always maintain proper lookout
- Verify critical data with other sources
- Never rely solely on electronic navigation
- Keep paper charts as backup
- If using autopilot control, always be ready to take manual control

## Next Steps

- Complete the Interactive Tutorials for detailed walkthroughs
- Configure alarms for depth, anchor drag, and speed
- Create custom dashboard layouts for different scenarios
- Set up autopilot control (if equipped)

Need help? Tap hamburger menu → Help for comprehensive documentation.`,
  category: 'Getting Started',
  tags: ['setup', 'quickstart', 'beginner', 'nmea', 'connection'],
  language: 'en',
  version: '1.0.0',
  lastUpdated: new Date('2025-01-20'),
};

/**
 * FAQ Content
 */
const faqContent: HelpContent = {
  id: 'faq',
  type: 'faq',
  title: 'Frequently Asked Questions',
  description: 'Common questions and answers about BMad Autopilot',
  content: `# Frequently Asked Questions

## Connection & Setup

**Q: What WiFi bridges are compatible?**
A: Any WiFi-enabled NMEA bridge that provides TCP connection to NMEA data streams. Tested devices include:
- Actisense W2K-1
- Digital Yacht WLN10/WLN30
- SeaSmart.NET Gateway
- ShipModul MiniPlex-2Wi
- Most Yacht Devices NMEA servers

**Q: Why can't I connect to my bridge?**
A: Check these common issues:
1. Device is connected to bridge WiFi network
2. Bridge is powered on and functioning
3. Correct IP address entered (check bridge documentation)
4. Correct port number (typically 10110 for NMEA 0183)
5. Firewall not blocking connection

**Q: I'm connected but seeing no data. Why?**
A: Possible causes:
1. Boat instruments are not powered on
2. Bridge is not receiving data from NMEA network
3. Sentence filtering is blocking required data
4. NMEA network wiring issues
5. Bridge configuration needs adjustment

**Q: Can I use cellular data instead of WiFi?**
A: No. The app must connect directly to your boat's WiFi bridge. Cellular data cannot access the local NMEA network.

## Widgets & Display

**Q: How many widgets can I add?**
A: No strict limit, but performance is best with 10-15 widgets. Too many widgets may impact frame rate on older devices.

**Q: Can I create different layouts?**
A: Yes! Create multiple layouts for different scenarios (cruising, racing, anchoring, etc.) and switch between them in the Layouts menu.

**Q: Why is my compass showing incorrect heading?**
A: The compass displays your boat's magnetic heading from the NMEA network. If incorrect:
1. Check compass calibration on your boat
2. Verify NMEA HDG/HDM/HDT sentences are being received
3. Account for magnetic variation vs true heading

## Autopilot Control

**Q: What autopilot systems are supported?**
A: Raymarine autopilots and other systems that accept NMEA autopilot commands (typically via Seatalk or NMEA 2000).

**Q: Is it safe to control autopilot from a phone?**
A: Yes, BUT you must always maintain proper lookout and be ready to take manual control. Treat it the same as using the autopilot's own remote control.

**Q: Can I control multiple autopilots?**
A: No. One autopilot system per NMEA network.

**Q: What if I lose WiFi connection while autopilot is engaged?**
A: Your autopilot continues operating normally. Loss of app connection does not disengage the autopilot - you must disengage it manually or via the app when reconnected.

## Alarms

**Q: Will alarms sound if app is in background?**
A: On iOS and Android, background operation depends on OS power management. For critical alarms, we recommend keeping the app active and device screen on (use brightness controls to save power).

**Q: Can I customize alarm sounds?**
A: Currently the app uses built-in alarm tones optimized for marine environments. Custom sounds may be added in future updates.

**Q: Why didn't my depth alarm trigger?**
A: Check:
1. Alarm is enabled
2. Threshold is set correctly
3. Depth sounder is transmitting data
4. App has proper permissions for notifications

## Performance & Battery

**Q: Why does the app use so much battery?**
A: Marine instrument apps require continuous WiFi connection, data processing, and screen-on time. Tips to extend battery life:
- Enable power saving mode
- Reduce screen brightness
- Remove unused widgets
- Use device with larger battery
- Keep device on boat power

**Q: App is laggy/slow. How can I improve performance?**
A: Try:
1. Restart the app
2. Reduce number of active widgets
3. Close other background apps
4. Update to latest app version
5. Ensure device isn't overheating

## Data Privacy & Offline Use

**Q: Does the app send my location data anywhere?**
A: No. All data stays on your device. The app operates entirely offline (except for help content updates).

**Q: Do I need internet connection?**
A: No. After initial installation, the app works entirely offline. You only need connection to your boat's WiFi bridge.

**Q: Where is my data stored?**
A: All settings, layouts, and history are stored locally on your device in the app's private storage.

## Troubleshooting

**Q: App crashed or froze. What should I do?**
A: 1) Force close and restart the app, 2) If problem persists, reinstall the app (settings will be preserved), 3) Contact support with diagnostic report.

**Q: How do I report a bug?**
A: Hamburger menu → Help → Contact Support. Include diagnostic report for faster resolution.

**Q: Can I get a refund?**
A: Contact support within 30 days of purchase for refund requests. Please let us help troubleshoot first!

## Updates & Features

**Q: How do I update the app?**
A: Updates are delivered through App Store (iOS), Google Play (Android), or the web (desktop). Enable automatic updates for latest features and fixes.

**Q: Can you add feature X?**
A: We love feature requests! Hamburger menu → Help → Feedback to submit ideas.

**Q: Is there a desktop version?**
A: Yes! The web version works on desktop browsers (Chrome, Firefox, Safari, Edge).`,
  category: 'FAQ',
  tags: ['faq', 'questions', 'common', 'help', 'troubleshooting'],
  language: 'en',
  version: '1.0.0',
  lastUpdated: new Date('2025-01-20'),
};

/**
 * Equipment Compatibility Guide
 */
const equipmentCompatibilityContent: HelpContent = {
  id: 'equipment-compatibility',
  type: 'reference',
  title: 'Equipment Compatibility Guide',
  description: 'Compatible WiFi bridges, autopilots, and marine electronics',
  content: `# Equipment Compatibility Guide

## WiFi NMEA Bridges (Tested & Verified)

### Actisense W2K-1
- **Status**: ✅ Fully Compatible
- **Connection**: WiFi (2.4GHz)
- **Default IP**: 192.168.1.1
- **Port**: 10110 (NMEA 0183)
- **Notes**: Excellent reliability, supports both NMEA 0183 and 2000

### Digital Yacht WLN10
- **Status**: ✅ Fully Compatible
- **Connection**: WiFi (2.4GHz)
- **Default IP**: 192.168.1.1
- **Port**: 10110
- **Notes**: Popular, affordable option with good performance

### SeaSmart.NET Gateway
- **Status**: ✅ Fully Compatible
- **Connection**: WiFi (2.4GHz)
- **Default IP**: Varies by model
- **Port**: 10110
- **Notes**: Multiple models available for different vessel sizes

### ShipModul MiniPlex-2Wi
- **Status**: ✅ Fully Compatible
- **Connection**: WiFi (2.4GHz)
- **Default IP**: 192.168.1.1
- **Port**: 10110
- **Notes**: Professional-grade multiplexer with WiFi

### Yacht Devices YDWG-02
- **Status**: ✅ Fully Compatible
- **Connection**: WiFi (2.4GHz)
- **Default IP**: 192.168.1.1
- **Port**: 2597 (NMEA 2000)
- **Notes**: NMEA 2000 gateway, excellent build quality

## Autopilot Systems

### Raymarine
- **Models**: EV-100, EV-200, Evolution, SPX, ST6000+, ST7000+
- **Status**: ✅ Fully Supported
- **Protocol**: SeaTalk/SeaTalk NG (NMEA 2000)
- **Control**: Full remote control capability
- **Notes**: Most comprehensive support

### Simrad/B&G
- **Models**: AP24, AP28, AP44, NAC-2/3, WS320
- **Status**: ✅ Compatible
- **Protocol**: NMEA 2000
- **Control**: Basic remote control
- **Notes**: Requires NMEA 2000 connection

### Garmin
- **Models**: GHP, Reactor 40
- **Status**: ⚠️ Partial Support
- **Protocol**: NMEA 2000
- **Control**: Monitoring only
- **Notes**: Garmin proprietary protocol limits control features

### Furuno NavPilot
- **Models**: NavPilot 300, 511, 711C
- **Status**: ⚠️ Partial Support
- **Protocol**: NMEA 0183/2000
- **Control**: Monitoring only
- **Notes**: Limited remote control capabilities

## Marine Electronics

### GPS/Chartplotters
- ✅ All NMEA-compatible GPS units
- ✅ Garmin, Raymarine, Simrad, Furuno, Lowrance, Humminbird

### Depth Sounders
- ✅ Any unit outputting DBT, DPT, or DBK sentences
- ✅ All major brands (Garmin, Raymarine, Airmar, etc.)

### Wind Instruments
- ✅ Any unit outputting MWV, MWD sentences
- ✅ All major brands

### Speed/Log
- ✅ Any unit outputting VHW, VLW sentences  
- ✅ Paddle wheel and ultrasonic sensors

### AIS
- ✅ All AIS receivers/transceivers
- ✅ Class A and Class B units

### Weather Stations
- ✅ Airmar WeatherStation
- ✅ Maretron WSO100
- ✅ Any NMEA-compatible weather sensor

## Not Compatible

❌ Proprietary systems without NMEA output:
- Older pre-NMEA instruments
- Standalone GPS without NMEA
- Non-marine equipment

❌ Bluetooth-only devices:
- App requires WiFi TCP connection
- Bluetooth bridges not supported

## Compatibility Tips

1. **Check NMEA Output**: Verify your equipment outputs standard NMEA sentences
2. **Bridge Selection**: Choose a bridge that matches your NMEA network type (0183 vs 2000)
3. **Autopilot Control**: Requires bidirectional communication - verify your autopilot supports remote commands
4. **Multiplexing**: If mixing NMEA 0183 and 2000, use appropriate gateway
5. **Testing**: Most equipment can be tested for compatibility without purchase - check manufacturer specs

## Need Help?

Not sure if your equipment is compatible? Contact support with your equipment list for personalized compatibility advice.`,
  category: 'Equipment',
  tags: ['compatibility', 'equipment', 'hardware', 'wifi', 'nmea', 'autopilot'],
  language: 'en',
  version: '1.0.0',
  lastUpdated: new Date('2025-01-20'),
};

/**
 * Marine Best Practices Guide
 */
const bestPracticesContent: HelpContent = {
  id: 'marine-best-practices',
  type: 'guide',
  title: 'Marine Use Best Practices',
  description: 'Safety guidelines and best practices for using BMad Autopilot on your boat',
  content: `# Marine Use Best Practices

## Safety First

### Primary Rule of Marine Navigation
**Electronic aids are exactly that - aids.** They supplement, but never replace:
- Proper lookout (visual and auditory)
- Situational awareness
- Good seamanship
- Paper charts as backup
- Knowledge of navigation rules

### When NOT to Use Autopilot
- ❌ Heavy traffic areas
- ❌ Restricted waters (narrow channels, harbors)
- ❌ Poor visibility (fog, rain, night without radar)
- ❌ High seas/rough weather
- ❌ Near hazards (rocks, shoals, other vessels)
- ❌ When required to maneuver frequently
- ❌ In shipping lanes without constant monitoring

### Emergency Preparedness
- Always know how to disengage autopilot instantly
- Keep emergency tiller/manual steering accessible
- Have backup power for critical navigation equipment
- Maintain paper charts for your cruising area
- Know your vessel's manual steering systems

## Device Setup & Mounting

### Screen Visibility
- Mount device to avoid sun glare
- Position for easy viewing from helm
- Consider anti-glare screen protectors
- Adjust brightness for conditions (bright sun vs night)
- Use red-night mode to preserve night vision

### Power Management
- Keep device charged or on boat power
- Carry backup battery pack
- Enable power saving mode for extended use
- Consider waterproof power bank for cockpit mounting
- Monitor battery level regularly

### Weather Protection
- Use waterproof case or mount
- Protect from spray and rain
- Avoid prolonged direct sunlight (overheating)
- Have backup device available
- Test in dry conditions before relying at sea

## Data Reliability

### Verify Critical Information
- Cross-check depth readings before entering shallow water
- Verify GPS position with visual navigation
- Compare autopilot course with compass
- Confirm AIS targets match visual observations
- Test alarms before critical situations

### Sensor Calibration
- Ensure compass is properly calibrated
- Verify depth sounder offset for your vessel
- Check wind instrument calibration
- Confirm speed sensor accuracy
- Review all calibrations annually

### Data Quality Monitoring
- Watch for intermittent connections
- Note any unusual readings
- Investigate repeated alarms
- Monitor WiFi signal strength
- Log any persistent issues

## Autopilot Operation

### Before Engaging
1. ✅ Check clear water ahead
2. ✅ Verify autopilot mode and settings
3. ✅ Establish steady course
4. ✅ Confirm sufficient sea room
5. ✅ Set appropriate course
6. ✅ Test response before relying

### While Operating
- Maintain constant lookout
- Monitor course and position regularly
- Be ready to disengage instantly
- Adjust for current/wind changes
- Never leave helm unattended in busy waters

### Course Changes
- Plan changes well in advance
- Verify new course is safe
- Make gradual adjustments in rough seas
- Watch for unexpected course deviations
- Verify course change was executed

## Alarm Configuration

### Depth Alarm
- Set to draft + 3ft/1m minimum
- Adjust for tide and wave action
- Lower threshold in unfamiliar waters
- Test before entering shallow areas
- Never ignore depth warnings

### Anchor Alarm
- Set radius appropriate for conditions
- Account for tide swing
- Larger radius in strong current/wind
- Test immediately after anchoring
- Respond immediately to alert

### Speed Alarms
- Set for no-wake zones
- Monitor fuel economy ranges
- Alert for excessive speed in rough seas
- Adjust for local regulations
- Use for safe cruising speeds

## Connectivity Management

### WiFi Best Practices
- Maintain line-of-sight to bridge when possible
- Monitor connection quality indicator
- Reconnect promptly if connection drops
- Position bridge centrally on boat
- Minimize metal obstructions

### Data Rate Considerations
- Don't overload with unnecessary sentences
- Filter data to essential only
- Monitor update rates (1-2 Hz typical)
- Balance data detail vs performance
- Disable unused data sources

## Maintenance & Updates

### Regular Checks
- Weekly: Test alarm sounds
- Weekly: Verify sensor readings
- Monthly: Review and update software
- Monthly: Check all connections
- Seasonally: Full system test

### Before Major Passages
1. Update app to latest version
2. Test all critical functions
3. Verify backup navigation tools
4. Check equipment compatibility
5. Review emergency procedures
6. Test in controlled conditions first

### Winter Storage
- Back up settings and layouts
- Document configuration
- Remove devices from boat
- Protect bridge from moisture
- Test everything before launch

## Weather Considerations

### Rough Seas
- Secure all devices
- Consider autopilot reliability in heavy seas
- Reduce screen brightness to save power
- Enable most critical widgets only
- Have manual backup plan ready

### Lightning Risk
- Disconnect electronics if possible
- Stay below during electrical storms
- Avoid using devices near lightning
- Check equipment after strikes
- Maintain proper grounding

### Temperature Extremes
- Protect devices from overheating
- Cold can affect battery life
- Allow devices to warm/cool gradually
- Watch for condensation
- Store in climate-controlled area when not in use

## Legal & Responsibility

### Remember
- You are always the captain
- Electronics can fail - have backups
- Manufacturer not liable for navigation decisions
- You are responsible for safe navigation
- Comply with all maritime laws and regulations
- Maintain proper certifications and documentation

## Community & Support

- Share experiences with other users
- Report bugs and issues promptly
- Suggest improvements
- Help new users learn
- Follow safe boating practices
- Promote responsible marine electronics use

---

**Bottom Line**: Technology is wonderful, but seamanship, preparation, and sound judgment keep you safe. Use this app as one tool in your navigation toolkit, never as your only tool.`,
  category: 'Safety & Best Practices',
  tags: ['safety', 'best-practices', 'marine', 'seamanship', 'guidelines'],
  language: 'en',
  version: '1.0.0',
  lastUpdated: new Date('2025-01-20'),
};

/**
 * All default help content
 */
export const defaultHelpContent: HelpContent[] = [
  gettingStartedContent,
  faqContent,
  equipmentCompatibilityContent,
  bestPracticesContent,
];

export default defaultHelpContent;
