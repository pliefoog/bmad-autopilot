#!/bin/bash
# Quick Android rebuild without full clean (faster when babel config changes)
# This removes build caches but keeps dependency resolution

set -e

echo "🔨 Quick Android Rebuild"
echo "======================="
echo ""

# Navigate to boatingInstrumentsApp
cd "$(dirname "$0")/.."

echo "Step 1: Removing build caches..."
rm -rf android/app/.cxx
rm -rf android/app/build
rm -rf android/.gradle

echo "Step 2: Building and installing APK..."
npm run android

echo ""
echo "✅ Rebuild complete! New APK should be installed on your device."
