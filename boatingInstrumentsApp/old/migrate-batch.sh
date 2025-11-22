#!/bin/bash
# Batch migrate remaining files

echo "🚀 Migrating production files..."

# List of files to migrate (top violators)
FILES=(
  "src/components/errorBoundaries/DataErrorBoundary.tsx"
  "src/components/errorBoundaries/ConnectionErrorBoundary.tsx"
  "src/components/errorBoundaries/WidgetErrorBoundary.tsx"
  "src/components/errorBoundaries/BaseErrorBoundary.tsx"
  "src/widgets/WidgetErrorBoundary.tsx"
  "src/components/marine/LinearBar.tsx"
  "src/components/marine/AnalogGauge.tsx"
  "src/components/alarms/CriticalAlarmVisuals.tsx"
  "src/components/marine/StatusIndicator.tsx"
  "src/components/marine/DigitalDisplay.tsx"
  "src/components/molecules/MetricDisplay.tsx"
  "src/components/help/HelpSearch.tsx"
)

MIGRATED=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    MIGRATED=$((MIGRATED + 1))
  fi
done

echo "✅ Ready to migrate: $MIGRATED files"
