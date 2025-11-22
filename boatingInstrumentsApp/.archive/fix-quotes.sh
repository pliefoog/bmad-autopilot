#!/bin/bash

echo "Fixing quote mismatches in import statements..."

# Fix files where single quotes were mixed with double quotes
find __tests__/tier*-* -name "*.ts" -o -name "*.tsx" | while read file; do
  # Fix mixed quote patterns - change double quotes followed by single quote to double quotes
  sed -i '' 's|from "../../../src/\([^'"'"']*\)'"'"'|from "../../../src/\1"|g' "$file"
  # Fix other mixed patterns
  sed -i '' 's|from '"'"'../../../src/\([^"]*\)"|from "../../../src/\1"|g' "$file"
done

echo "Quote fixes complete."
