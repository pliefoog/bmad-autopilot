# VS Code Tasks - Quick Reference

Memory-optimized VS Code tasks for boating instruments app development.

## 🎯 Recommended Tasks (Memory Optimized)

### Primary Web Development (Use These!)

Press `Cmd+Shift+P` → `Tasks: Run Task` → Select from:

#### Best for Daily Development:
- **Start Web Dev Server (Safari - RECOMMENDED)**
  - Opens in Safari (WebKit engine)
  - Saves ~4.6GB RAM vs Chrome
  - No competition with VS Code's Chromium engine

#### Full Stack Development:
- **Start Full Web Development Stack (Safari - RECOMMENDED)**
  - NMEA Bridge + Web Server in Safari
  - Complete dev environment, memory optimized

- **Start Full Dev Stack + Coastal Sailing (Safari - RECOMMENDED)**
  - Coastal sailing scenario + Web Server in Safari
  - Best for navigation testing

### Alternative Memory-Optimized:
- **Start Web Dev Server (Low Memory)**
  - Opens in Chrome but uses 2 workers instead of 8
  - Saves ~400MB RAM
  - Use when you need Chrome DevTools

---

## 🧹 Maintenance Tasks

### Cache Cleanup:
- **Clean Metro Cache** - Clear Metro bundler and Node caches (~500MB-1GB freed)
- **Clean All Build Artifacts** - Nuclear option: clears iOS/Android builds too (~2-5GB freed)

### Stop Services:
- **Stop Web Dev Server** - Kill Metro/Expo web server
- **Stop NMEA Bridge Simulator** - Kill NMEA data simulator

---

## 📋 All Available Web Dev Tasks

| Task | Browser | Memory Impact | When to Use |
|------|---------|---------------|-------------|
| **Safari - RECOMMENDED** | Safari | **Best** (-4.6GB) | Primary development |
| **Low Memory** | Chrome | **Good** (-400MB) | Need Chrome but want to save RAM |
| **Start Web Dev Server** | Chrome | Standard | Need full Chrome DevTools |

---

## 🚢 NMEA Bridge Scenarios

### Single Vessel Testing:
- Start NMEA Bridge: Single Engine Scenario (Default)
- Start NMEA Bridge: Basic Navigation
- Start NMEA Bridge: Coastal Sailing
- Start NMEA Bridge: Deep Water Passage

### Multi-Sensor Testing:
- Start NMEA Bridge: Dual Engine Scenario
- Start NMEA Bridge: Multi-Tank System Test
- Start NMEA Bridge: Battery Systems Test
- Start NMEA Bridge: Multi-Temperature Monitoring Test

### Autopilot Testing:
- Start NMEA Bridge: Autopilot Engagement

### Widget-Specific Debug:
- Start NMEA Bridge: Depth Only (Debug)
- Start NMEA Bridge: Battery Only (Debug)
- Start NMEA Bridge: VWR/VWT Wind Test

### Protocol Testing:
- Start NMEA Bridge: Coastal Sailing (NMEA 0183)
- Start NMEA Bridge: Coastal Sailing (NMEA 2000)
- Start NMEA Bridge: Coastal Sailing (Hybrid Mode)

---

## 🎬 Quick Start Workflows

### Web Development with Safari (Recommended):
1. Press `Cmd+Shift+P`
2. Type: `Tasks: Run Task`
3. Select: `Start Web Dev Server (Safari - RECOMMENDED)`
4. Safari opens automatically at http://localhost:8082

### Full Stack with Data Simulation:
1. Press `Cmd+Shift+P`
2. Type: `Tasks: Run Task`
3. Select: `Start Full Web Development Stack (Safari - RECOMMENDED)`
4. Two panels open:
   - NMEA Bridge (data simulator)
   - Web Server (Safari)

### When You Need Chrome:
1. Use: `Start Web Dev Server (Low Memory)` instead
2. Close DevTools when not actively debugging
3. Only open Console panel (not all panels)

---

## 💡 Memory Optimization Tips

### Why Safari Tasks Save So Much Memory:

**Chrome Setup:**
- Chrome engine: ~800MB
- Tab: ~600MB
- DevTools: ~800MB
- V8 Inspector: ~400MB
- Competes with VS Code's Chromium
- **Total: ~4.6GB + CPU/cache contention**

**Safari Setup:**
- Safari (WebKit): ~600MB
- Tab: ~400MB
- Web Inspector: ~300MB
- No competition with VS Code
- **Total: ~1.3GB, no contention**

**Net benefit: ~3.3GB saved + eliminated resource competition**

---

## 🔧 Task Customization

All tasks are defined in [.vscode/tasks.json](.vscode/tasks.json).

### Common Task Properties:

```json
{
  "label": "Task Name",
  "type": "shell",
  "command": "npm",
  "args": ["run", "script-name"],
  "options": {
    "cwd": "${workspaceFolder}/boatingInstrumentsApp"
  },
  "isBackground": true,
  "group": "build",
  "presentation": {
    "reveal": "always",
    "panel": "new"
  }
}
```

### Adding Your Own Task:

1. Open `.vscode/tasks.json`
2. Add new task to `tasks` array
3. Use existing tasks as templates
4. Save and reload VS Code

---

## ⌨️ Keyboard Shortcuts

Default VS Code shortcuts for tasks:

- `Cmd+Shift+P` → `Tasks: Run Task` - Run any task
- `Cmd+Shift+B` - Run default build task
- `Cmd+Shift+P` → `Tasks: Terminate Task` - Stop running task

### Pro Tip: Create Custom Keybindings

Add to your `keybindings.json`:

```json
{
  "key": "cmd+shift+w",
  "command": "workbench.action.tasks.runTask",
  "args": "Start Web Dev Server (Safari - RECOMMENDED)"
}
```

---

## 🐛 Troubleshooting

### Safari Not Opening?

1. Check Safari is installed
2. Manually open: http://localhost:8082
3. Set Safari as default browser (optional)

### Task Won't Start?

1. Check if port 8082 is already in use:
   ```bash
   lsof -i :8082
   ```
2. Kill existing process:
   ```bash
   kill -9 <PID>
   ```
3. Or run cleanup task: **Stop Web Dev Server**

### Metro Cache Issues?

Run: **Clean Metro Cache** task

### Build Artifacts Filling Disk?

Run: **Clean All Build Artifacts** task

---

## 📊 Memory Usage Comparison

After running tasks, check memory with:

```bash
ps aux | grep -E "Safari|Chrome|expo" | grep -v grep
```

**Expected Results:**

| Setup | Memory Usage | Notes |
|-------|-------------|-------|
| Safari Task | ~1.3GB | WebKit, no competition |
| Low Memory Task | ~2.6GB | Chrome with 2 workers |
| Standard Task | ~4.6GB | Chrome with all cores |

---

## 🔗 Related Documentation

- [../MEMORY-OPTIMIZATION-GUIDE.md](../MEMORY-OPTIMIZATION-GUIDE.md) - Complete memory optimization guide
- [../OPTIMIZATIONS-APPLIED.md](../OPTIMIZATIONS-APPLIED.md) - What was optimized
- [../boatingInstrumentsApp/MEMORY-OPTIMIZED-SCRIPTS.md](../boatingInstrumentsApp/MEMORY-OPTIMIZED-SCRIPTS.md) - npm scripts reference

---

## 📅 Last Updated

- Date: 2025-01-09
- Added Safari tasks for memory optimization
- Added cleanup tasks for maintenance
- Added full stack Safari variants

---

## 🎓 Best Practices

1. **Always use Safari tasks for web development** (saves 4.6GB)
2. **Run cache cleanup weekly** (prevents accumulation)
3. **Close DevTools when not debugging** (saves 800MB per instance)
4. **Use widget-specific scenarios for debugging** (lighter than full scenarios)
5. **Stop tasks when not in use** (frees resources)

---

*Pro Tip: Pin your most-used tasks to the VS Code status bar using the Tasks extension!*
