#!/bin/bash
# Xcode Data Relocation Script
# Moves Xcode development data from system drive to external SSD
# This keeps your system drive lean while maintaining full functionality

set -e

EXTERNAL_BASE="/Volumes/SSD_I/Developer"

echo "=========================================="
echo "Xcode Data Relocation to External SSD"
echo "=========================================="
echo ""

# Check if external drive is mounted
if [ ! -d "/Volumes/SSD_I" ]; then
    echo "❌ ERROR: External SSD not mounted at /Volumes/SSD_I"
    exit 1
fi

# Function to relocate a directory
relocate_directory() {
    local SOURCE="$1"
    local TARGET="$2"
    local NAME="$3"

    echo "Processing: $NAME"
    echo "  From: $SOURCE"
    echo "  To:   $TARGET"

    # Check if already a symlink
    if [ -L "$SOURCE" ]; then
        echo "  ⚠️  Already a symlink, skipping"
        ls -l "$SOURCE"
        echo ""
        return
    fi

    # Check if source exists and has content
    if [ ! -d "$SOURCE" ] || [ -z "$(ls -A "$SOURCE" 2>/dev/null)" ]; then
        echo "  ⏭️  Directory empty or doesn't exist, skipping"
        echo ""
        return
    fi

    local SIZE=$(du -sh "$SOURCE" | cut -f1)
    echo "  Size: $SIZE"

    # Create target directory
    mkdir -p "$(dirname "$TARGET")"

    # Move data
    echo "  Moving data..."
    rsync -ah --progress "$SOURCE/" "$TARGET/"

    # Backup original
    mv "$SOURCE" "${SOURCE}.backup"

    # Create symlink
    ln -s "$TARGET" "$SOURCE"

    echo "  ✅ Relocated successfully"
    echo "  Backup at: ${SOURCE}.backup"
    echo ""
}

echo "This script will relocate the following to external SSD:"
echo "  1. iOS Simulators (~1-50GB typically)"
echo "  2. iOS Device Support (~4.5GB)"
echo "  3. Xcode DerivedData (build artifacts)"
echo "  4. Xcode Archives (app archives)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 0
fi
echo ""

# Shut down all simulators
echo "Shutting down all simulators..."
xcrun simctl shutdown all 2>/dev/null || true
echo "✅ Simulators shut down"
echo ""

# Relocate CoreSimulator
relocate_directory \
    "$HOME/Library/Developer/CoreSimulator" \
    "$EXTERNAL_BASE/CoreSimulator" \
    "iOS Simulators"

# Relocate iOS DeviceSupport
relocate_directory \
    "$HOME/Library/Developer/Xcode/iOS DeviceSupport" \
    "$EXTERNAL_BASE/Xcode/iOS DeviceSupport" \
    "iOS Device Support"

# Relocate DerivedData
relocate_directory \
    "$HOME/Library/Developer/Xcode/DerivedData" \
    "$EXTERNAL_BASE/Xcode/DerivedData" \
    "Xcode DerivedData"

# Relocate Archives
relocate_directory \
    "$HOME/Library/Developer/Xcode/Archives" \
    "$EXTERNAL_BASE/Xcode/Archives" \
    "Xcode Archives"

echo "=========================================="
echo "✅ RELOCATION COMPLETE"
echo "=========================================="
echo ""
echo "All Xcode data is now on external SSD"
echo ""
echo "Verify everything works, then clean up backups:"
echo "  rm -rf ~/Library/Developer/CoreSimulator.backup"
echo "  rm -rf ~/Library/Developer/Xcode/iOS\\ DeviceSupport.backup"
echo "  rm -rf ~/Library/Developer/Xcode/DerivedData.backup"
echo "  rm -rf ~/Library/Developer/Xcode/Archives.backup"
echo ""
echo "Symlinks created:"
ls -lh ~/Library/Developer/ | grep -E "CoreSimulator|Xcode"
echo ""
df -h / | awk 'NR==2 {print "System drive free space: " $4}'
