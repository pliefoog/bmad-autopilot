#!/bin/bash

# Android Rebuild Script (Faster - doesn't run prebuild)
# Use this for normal development when you just need to rebuild native code

set -e

echo "🔨 Android Rebuild - Quick native rebuild"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from boatingInstrumentsApp directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Cleaning Android build${NC}"
cd android
./gradlew clean
cd ..

echo ""
echo -e "${YELLOW}Step 2: Removing cached builds${NC}"
rm -rf android/app/build
rm -rf android/build

echo ""
echo -e "${YELLOW}Step 3: Building and running${NC}"
npx expo run:android

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Rebuild complete!"
echo "==========================================${NC}"
echo ""
