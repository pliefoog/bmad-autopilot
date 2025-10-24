#!/bin/bash
# Start Metro bundler with SSD cache location
# Use this script instead of 'npm start' to avoid disk space issues

# Set cache to external SSD
export TMPDIR="/Volumes/SSD_I/Dev/.metro-cache"
export REACT_NATIVE_CACHE_DIR="/Volumes/SSD_I/Dev/.metro-cache"

# Create cache directory if needed
mkdir -p "$TMPDIR"

echo "Starting Metro with cache on SSD: $TMPDIR"
echo ""

# Start Metro with reset cache
npx react-native start --reset-cache
