#!/bin/bash
# Find potentially unused imports in TypeScript files
# Usage: ./scripts/findUnusedImports.sh

echo "🔍 Scanning for unused imports..."
echo ""

cd "$(dirname "$0")/.." || exit 1

find boatingInstrumentsApp/src -name "*.ts" -o -name "*.tsx" | while read -r file; do
  # Skip test files and .d.ts files
  if [[ "$file" == *".test."* ]] || [[ "$file" == *".d.ts" ]]; then
    continue
  fi
  
  # Extract imports and check if they're used
  grep -E "^import .* from" "$file" 2>/dev/null | while read -r line; do
    # Extract imported names (handle default and named imports)
    imported=$(echo "$line" | sed -E "s/import[[:space:]]+\{?([^}]*)\}?.*/\1/" | tr ',' '\n' | sed 's/[[:space:]]//g')
    
    for item in $imported; do
      # Skip if item is empty or contains 'type' keyword
      if [[ -z "$item" ]] || [[ "$item" == "type" ]]; then
        continue
      fi
      
      # Count occurrences (excluding the import line itself)
      count=$(grep -c "$item" "$file" 2>/dev/null || echo "0")
      
      # If only appears once (the import line), it might be unused
      if [[ "$count" -eq 1 ]]; then
        echo "⚠️  Potentially unused: $item in $file"
      fi
    done
  done
done

echo ""
echo "✅ Scan complete. Review warnings above."
echo "   Note: Some imports may be used in JSX or type annotations - verify manually."
