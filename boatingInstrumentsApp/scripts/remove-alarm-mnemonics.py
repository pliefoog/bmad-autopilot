#!/usr/bin/env python3
"""Remove mnemonics from alarmMetrics sections"""
import re

filepath = '/Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp/src/registry/SensorConfigRegistry.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Pattern to find alarmMetrics arrays and remove mnemonic lines within them
# Match from "alarmMetrics: [" to the closing "],"
alarm_metrics_pattern = re.compile(
    r'(alarmMetrics:\s*\[)(.*?)(\],)',
    re.DOTALL
)

def remove_mnemonics_from_block(match):
    """Remove mnemonic lines from an alarmMetrics block"""
    prefix = match.group(1)
    body = match.group(2)
    suffix = match.group(3)
    
    # Remove lines containing "mnemonic: '...'"
    lines = body.split('\n')
    filtered_lines = [line for line in lines if 'mnemonic:' not in line]
    
    return prefix + '\n'.join(filtered_lines) + suffix

# Replace all alarmMetrics blocks
result = alarm_metrics_pattern.sub(remove_mnemonics_from_block, content)

with open(filepath, 'w') as f:
    f.write(result)

print("✅ Removed mnemonics from alarmMetrics sections")
