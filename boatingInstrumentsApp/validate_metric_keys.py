#!/usr/bin/env python3
"""
Validate that all metricKey references in widgets exist in sensor schemas
"""

import re
import os
from pathlib import Path

# Parse sensor schemas
schema_file = Path('src/registry/sensorSchemas.ts').read_text()

# Extract sensor fields (manual approach for complex schemas)
schemas = {}

# Split into sensor blocks
sensor_blocks = re.split(r'\n  ([a-z]+): \{', schema_file)
for i in range(1, len(sensor_blocks), 2):
    sensor_type = sensor_blocks[i]
    sensor_content = sensor_blocks[i + 1] if i + 1 < len(sensor_blocks) else ''
    
    if sensor_type in ['critical', 'warning']:
        continue
    
    # Find fields section
    fields_match = re.search(r'fields: \{([\s\S]*?)\n    \}', sensor_content)
    if not fields_match:
        continue
    
    fields_block = fields_match.group(1)
    fields = [m.group(1) for m in re.finditer(r'^      ([a-zA-Z]+):', fields_block, re.MULTILINE)]
    schemas[sensor_type] = fields

print("=== SENSOR SCHEMAS ===")
for sensor in sorted(schemas.keys()):
    print(f"{sensor}: {', '.join(schemas[sensor])}")
print()

# Extract widget references
widgets_dir = Path('src/widgets')
widget_refs = []

for widget_file in widgets_dir.glob('*Widget.tsx'):
    content = widget_file.read_text()
    # Find all sensorType="X" ... metricKey="Y" patterns
    for match in re.finditer(r'sensorType="([a-z]+)"[^>]*metricKey="([^"]+)"', content):
        sensor_type = match.group(1)
        metric_key = match.group(2)
        # Strip virtual metric suffixes
        base_metric = re.sub(r'\.(min|max|avg)$', '', metric_key)
        widget_refs.append({
            'file': widget_file.name,
            'sensorType': sensor_type,
            'metricKey': base_metric,
            'original': metric_key
        })

print("=== VALIDATION RESULTS ===")
errors = []
warnings = []
seen = set()

for ref in widget_refs:
    key = f"{ref['file']}|{ref['sensorType']}|{ref['metricKey']}"
    if key in seen:
        continue
    seen.add(key)
    
    if ref['sensorType'] not in schemas:
        errors.append(f"❌ {ref['file']}: Unknown sensor type '{ref['sensorType']}'")
        continue
    
    if ref['metricKey'] not in schemas[ref['sensorType']]:
        errors.append(f"❌ {ref['file']}: {ref['sensorType']}.{ref['metricKey']} does NOT exist in schema")
        errors.append(f"   Schema has: {', '.join(schemas[ref['sensorType']])}")

# Check for dynamic refs in CustomWidget
if (widgets_dir / 'CustomWidget.tsx').exists():
    warnings.append('⚠️  CustomWidget.tsx uses dynamic metricKey - cannot validate statically')

if not errors and not warnings:
    print("✅ ALL METRIC KEYS ARE VALID")
else:
    for error in errors:
        print(error)
    for warning in warnings:
        print(warning)
    print()
    print(f"Total: {len([e for e in errors if e.startswith('❌')])} errors, {len(warnings)} warnings")
