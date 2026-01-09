#!/bin/bash
# iOS Simulator relocation script
# Moves simulator data from system drive to external SSD

set -e

SYSTEM_SIM_PATH=~/Library/Developer/CoreSimulator
EXTERNAL_SIM_PATH=/Volumes/SSD_I/Developer/CoreSimulator

echo "=========================================="
echo "iOS Simulator Relocation to External SSD"
echo "=========================================="
echo ""
echo "This will move iOS Simulators from:"
echo "  FROM: $SYSTEM_SIM_PATH"
echo "  TO:   $EXTERNAL_SIM_PATH"
echo ""

# Check if external drive is mounted
if [ ! -d "/Volumes/SSD_I" ]; then
    echo "❌ ERROR: External SSD not mounted at /Volumes/SSD_I"
    exit 1
fi

# Shut down all simulators
echo "Step 1: Shutting down all simulators..."
xcrun simctl shutdown all 2>/dev/null || true
echo "✅ Simulators shut down"
echo ""

# Create directory on external drive
echo "Step 2: Creating directory on external SSD..."
mkdir -p "$EXTERNAL_SIM_PATH"
echo "✅ Directory created"
echo ""

# Move simulator data
echo "Step 3: Moving simulator data to external SSD..."
if [ -d "$SYSTEM_SIM_PATH" ]; then
    # Check if there's already a symlink
    if [ -L "$SYSTEM_SIM_PATH" ]; then
        echo "⚠️  Simulator path is already a symlink"
        ls -l "$SYSTEM_SIM_PATH"
        exit 0
    fi

    echo "Moving $(du -sh "$SYSTEM_SIM_PATH" | cut -f1) of data..."
    rsync -ah --progress "$SYSTEM_SIM_PATH/" "$EXTERNAL_SIM_PATH/"
    echo "✅ Data moved"
    echo ""

    # Backup the original
    echo "Step 4: Backing up original directory..."
    mv "$SYSTEM_SIM_PATH" "$SYSTEM_SIM_PATH.backup"
    echo "✅ Original backed up"
    echo ""

    # Create symlink
    echo "Step 5: Creating symbolic link..."
    ln -s "$EXTERNAL_SIM_PATH" "$SYSTEM_SIM_PATH"
    echo "✅ Symlink created"
    echo ""

    # Verify
    echo "Step 6: Verifying setup..."
    ls -lh ~/Library/Developer/ | grep CoreSimulator
    echo ""

    echo "=========================================="
    echo "✅ RELOCATION COMPLETE"
    echo "=========================================="
    echo ""
    echo "Simulators are now stored on external SSD"
    echo "System drive space saved: $(du -sh "$SYSTEM_SIM_PATH.backup" 2>/dev/null | cut -f1 || echo "N/A")"
    echo ""
    echo "After verifying everything works, you can delete the backup:"
    echo "  rm -rf $SYSTEM_SIM_PATH.backup"
    echo ""
else
    echo "⚠️  CoreSimulator directory not found"
fi
