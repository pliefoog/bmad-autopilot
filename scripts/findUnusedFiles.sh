#!/bin/bash
# Find potentially unused TypeScript files
# Usage: ./scripts/findUnusedFiles.sh

echo "🔍 Scanning for unused files..."
echo ""

cd "$(dirname "$0")/.." || exit 1

find boatingInstrumentsApp/src -name "*.ts" -o -name "*.tsx" | while read -r file; do
  # Skip test files, index files, and entry points
  if [[ "$file" == *".test."* ]] || [[ "$file" == *"index.ts"* ]] || [[ "$file" == *"App.tsx"* ]] || [[ "$file" == *"_layout.tsx"* ]]; then
    continue
  fi
  
  filename=$(basename "$file" .ts)
  filename=$(basename "$filename" .tsx)
  
  # Search for imports of this file
  import_count=$(grep -r "from.*['\"].*$filename" boatingInstrumentsApp/src 2>/dev/null | wc -l)
  
  # If no imports found, file might be unused
  if [[ "$import_count" -eq 0 ]]; then
    echo "⚠️  Potentially unused: $file"
  fi
done

echo ""
echo "✅ Scan complete. Review warnings above."
echo "   Note: Files may be dynamically imported or used as entry points - verify manually."
