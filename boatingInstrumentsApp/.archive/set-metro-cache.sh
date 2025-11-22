#!/bin/bash
# Metro Cache Configuration for External SSD
# This script configures Metro bundler to use the external SSD for cache
# to avoid filling up the system drive

# Create cache directory on SSD if it doesn't exist
METRO_CACHE_DIR="/Volumes/SSD_I/Dev/.metro-cache"
mkdir -p "$METRO_CACHE_DIR"

# Export TMPDIR for Metro to use
export TMPDIR="$METRO_CACHE_DIR"

# Also set React Native specific cache location
export REACT_NATIVE_CACHE_DIR="$METRO_CACHE_DIR"

echo "✓ Metro cache configured to use: $METRO_CACHE_DIR"
echo "✓ Current TMPDIR: $TMPDIR"
echo ""
echo "To make this permanent, add this to your shell profile:"
echo "  echo 'export TMPDIR=/Volumes/SSD_I/Dev/.metro-cache' >> ~/.zshrc"
echo "  source ~/.zshrc"
