#!/bin/bash

# Automated Theme Migration Script
# Finds and replaces common hardcoded color patterns with theme properties

echo "🚀 Starting automated theme migration..."
echo ""

# Color mapping arrays
declare -A COLOR_MAP=(
  ["#FFFFFF"]="theme.text"
  ["#F3F4F6"]="theme.surface"
  ["#F9FAFB"]="theme.surface"
  ["#f8f9fa"]="theme.appBackground"
  ["#ffffff"]="theme.text"
  ["#000000"]="theme.shadow"
  ["#DC2626"]="theme.error"
  ["#dc2626"]="theme.error"
  ["#dc3545"]="theme.error"
  ["#10B981"]="theme.success"
  ["#28a745"]="theme.success"
  ["#3B82F6"]="theme.interactive"
  ["#007bff"]="theme.interactive"
  ["#F59E0B"]="theme.warning"
  ["#ffc107"]="theme.warning"
  ["#6B7280"]="theme.textSecondary"
  ["#6c757d"]="theme.textSecondary"
  ["#9CA3AF"]="theme.textSecondary"
  ["#E5E7EB"]="theme.borderLight"
  ["#e9ecef"]="theme.surfaceHighlight"
  ["#dee2e6"]="theme.borderLight"
  ["#495057"]="theme.text"
  ["#f1f3f4"]="theme.surfaceDim"
)

# Files to process (exclude stories)
FILES=$(find src/components/errorBoundaries src/components/atoms src/components/dialogs src/components/alarms src/components/marine -name "*.tsx" -type f ! -name "*.stories.tsx" 2>/dev/null)

TOTAL_FILES=0
MODIFIED_FILES=0

for file in $FILES; do
  TOTAL_FILES=$((TOTAL_FILES + 1))
  MODIFIED=0
  
  # Check if file has hardcoded colors
  if grep -q '#[0-9A-Fa-f]\{6\}' "$file" 2>/dev/null; then
    echo "Processing: $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Add theme import if not present
    if ! grep -q "import.*useTheme.*ThemeColors.*themeStore" "$file"; then
      # Add import after other imports
      if grep -q "^import.*from 'react'" "$file"; then
        sed -i '' "/^import.*from 'react'/a\\
import { useTheme, ThemeColors } from '../../store/themeStore';\\
import { useMemo } from 'react';
" "$file"
        MODIFIED=1
      fi
    fi
    
    # Replace common color patterns
    for color in "${!COLOR_MAP[@]}"; do
      theme_prop="${COLOR_MAP[$color]}"
      if grep -q "$color" "$file"; then
        # Replace in style objects
        sed -i '' "s/color: '$color'/color: $theme_prop/g" "$file"
        sed -i '' "s/backgroundColor: '$color'/backgroundColor: $theme_prop/g" "$file"
        sed -i '' "s/borderColor: '$color'/borderColor: $theme_prop/g" "$file"
        MODIFIED=1
      fi
    done
    
    if [ $MODIFIED -eq 1 ]; then
      echo "  ✅ Modified"
      MODIFIED_FILES=$((MODIFIED_FILES + 1))
    else
      # Restore from backup if no changes
      mv "$file.bak" "$file"
    fi
  fi
done

echo ""
echo "📊 Migration Summary:"
echo "   Total files scanned: $TOTAL_FILES"
echo "   Files modified: $MODIFIED_FILES"
echo ""
echo "⚠️  Manual review required for:"
echo "   - Complex color calculations"
echo "   - Inline style objects"
echo "   - Dynamic color generation"
echo ""
echo "✅ Run './audit-theme-migration.sh' to check remaining violations"
