#!/bin/zsh
# iOS Simulator Migration Script
# Moves iOS Simulators from system drive to SSD drive

set -e  # Exit on error

echo "📱 iOS Simulator Migration to SSD Drive"
echo "========================================"
echo ""

# Paths
OLD_PATH=~/Library/Developer/CoreSimulator
NEW_PATH=/Volumes/SSD_I/Dev/Mobile-Dev-Tools/iOS/CoreSimulator
BACKUP_PATH=~/Library/Developer/CoreSimulator.backup

# Check if simulators are already moved
if [ -L "$OLD_PATH" ]; then
    echo "✅ Simulators already symlinked to SSD!"
    ls -lh "$OLD_PATH"
    exit 0
fi

# Step 1: Verify new location has data
echo "📊 Checking simulator data..."
OLD_SIZE=$(du -sh "$OLD_PATH" | awk '{print $1}')
NEW_SIZE=$(du -sh "$NEW_PATH" | awk '{print $1}')
echo "  System drive: $OLD_SIZE"
echo "  SSD drive: $NEW_SIZE"
echo ""

# Step 2: Close Xcode and Simulator
echo "🛑 Closing Xcode and Simulator apps..."
killall Simulator 2>/dev/null || true
killall Xcode 2>/dev/null || true
sleep 2

# Step 3: Create backup (rename original)
echo "💾 Creating backup..."
if [ -d "$BACKUP_PATH" ]; then
    echo "  Backup already exists at $BACKUP_PATH"
else
    mv "$OLD_PATH" "$BACKUP_PATH"
    echo "  ✅ Backup created at $BACKUP_PATH"
fi

# Step 4: Create symlink
echo "🔗 Creating symlink..."
ln -s "$NEW_PATH" "$OLD_PATH"
echo "  ✅ Symlink created: $OLD_PATH -> $NEW_PATH"

# Step 5: Verify symlink
echo ""
echo "🔍 Verifying symlink..."
ls -lh "$OLD_PATH"
echo ""

# Step 6: Test with xcrun
echo "🧪 Testing simulator detection..."
xcrun simctl list devices | head -20

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Test your simulators in Xcode"
echo "  2. If everything works, delete backup:"
echo "     rm -rf ~/Library/Developer/CoreSimulator.backup"
echo ""
echo "💾 Disk space saved: $OLD_SIZE"
echo "📍 Simulators now at: $NEW_PATH"
