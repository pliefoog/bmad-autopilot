#!/usr/bin/env node
/**
 * Fix workspace module resolution for React Native
 * 
 * When using npm workspaces, node_modules are hoisted to the root,
 * but React Native's autolinking expects them in the app's node_modules.
 * This script creates symlinks for native modules that need autolinking.
 */

const fs = require('fs');
const path = require('path');

const NATIVE_MODULES = [
  'react-native-tcp-socket',
  'react-native-udp',
];

const rootNodeModules = path.resolve(__dirname, '../../node_modules');
const appNodeModules = path.resolve(__dirname, '../node_modules');

console.log('[fix-workspace-modules] Checking native module symlinks...');

// Ensure app's node_modules directory exists
if (!fs.existsSync(appNodeModules)) {
  fs.mkdirSync(appNodeModules, { recursive: true });
  console.log('[fix-workspace-modules] Created node_modules directory');
}

let linksCreated = 0;
let linksSkipped = 0;

for (const moduleName of NATIVE_MODULES) {
  const sourcePath = path.join(rootNodeModules, moduleName);
  const targetPath = path.join(appNodeModules, moduleName);
  
  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`[fix-workspace-modules] ⚠️  ${moduleName} not found in root node_modules`);
    continue;
  }
  
  // Check if symlink already exists
  if (fs.existsSync(targetPath)) {
    try {
      const stats = fs.lstatSync(targetPath);
      if (stats.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(targetPath);
        if (linkTarget === sourcePath) {
          linksSkipped++;
          continue;
        }
        // Wrong target, remove and recreate
        fs.unlinkSync(targetPath);
      } else {
        // Regular directory, skip to avoid data loss
        console.log(`[fix-workspace-modules] ⚠️  ${moduleName} exists as regular directory, skipping`);
        linksSkipped++;
        continue;
      }
    } catch (err) {
      console.error(`[fix-workspace-modules] Error checking ${moduleName}:`, err.message);
      continue;
    }
  }
  
  // Create symlink
  try {
    fs.symlinkSync(sourcePath, targetPath, 'junction');
    console.log(`[fix-workspace-modules] ✅ Linked ${moduleName}`);
    linksCreated++;
  } catch (err) {
    console.error(`[fix-workspace-modules] ❌ Failed to link ${moduleName}:`, err.message);
  }
}

console.log(`[fix-workspace-modules] Complete: ${linksCreated} created, ${linksSkipped} skipped`);

if (linksCreated === 0 && linksSkipped === 0) {
  console.log('[fix-workspace-modules] ⚠️  No native modules found or linked');
  process.exit(0);
}
