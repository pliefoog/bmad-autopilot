#!/bin/bash

# Fix imports in tier1-unit directory
# Files that are 2 levels deep (tier1-unit/widgets/file.test.tsx) need ../../src/ -> ../../../src/
# Files that are 3 levels deep (tier1-unit/services/nmea/file.test.ts) need ../../src/ -> ../../../../src/

echo "Fixing import paths in tier1-unit tests..."

# Fix files that are exactly 2 levels deep (tier1-unit/category/)
find __tests__/tier1-unit -maxdepth 2 -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Processing: $file"
  sed -i '' 's|from ["'"'"']\.\.\/src\/|from "../../../src/|g' "$file"
  sed -i '' 's|import ["'"'"']\.\.\/src\/|import "../../../src/|g' "$file"
done

# Fix files that are 3 or more levels deep
find __tests__/tier1-unit -mindepth 3 -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Processing: $file"
  # Count the depth to determine how many ../../../ we need
  depth=$(echo "$file" | tr '/' '\n' | wc -l)
  depth=$((depth - 2))  # Subtract for __tests__ and tier1-unit
  
  # Build the correct path prefix
  prefix=""
  for ((i=0; i<depth; i++)); do
    prefix="../$prefix"
  done
  prefix="${prefix}../src/"
  
  sed -i '' "s|from [\"']\.\.\/\.\.\/src\/|from \"$prefix|g" "$file"
  sed -i '' "s|import [\"']\.\.\/\.\.\/src\/|import \"$prefix|g" "$file"
done

echo "Import path fixes complete."
