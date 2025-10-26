#!/bin/bash

# Fix Test Import Paths Script
# Fixes the src/core -> src/store migration import paths in all test files

echo "🔧 Fixing test import paths for src/core -> src/store migration..."

# Fix src/core/nmeaStore -> src/store/nmeaStore
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../src/core/nmeaStore|../src/store/nmeaStore|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../../src/core/nmeaStore|../../src/store/nmeaStore|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../../../src/core/nmeaStore|../../../src/store/nmeaStore|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|'@/core/nmeaStore'|'@/store/nmeaStore'|g"

# Fix src/core/themeStore -> src/store/themeStore  
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../src/core/themeStore|../src/store/themeStore|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../../src/core/themeStore|../../src/store/themeStore|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../../../src/core/themeStore|../../../src/store/themeStore|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|'@/core/themeStore'|'@/store/themeStore'|g"

# Fix src/stores/ -> src/store/ (plural to singular)
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../src/stores/|../src/store/|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../../src/stores/|../../src/store/|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|../../../src/stores/|../../../src/store/|g'
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|'@/stores/|'@/store/|g"

# Fix any remaining @/core references
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|'@/core/|'@/store/|g"
find __tests__ -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|"@/core/|"@/store/|g'

echo "✅ Import path fixes applied to test files"

# Also fix any tests in src/ directory itself
find src -name "*.test.ts" -o -name "*.test.tsx" | xargs sed -i '' 's|../../../stores/|../../../store/|g'

echo "✅ Import path fixes applied to src/ test files"

echo ""
echo "🧪 Testing import path fixes..."
npm test -- --passWithNoTests --bail=1 2>&1 | head -20