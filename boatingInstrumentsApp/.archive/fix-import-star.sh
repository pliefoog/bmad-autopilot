#!/bin/bash

echo "Fixing import * syntax errors..."

# Find all files with "import * from" and fix them
grep -r -l "import \* from" __tests__/tier*-* | while read file; do
  echo "Processing: $file"
  
  # Fix common patterns based on what we know these modules export
  
  # HeaderBar exports default
  sed -i '' 's|import \* from "\(.*\)/HeaderBar"|import HeaderBar from "\1/HeaderBar"|g' "$file"
  
  # Store modules typically export named hooks
  sed -i '' 's|import \* from "\(.*\)/nmeaStore"|import { useNmeaStore } from "\1/nmeaStore"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/themeStore"|import { useTheme } from "\1/themeStore"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/settingsStore"|import { useSettingsStore } from "\1/settingsStore"|g' "$file"
  
  # Widget components typically export default
  sed -i '' 's|import \* from "\(.*\)/\([A-Z][a-zA-Z]*Widget\)"|import \2 from "\1/\2"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/WidgetCard"|import WidgetCard from "\1/WidgetCard"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/DepthWidget"|import DepthWidget from "\1/DepthWidget"|g' "$file"
  
  # Components typically export default  
  sed -i '' 's|import \* from "\(.*\)/\([A-Z][a-zA-Z]*\)"|import \2 from "\1/\2"|g' "$file"
  
  # Hooks typically export named
  sed -i '' 's|import \* from "\(.*\)/useOnboarding"|import { useOnboarding } from "\1/useOnboarding"|g' "$file"
  
  # Utils might have mixed exports, use * as syntax
  sed -i '' 's|import \* from "\(.*\)/themeCompliance"|import * as themeCompliance from "\1/themeCompliance"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/widgetStyles"|import * as widgetStyles from "\1/widgetStyles"|g' "$file"
  
done

echo "Import * fixes complete."
