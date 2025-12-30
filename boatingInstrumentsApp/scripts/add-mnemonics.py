#!/usr/bin/env python3
"""
Add mnemonics to all fields in SensorConfigRegistry.ts

This script is idempotent - it will skip fields that already have mnemonics.
"""

import re

# Comprehensive mnemonic mappings for all sensor types
MNEMONICS = {
    # Battery (DONE)
    'name': 'NAME',
    'chemistry': 'CHEM',
    'capacity': 'CAP',
    'voltage': 'VLT',
    'nominalVoltage': 'NOM',
    'current': 'AMP',
    'temperature': 'TMP',
    'stateOfCharge': 'SOC',
    
    # Depth
    'depth': 'DPT',
    'depthSource': 'SRC',
    'depthReferencePoint': 'REF',
    'offset': 'OFS',
    
    # Engine
    'engineType': 'TYPE',
    'maxRpm': 'MAX',
    'rpm': 'RPM',
    'coolantTemp': 'ECT',
    'oilPressure': 'EOP',
    'alternatorVoltage': 'ALT',
    'fuelRate': 'FLOW',
    'hours': 'EHR',
    'shaftRpm': 'SRPM',
    'engineEfficiency': 'EFF',
    
    # Wind
    'speed': 'SPD',
    'direction': 'DIR',
    'trueSpeed': 'TWS',
    'trueDirection': 'TWD',
    'apparentSpeed': 'AWS',
    'apparentDirection': 'AWA',
    
    # Speed
    'throughWater': 'STW',
    'overGround': 'SOG',
    'trueSpeed': 'TS',
    
    # Temperature
    'value': 'VAL',
    'source': 'SRC',
    'location': 'LOC',
    
    # Compass
    'heading': 'HDG',
    'magneticHeading': 'HDM',
    'trueHeading': 'HDT',
    'variation': 'VAR',
    'deviation': 'DEV',
    'pitch': 'PTCH',
    'roll': 'ROLL',
    'rateOfTurn': 'ROT',
    
    # GPS
    'latitude': 'LAT',
    'longitude': 'LON',
    'altitude': 'ALT',
    'speedOverGround': 'SOG',
    'courseOverGround': 'COG',
    'numberOfSatellites': 'SATS',
    'horizontalDilutionOfPrecision': 'HDOP',
    'fixQuality': 'FIX',
    'positionMode': 'MODE',
    
    # Autopilot
    'mode': 'MODE',
    'state': 'STAT',
    'headingTarget': 'TGT',
    'headingLocked': 'LCK',
    'rudderAngle': 'RUD',
    'rudderDirection': 'RDIR',
    'offCourse': 'XTE',
    'offCourseDirection': 'XDIR',
    
    # Navigation
    'crossTrackError': 'XTE',
    'bearingToWaypoint': 'BTW',
    'distanceToWaypoint': 'DTW',
    'bearingOriginToDestination': 'BOD',
    'waypointId': 'WPT',
    'eta': 'ETA',
    
    # Weather
    'airTemperature': 'ATMP',
    'barometricPressure': 'BARO',
    'humidity': 'HUM',
    'dewPoint': 'DEW',
    'waterTemperature': 'WTMP',
    'windSpeed': 'WSPD',
    'windDirection': 'WDIR',
    'apparentWindSpeed': 'AWS',
    'apparentWindDirection': 'AWA',
    'trueWindSpeed': 'TWS',
    'trueWindDirection': 'TWD',
    'gustSpeed': 'GUST',
    'gustDirection': 'GDIR',
    'visibility': 'VIS',
    'cloudCoverage': 'CLDS',
    'precipitation': 'PRCP',
    
    # Tank
    'tankType': 'TYPE',
    'level': 'LVL',
    'capacity': 'CAP',
    'volume': 'VOL',
    'remaining': 'REM',
    
    # Rudder
    'rudderAngle': 'RUD',
    'rudderPosition': 'POS',
}

def add_mnemonic_to_field(field_text, key_name):
    """Add mnemonic to a field definition if not present."""
    # Check if field already has mnemonic
    if 'mnemonic:' in field_text:
        return field_text
    
    # Get mnemonic for this key
    mnemonic = MNEMONICS.get(key_name)
    if not mnemonic:
        print(f"WARNING: No mnemonic defined for key '{key_name}' - using uppercase key")
        mnemonic = key_name.upper()[:5]  # Fallback: first 5 chars of uppercase key
    
    # Find where to insert mnemonic (after label line)
    lines = field_text.split('\n')
    new_lines = []
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        # Insert mnemonic after label line
        if 'label:' in line and i + 1 < len(lines):
            indent = len(line) - len(line.lstrip())
            mnemonic_line = ' ' * indent + f"mnemonic: '{mnemonic}',"
            new_lines.append(mnemonic_line)
    
    return '\n'.join(new_lines)

def process_file(filepath):
    """Process SensorConfigRegistry.ts file."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find all field definitions: { key: 'xxx', ... }
    # Pattern matches field object with key property
    field_pattern = re.compile(
        r'(\{[\s]*key:\s*[\'"](\w+)[\'"],[\s\S]*?\}),',
        re.MULTILINE
    )
    
    processed = []
    last_end = 0
    
    for match in field_pattern.finditer(content):
        field_text = match.group(1)
        key_name = match.group(2)
        
        # Add everything before this field
        processed.append(content[last_end:match.start(1)])
        
        # Process the field
        updated_field = add_mnemonic_to_field(field_text, key_name)
        processed.append(updated_field)
        
        last_end = match.end(1)
    
    # Add remaining content
    processed.append(content[last_end:])
    
    # Write back
    result = ''.join(processed)
    with open(filepath, 'w') as f:
        f.write(result)
    
    print(f"✅ Processed {filepath}")

if __name__ == '__main__':
    registry_path = '/Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp/src/registry/SensorConfigRegistry.ts'
    process_file(registry_path)
    print("🎉 Done! All mnemonics added.")
