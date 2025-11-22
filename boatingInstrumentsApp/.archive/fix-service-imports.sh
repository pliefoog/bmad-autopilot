#!/bin/bash

echo "Fixing remaining service import * patterns..."

# Fix service imports that export classes and enums
grep -r -l "import \* from.*services" __tests__/tier*-* | while read file; do
  echo "Processing: $file"
  
  # Autopilot service exports AutopilotCommandManager class and AutopilotMode enum
  sed -i '' 's|import \* from "\(.*\)/autopilotService"|import { AutopilotCommandManager, AutopilotMode } from "\1/autopilotService"|g' "$file"
  
  # Other autopilot services typically export classes with similar names
  sed -i '' 's|import \* from "\(.*\)/autopilotRetryManager"|import { AutopilotRetryManager } from "\1/autopilotRetryManager"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/autopilotErrorManager"|import { AutopilotErrorManager } from "\1/autopilotErrorManager"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/autopilotSafetyManager"|import { AutopilotSafetyManager } from "\1/autopilotSafetyManager"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/autopilotMonitoringService"|import { AutopilotMonitoringService } from "\1/autopilotMonitoringService"|g' "$file"
  sed -i '' 's|import \* from "\(.*\)/autopilotCommandQueue"|import { autopilotCommandQueue } from "\1/autopilotCommandQueue"|g' "$file"
  
  # Layout service typically exports class and types
  sed -i '' 's|import \* from "\(.*\)/layoutService"|import { LayoutService, WidgetLayout } from "\1/layoutService"|g' "$file"
  
  # If there are still generic service patterns, use * as syntax as fallback
  sed -i '' 's|import \* from "\(.*\)/\([a-zA-Z]*Service\)"|import * as \2 from "\1/\2"|g' "$file"
done

echo "Service import fixes complete."
