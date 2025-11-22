#!/bin/bash
# Quick fix for widget styling consistency

echo "🔧 Applying consistent styling fixes to all migrated widgets..."

# List of widgets that need styling fixes
widgets=(
  "TanksWidget"
  "RudderPositionWidget" 
  "WaterTemperatureWidget"
  "ThemeSwitcher"
)

for widget in "${widgets[@]}"; do
  echo "Fixing ${widget}..."
  
  # Replace orange accent borders with clean gray borders
  sed -i '' 's/borderColor: pinned ? theme.accent :/borderColor: '\''#E5E7EB'\'',/g' "src/widgets/${widget}.tsx" 2>/dev/null || true
  
  # Replace elevation and shadow with simple styling
  sed -i '' '/elevation: 2,/d' "src/widgets/${widget}.tsx" 2>/dev/null || true
  sed -i '' '/shadowColor:/d' "src/widgets/${widget}.tsx" 2>/dev/null || true
  sed -i '' '/shadowOffset:/d' "src/widgets/${widget}.tsx" 2>/dev/null || true
  sed -i '' '/shadowOpacity:/d' "src/widgets/${widget}.tsx" 2>/dev/null || true
  sed -i '' '/shadowRadius:/d' "src/widgets/${widget}.tsx" 2>/dev/null || true
  
  # Update border radius to match consistent pattern
  sed -i '' 's/borderRadius: 12,/borderRadius: 8,/g' "src/widgets/${widget}.tsx" 2>/dev/null || true
  
  echo "✅ ${widget} styling updated"
done

echo "🎉 All widget styling fixes applied!"
echo ""
echo "Key changes made:"
echo "  • Removed orange accent color overuse"
echo "  • Standardized to clean gray borders (#E5E7EB)"
echo "  • Removed excessive shadows and elevation"
echo "  • Consistent 8px border radius"
echo ""
echo "Next: Update JSX structure to use proper carets and pin controls"