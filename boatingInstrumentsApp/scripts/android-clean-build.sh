#!/bin/bash

# Android Clean Build Script
# This script ensures native modules (TCP/UDP sockets) are properly linked
# Use this script when hot reload breaks native module linking

set -e

echo "🧹 Android Clean Build - Ensuring Native Module Linking"
echo "========================================================="
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

echo -e "${YELLOW}Step 1: Cleaning Metro bundler cache${NC}"
npx expo start --clear || true

echo ""
echo -e "${YELLOW}Step 2: Cleaning Android build artifacts${NC}"
cd android
./gradlew clean || {
    echo -e "${RED}❌ Gradle clean failed${NC}"
    cd ..
    exit 1
}
cd ..

echo ""
echo -e "${YELLOW}Step 3: Removing Android build directories${NC}"
rm -rf android/app/build
rm -rf android/build
rm -rf android/.gradle

echo ""
echo -e "${YELLOW}Step 4: Running Expo prebuild (clean)${NC}"
npx expo prebuild --clean --platform android

echo ""
echo -e "${YELLOW}Step 5: Verifying native module linking${NC}"
echo "Checking for react-native-tcp-socket in gradle..."
if grep -r "react-native-tcp-socket" android/ > /dev/null; then
    echo -e "${GREEN}✅ TCP socket module found in gradle files${NC}"
else
    echo -e "${RED}⚠️  Warning: TCP socket module not found in gradle files${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Building and running Android app${NC}"
npx expo run:android

echo ""
echo -e "${GREEN}========================================================="
echo "✅ Clean build complete!"
echo "=========================================================${NC}"
echo ""
echo "If you still see TCP linking errors, try:"
echo "  1. Stop the Metro bundler (Ctrl+C)"
echo "  2. Close the Android app"
echo "  3. Run: cd android && ./gradlew clean"
echo "  4. Run this script again"
echo ""
