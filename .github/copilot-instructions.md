# GitHub Copilot Instructions - BMad Autopilot

## Project Overview

This is a **React Native cross-platform marine instrument display** that connects to boat NMEA networks via WiFi bridges. The app runs entirely on-device (no server) and transforms smartphones/tablets/desktops into comprehensive marine displays with Raymarine autopilot control.

## Critical Development Context

### BMAD Method Workflow

This project uses the **BMAD Method v6** with specialized AI agents. Before making changes:

1. **Agent Personas:** Use BMAD agent commands:
   - `#bmad-master` - Universal task executor (🧙 BMad Master)
   - `#tea` - Master Test Architect & quality advisor (🧪 Murat)
   - `#dev` - Full stack developer (💻 Amelia)
   - `#architect` - Architecture & design decisions (🏗️ Winston)
   - `#analyst` - Business analysis & requirements (📊 Mary)
   - `#pm` - Product management (📋 John)
   - `#sm` - Scrum Master & story preparation (🏃 Bob)
   - `#ux-expert` - UI/UX design specialist (🎨 Sally)
   - `#game-architect` - Performance & systems architecture (🏛️ Cloud Dragonborn)
   - `#game-designer` - User experience & interaction design (🎲 Samus Shepard)
   - `#game-dev` - Real-time performance optimization (🕹️ Link Freeman)
2. **Story-Driven Development:** All work tracks to user stories in `docs/stories/`. Stories follow format: `story-{epic}.{number}-{slug}.md`
3. **Quality Gates:** Use `#tea` agent with test architecture review and `#sm` agent with `*story-ready` workflow to validate completion before marking stories done
4. **Configuration:** Project config in `bmad/bmm/config.yaml` defines doc locations, patterns, and workflow paths

**Always read and action `bmad/bmm/config.yaml` before making any changes. Ensure your workflow and decisions are aligned with the latest configuration.**

### File Structure (MCP Tool Usage Required)

**ALWAYS use VSCode MCP tools** (`read_file`, `replace_string_in_file`, `grep_search`, `semantic_search`, `file_search`) instead of manual file operations:

## Available VS Code Tasks

Use `Ctrl+Shift+P` → `Tasks: Run Task` or the `run_task` MCP tool to execute:

**Development Tasks:**
- `Start Web Dev Server` - Launch React Native web development server
- `Stop Web Dev Server` - Stop the web development server
- `Start NMEA Bridge Simulator` - Start simulator for NMEA data testing
- `Stop NMEA Bridge Simulator` - Stop the NMEA simulator
- `Start NMEA Bridge Simulator (Recording)` - Start simulator with recorded data playback
- `Start Full Web Development Stack` - Launch both web server and NMEA simulator

**Testing Tasks:**
- `Create test file for NmeaConnectionManager` - Generate test file template

**Remember:** Use MCP tools (`read_file`, `replace_string_in_file`, `grep_search`) for all file operations. Never output code blocks when tools are available - make direct edits.
