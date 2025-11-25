#!/bin/bash

# Native Module Link Verification Script
# Checks if TCP/UDP native modules are properly linked in Android build

echo "🔍 Checking Native Module Linking Status"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from boatingInstrumentsApp directory${NC}"
    exit 1
fi

# Check if android directory exists
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Android directory not found${NC}"
    echo "   Run: npx expo prebuild --platform android"
    exit 1
fi

# Check settings.gradle
echo -e "${BLUE}📋 Checking settings.gradle...${NC}"
if grep -q "react-native-tcp-socket" android/settings.gradle 2>/dev/null; then
    echo -e "${GREEN}   ✅ react-native-tcp-socket found${NC}"
else
    echo -e "${RED}   ❌ react-native-tcp-socket NOT found${NC}"
fi

if grep -q "react-native-udp" android/settings.gradle 2>/dev/null; then
    echo -e "${GREEN}   ✅ react-native-udp found${NC}"
else
    echo -e "${RED}   ❌ react-native-udp NOT found${NC}"
fi

echo ""

# Check app/build.gradle
echo -e "${BLUE}📋 Checking app/build.gradle...${NC}"
if grep -q "react-native-tcp-socket" android/app/build.gradle 2>/dev/null; then
    echo -e "${GREEN}   ✅ react-native-tcp-socket dependency found${NC}"
else
    echo -e "${YELLOW}   ⚠️  react-native-tcp-socket dependency not explicitly listed (may be auto-linked)${NC}"
fi

if grep -q "react-native-udp" android/app/build.gradle 2>/dev/null; then
    echo -e "${GREEN}   ✅ react-native-udp dependency found${NC}"
else
    echo -e "${YELLOW}   ⚠️  react-native-udp dependency not explicitly listed (may be auto-linked)${NC}"
fi

echo ""

# Check if native module files exist
echo -e "${BLUE}📋 Checking native module files...${NC}"
if [ -d "node_modules/react-native-tcp-socket/android" ]; then
    echo -e "${GREEN}   ✅ react-native-tcp-socket/android exists${NC}"
else
    echo -e "${RED}   ❌ react-native-tcp-socket/android NOT found${NC}"
fi

if [ -d "node_modules/react-native-udp/android" ]; then
    echo -e "${GREEN}   ✅ react-native-udp/android exists${NC}"
else
    echo -e "${RED}   ❌ react-native-udp/android NOT found${NC}"
fi

echo ""

# Check package.json dependencies
echo -e "${BLUE}📋 Checking package.json dependencies...${NC}"
if grep -q '"react-native-tcp-socket"' package.json; then
    echo -e "${GREEN}   ✅ react-native-tcp-socket listed in package.json${NC}"
else
    echo -e "${RED}   ❌ react-native-tcp-socket NOT in package.json${NC}"
fi

if grep -q '"react-native-udp"' package.json; then
    echo -e "${GREEN}   ✅ react-native-udp listed in package.json${NC}"
else
    echo -e "${RED}   ❌ react-native-udp NOT in package.json${NC}"
fi

echo ""

# Check react-native.config.js
echo -e "${BLUE}📋 Checking react-native.config.js...${NC}"
if [ -f "react-native.config.js" ]; then
    if grep -q "react-native-tcp-socket" react-native.config.js; then
        echo -e "${GREEN}   ✅ react-native-tcp-socket configured${NC}"
    else
        echo -e "${YELLOW}   ⚠️  react-native-tcp-socket not explicitly configured${NC}"
    fi
    
    if grep -q "react-native-udp" react-native.config.js; then
        echo -e "${GREEN}   ✅ react-native-udp configured${NC}"
    else
        echo -e "${YELLOW}   ⚠️  react-native-udp not explicitly configured${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  react-native.config.js not found${NC}"
fi

echo ""

# Check if device/emulator is connected
echo -e "${BLUE}📋 Checking Android device/emulator...${NC}"
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
if [ "$DEVICES" -gt 0 ]; then
    echo -e "${GREEN}   ✅ $DEVICES device(s) connected${NC}"
    adb devices | grep "device$" | awk '{print "      - " $1}'
else
    echo -e "${YELLOW}   ⚠️  No devices connected${NC}"
    echo "      Start emulator or connect physical device"
fi

echo ""
echo "=========================================="

# Summary
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo ""

ERRORS=0

if ! grep -q "react-native-tcp-socket" android/settings.gradle 2>/dev/null; then
    ERRORS=$((ERRORS + 1))
fi

if ! grep -q "react-native-udp" android/settings.gradle 2>/dev/null; then
    ERRORS=$((ERRORS + 1))
fi

if [ ! -d "node_modules/react-native-tcp-socket/android" ]; then
    ERRORS=$((ERRORS + 1))
fi

if [ ! -d "node_modules/react-native-udp/android" ]; then
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Native modules appear to be properly linked.${NC}"
    echo ""
    echo "If you're still seeing errors:"
    echo "  1. Run: npm run android:rebuild"
    echo "  2. Check app logs for native module initialization"
else
    echo -e "${RED}❌ Found $ERRORS issue(s) with native module linking${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Run: npm install"
    echo "  2. Run: npm run android:clean"
    echo "  3. Check docs/ANDROID-NATIVE-MODULE-LINKING.md"
fi

echo ""
