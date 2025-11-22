#!/bin/bash

echo "=== THEME MIGRATION AUDIT ==="
echo ""
echo "Scanning for hardcoded colors in app/ and src/..."
echo ""

# Count hex colors
HEX_COUNT=$(grep -r --include="*.tsx" '#[0-9A-Fa-f]\{6\}\|#[0-9A-Fa-f]\{3\}[^0-9A-Fa-f]' app src 2>/dev/null | wc -l | tr -d ' ')

# Count rgba colors  
RGBA_COUNT=$(grep -r --include="*.tsx" 'rgba\?(' app src 2>/dev/null | wc -l | tr -d ' ')

# Total
TOTAL=$((HEX_COUNT + RGBA_COUNT))

echo "📊 Total hardcoded colors found: $TOTAL"
echo "   - Hex colors: $HEX_COUNT"
echo "   - RGB/RGBA colors: $RGBA_COUNT"
echo ""

# Count files with violations
FILES_COUNT=$(find app src -name "*.tsx" -type f -exec grep -l '#[0-9A-Fa-f]\{6\}\|#[0-9A-Fa-f]\{3\}[^0-9A-Fa-f]\|rgba\?(' {} \; 2>/dev/null | wc -l | tr -d ' ')
echo "📁 Files with violations: $FILES_COUNT"
echo ""

# List top 20 files by violation count
echo "📁 Top 20 files with most violations:"
find app src -name "*.tsx" -type f -exec sh -c 'count=$(grep -c "#[0-9A-Fa-f]\{6\}\|#[0-9A-Fa-f]\{3\}[^0-9A-Fa-f]\|rgba\?(" "$1" 2>/dev/null); if [ "$count" -gt 0 ]; then echo "$count $1"; fi' _ {} \; 2>/dev/null | sort -rn | head -20

echo ""
echo "✅ See THEME-MIGRATION-GUIDE.md for migration patterns"
echo "✅ See THEME-MIGRATION-PROGRESS.md for detailed progress tracking"
echo "✅ Theme properties expanded in src/store/themeStore.ts"
echo ""
echo "📋 Completed migrations this session:"
echo "   ✅ AutopilotControlScreen.tsx (35 colors)"
echo "   ✅ MaritimeSettingsConfiguration.tsx (28 colors)"
echo "   ✅ app/settings.tsx (15 colors)"
echo "   ✅ app/widget-selector.tsx (4 colors)"
echo "   ✅ app/+not-found.tsx (4 colors)"
echo ""
echo "🎯 Next priority files:"
echo "   1. Dashboard components (high priority)"
echo "   2. Dialog components (high priority)"
echo "   3. Atomic components (medium priority)"
