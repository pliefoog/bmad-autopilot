# GitHub Copilot Instructions - BMad Autopilot

## ⚠️ CRITICAL PROJECT REORGANIZATION NOTICE ⚠️

**VENDOR FOLDER REORGANIZATION IN PROGRESS (October 2025):**
- **OLD STRUCTURE:** Dual `vendor/` folders (root + app level) causing path confusion
- **NEW STRUCTURE:** `marine-assets/` + `test-infrastructure/` for logical separation
- **ACTION REQUIRED:** If you encounter incorrect path references to `vendor/`, **STOP and ask the user for permission to update paths** before proceeding
- **AFFECTED PATHS:** All references to `vendor/test-standards/`, `vendor/sample-data/`, `vendor/polars/`, etc.

## Project Overview

This is a **React Native cross-platform marine instrument display** that connects to boat NMEA networks via WiFi bridges. The app runs entirely on-device (no server) and transforms smartphones/tablets/desktops into comprehensive marine displays with Raymarine autopilot control.

## Critical Development Context
- **NMEA Bridge Simulator:** A Node.js-based simulator that mimics NMEA data streams for development/testing without physical hardware.
- **Simulator Control API:** RESTful API to manage simulator scenarios and data injection.
- **VS Code Tasks:** Predefined tasks for starting/stopping the simulator and web server.

### File Structure (MCP Tool Usage Required)

**ALWAYS use VSCode MCP tools** (`read_file`, `replace_string_in_file`, `grep_search`, `semantic_search`, `file_search`) instead of manual file operations:

## Available VS Code Tasks

**ALWAYS use VS Code tasks instead of manual CLI commands for simulator operations:**

❌ Don't write: `node server/nmea-bridge.js --scenario basic-navigation`
✅ Do use: `Ctrl+Shift+P` → `Tasks: Run Task` → `Start NMEA Bridge: Scenario - Basic Navigation`

Use `Ctrl+Shift+P` → `Tasks: Run Task` or the `run_task` MCP tool to execute:

**Development Tasks:**
- `Start Web Dev Server` - Launch React Native web development server
- `Stop Web Dev Server` - Stop the web development server
- `Start Full Web Development Stack` - Launch both web server and NMEA simulator
- `Stop NMEA Bridge Simulator` - Stop the NMEA simulator

**NMEA Bridge Scenario Tasks:**
- `Start NMEA Bridge: Scenario - Basic Navigation` - Standard depth, speed, wind, GPS data
- `Start NMEA Bridge: Scenario - Coastal Sailing` - Realistic coastal sailing conditions
- `Start NMEA Bridge: Scenario - Autopilot Engagement` - Complete autopilot workflow
- `Start NMEA Bridge: Scenario - Engine Monitoring` - Engine system monitoring
- `Start NMEA Bridge: Scenario - Multi-Instance Equipment Detection` - Multiple equipment testing

**Testing Tasks:**
- `Create test file for NmeaConnectionManager` - Generate test file template

**Simulator Control API Reference:**
- **Port:** 9090 (Use "Simulator Control API" naming)
- **Endpoints:** `/api/scenarios/`, `/api/inject-data`, `/api/simulate-error`
- **External Control:** Use REST API, not direct CLI commands

## Communication Best Practices

### Preferred Communication Patterns
**Direct Chat Communication:** Always communicate status, progress, and results directly in the chat window rather than using terminal echo commands.

**❌ Avoid:** Using `echo` commands for status messages:
```bash
echo "Task completed successfully"
echo "Created 3 files with 500 lines each"
```

**✅ Prefer:** Direct communication in chat:
```
✅ Task completed successfully

I created 3 comprehensive documentation files:
1. file1.md (167 lines) - Description of purpose
2. file2.md (233 lines) - Description of purpose  
3. file3.md (100 lines) - Description of purpose
```

**Terminal Usage:** Reserve terminal commands for actual development operations:
- File operations (`touch`, `mkdir`, `mv`, `cp`)
- Build and test commands (`npm run`, `expo start`)
- Git operations (`git add`, `git commit`)
- System utilities (`ls`, `wc`, `grep`)

**Status Updates:** Provide progress updates and completion summaries directly in chat conversation, not through terminal output.

### Development Architecture Principles

**Modular Design:** Always prioritize modular architecture and code reuse over rewriting functionality.

**🏗️ Best Practices:**
- **Analyze Before Building:** Survey existing code and components before implementing new functionality
- **Reuse Over Rewrite:** Extend or compose existing functions/services rather than duplicating logic
- **DRY Principle:** Don't Repeat Yourself - extract common functionality into reusable modules
- **Single Responsibility:** Keep components focused on one clear purpose
- **Pure Functions:** Prefer pure functions with no side effects for better testability and reusability
- **Clear Interfaces:** Define explicit interfaces and type contracts

**❌ Avoid:**
- Writing duplicate functionality when existing code can be extended
- Creating monolithic components that handle multiple responsibilities
- Tightly coupled code that's hard to test or modify
- Complex inheritance hierarchies or deep nesting

**✅ Prefer:**
- Composition over inheritance
- Small, focused modules with clear dependencies
- Functional programming patterns where appropriate
- Explicit error handling and validation

**When Uncertain:** Always ask the user directly in chat for architectural guidance rather than making assumptions about requirements or complexity needs.

**Remember:** Use MCP tools (`read_file`, `replace_string_in_file`, `grep_search`) for all file operations. Never output code blocks when tools are available - make direct edits.
