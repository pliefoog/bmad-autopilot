# Brainstorming Session Results

**Session Date:** {{date}}
**Facilitator:** {{agent_role}} {{agent_name}}
**Participant:** {{user_name}}

## Executive Summary

**Topic:** Dynamic Route Planner for Marine Navigation - A system that determines optimal routes and departure/arrival times between ports, taking into account tides, currents, sea state, sail and crew comfort, using NMEA instrument data and online weather forecasts with continuous route re-evaluation.

**Session Goals:** Explore the fundamental technical and user experience requirements for implementing a dynamic route planning system in the Boat Instruments app. Focus on multi-objective optimization, data architecture, and captain-as-decision-maker paradigm.

**Techniques Used:** {{techniques_list}}

**Total Ideas Generated:** {{total_ideas}}

### Key Themes Identified:

{{key_themes}}

## Technique Sessions

### Technique 1: First Principles Thinking (Creative, 15 min)

**Objective:** Strip away assumptions and rebuild from fundamental truths about physics, user needs, and technical requirements.

**Key Insights Generated:**

**Environmental Physics Fundamentals:**
- Tides/currents = deterministic (celestial mechanics) but require detailed coastal profiles beyond sine wave approximations
- Weather = probabilistic models with increasingly fine-grained hourly forecasts (wind, waves, direction, intervals, amplitude)
- Hyper-local refinement possible via cross-correlation of forecasts with in-situ NMEA measurements
- Boat speed is SLOW = need 12-24 hour or multi-DAY route calculations
- Current speeds can EXCEED boat speed in narrow channels = timing is absolutely critical

**Navigation Constraint Fundamentals:**
- ColRegs (collision regulations) - immutable legal requirements
- Physical obstacles: channels, sandbanks, rocks, narrow passages
- Boat-specific: draft (depth clearance), mast height (bridge clearance), sailing polars (optimal wind angles)
- Harbor entry constraints: depth, overhead clearance, wind direction/speed for safe approach
- Comfort metrics: gyro sensor (sea state), wind/gusts, actual boat course

**Human Decision-Making Fundamentals:**
- Captain ALWAYS has final authority and responsibility (legal + practical)
- System role = **AI Co-Pilot**, not autopilot
- Personal/crew factors (seasickness, fatigue, experience) are dynamic and un-modelable
- Don't present "THE optimal route" → Present MULTIPLE scenarios with visible trade-offs
- Decision needs change DURING passage, not just at planning stage

**Coastal vs. Ocean Passage - Different Problem Classes:**
- **Coastal:** More complex route planning, shorter time horizons (12-24 hrs), higher constraint density
- **Ocean:** Weather window determination critical (3-4 week passages), larger weather systems, "running from bad weather" viable, re-evaluation over days/weeks

**Core Navigation Mathematics:**
- **Rhumb line** = constant compass bearing (simple to steer, not shortest)
- **Great circle** = shortest distance (requires continuous heading adjustments)
- **Vector mathematics loop:**
  1. Planned route vector
  2. Set and drift vectors (current + wind)
  3. Course to steer = adjustment to counteract set/drift
  4. Track over ground = resultant vector
- This is classical Yachtmaster passage planning - automated and time-dependent!

**The Core Computational Loop (Hour-by-hour):**
1. Calculate position at time T
2. Look up tide/current vector at (position, time T)
3. Look up weather/wave conditions at (position, time T)
4. Calculate course to steer to maintain intended track
5. Calculate boat speed (polar performance given wind angle/speed)
6. Calculate comfort metrics (sea state, heel angle, motion)
7. Calculate time to next waypoint
8. Repeat for next segment

**Critical Insight:** Departure time affects ALL subsequent tide/current vectors = time-coupled optimization problem

**Data Architecture - MVP Definition:**

**MUST-HAVE: Pre-Departure Planning (with connectivity in port)**
- Captain-provided data from pilot books (Reeds Almanac, Bloc Marin): tide tables, current predictions, harbor constraints
- Online API access: weather forecasts, detailed tide/current models, chart data
- Captain validation checkpoint for safety/responsibility
- Boat specifications: draft, mast height, sailing polars
- Comfort preferences

**NICE-TO-HAVE: Real-time Re-evaluation Underway**
- Offline mode: Pre-downloaded GRIB files, sea state forecasts, cached tide/current data
- Enhanced mode (Starlink): Updated weather models, real-time routing adjustments
- NMEA sensor fusion: Actual wind/speed/course vs. predicted, gyro comfort measurement, track validation

**SIMPLEST USEFUL SYSTEM - Pre-Departure Route Planner:**
1. Captain inputs: departure port, destination port, departure time window
2. System gathers: tide/current/weather data (online APIs + captain validation)
3. System calculates: multiple route scenarios with different departure times
4. System presents: comparison table (passage time, comfort rating, critical timing points, trade-offs)
5. Captain selects preferred scenario
6. System exports: waypoints, timing plan, expected conditions

**Ideas Generated:** 15+ fundamental truths and architectural principles

---

### Technique 2: SCAMPER Method (Structured, 20 min)

**Objective:** Systematically explore innovations through 7 lenses: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse.

**Ideas Generated by Lens:**

#### S - SUBSTITUTE

1. **Paper Charts → Electronic Charts (OpenCPN/OpenSeaMap)** - Leverage open-source visualization without building full chartplotter
2. **Manual Data Entry → API Integration** - OpenCPN data sources, GRIB files, commercial APIs (Windy.com, PredictWind, Windy.app with existing subscriptions)
3. **Static Waypoints → Dynamic Route Export/Sync** - Automated export to chartplotters (Raymarine Axiom, B&G Zeus) and nav apps (Navionics Boating)
4. **Qualitative Comfort → Seasickness-Aware Comfort Index** - MSDV + ISO 2631 inspired formula combining roll/pitch/acceleration/frequency

#### C - COMBINE

1. **Weather Forecasts + Historical Navigation Data → Personalized Comfort Prediction** - ML on past passages with hour-by-hour captain ratings
2. **Multiple Weather Models → Scenario Ensemble** - Show range based on model uncertainty
3. **Crew Watch Scheduling + Comfort Levels → Smart Rotation Planning** - Match crew tolerance with predicted conditions (ocean passages)
4. **Wind/Polar + Current + Drift → True SOG/COG** - THE core calculation combining all three factors
5. **Route Planning + Maritime Regulatory Data → ColRegs-Compliant Routes** - TSS, wind farms, fishing areas, restricted zones ("sea is no longer open space")
6. **Route Export → Chartplotter Integration** - NOT direct autopilot control, chartplotter sets waypoints

#### A - ADAPT

1. **Offshore Racing Software → Cruising Adaptation** - Research AWEN Outremer tools, optimize for comfort+safety vs. pure speed
2. **PredictWind Integration** - Vessel-type-aware routing with wave consideration
3. **Windy.app WindHub Visualization** - Wind + current vectors on map as first iteration
4. **Phased Approach** - Vector visualization (Phase 1) before full optimization (Phase 2)

#### M - MODIFY/MAGNIFY/MINIFY

1. **Adaptive Granularity** - Day sail (hourly), multi-day (3hr), ocean (aligned with watch schedule)
2. **Minimize Options** - 3 route scenarios default, iterate based on feedback
3. **Minimize Captain Input** - Auto-retrieve parameters via APIs
4. **Visual Route Selection** - Charts not tables, KISS principle, "made for regular people not engineers"
5. **Performance Target** - 5 minutes for 3 scenarios with progress indicator, cloud offload if needed
6. **Chart Source** - i-Boating charts (research licensing/API)
7. **Multi-Modal Visual Encoding** - Route width=comfort, color=wind speed, arrows=wind angle/Beaufort
8. **Add Celestial Factors** - Sunrise/sunset timing, sun angle for reef passages (Pacific islands)

#### P - PUT TO OTHER USES

1. **Educational Training Tool** - Step-by-step vector visualization for sailing students, builds trust with "salty dogs"
2. **Post-Voyage Analysis** - Planned vs. actual comparison, continuous algorithm improvement, links to VIP AI consultation
3. **Collaborative Voyage Planning** (Nice-to-Have) - Share route packages with weather/conditions for flotilla coordination

#### E - ELIMINATE (MVP Scope)

**Defer to Phase 2:**
- Real-time re-routing during passage
- Multi-provider weather APIs (start with one)
- Manual comfort feedback loop
- Great circle routing (rhumb line only initially)
- Multi-chartplotter formats (1-2 common ones)
- Detailed ColRegs/TSS visualization (basic restricted areas only)
- Cloud computation fallback
- Collaborative sharing

**Simplifications:**
- Auto-select best weather model (don't ask captain)
- Polar library by boat type from online sources (boat-specific essential, but simplified entry)
- Auto-fetch tide tables with captain review
- **Challenge identified:** Current data along route more difficult than tide tables

#### R - REVERSE/REARRANGE

1. **Weather Window → Destination Suggestions** - "Where can I go in this 3-day window?"
2. **Comfort Threshold First** - Filter routes by minimum comfort requirement
3. **Optimize Comfort First** - Show time trade-off (cruising vs. racing priority)
4. **Arrival Time → Work Backwards** - Plan required departure for tide/daylight arrival constraints
5. **Contingency Planning → Alternative Ports Along Route** - Decision tree with safety branches, document diversion options (distance, conditions, decision points)

**Key Insight:** Route planning is A→(B or B1 or B2 or B3) with pre-planned escape routes

**Ideas Generated:** 40+ specific features, integrations, and architectural decisions

{{technique_sessions}}

## Idea Categorization

### Immediate Opportunities

_Ideas ready to implement now_

{{immediate_opportunities}}

### Future Innovations

_Ideas requiring development/research_

{{future_innovations}}

### Moonshots

_Ambitious, transformative concepts_

{{moonshots}}

### Insights and Learnings

_Key realizations from the session_

{{insights_learnings}}

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: {{priority_1_name}}

- Rationale: {{priority_1_rationale}}
- Next steps: {{priority_1_steps}}
- Resources needed: {{priority_1_resources}}
- Timeline: {{priority_1_timeline}}

#### #2 Priority: {{priority_2_name}}

- Rationale: {{priority_2_rationale}}
- Next steps: {{priority_2_steps}}
- Resources needed: {{priority_2_resources}}
- Timeline: {{priority_2_timeline}}

#### #3 Priority: {{priority_3_name}}

- Rationale: {{priority_3_rationale}}
- Next steps: {{priority_3_steps}}
- Resources needed: {{priority_3_resources}}
- Timeline: {{priority_3_timeline}}

## Reflection and Follow-up

### What Worked Well

{{what_worked}}

### Areas for Further Exploration

{{areas_exploration}}

### Recommended Follow-up Techniques

{{recommended_techniques}}

### Questions That Emerged

{{questions_emerged}}

### Next Session Planning

- **Suggested topics:** {{followup_topics}}
- **Recommended timeframe:** {{timeframe}}
- **Preparation needed:** {{preparation}}

---

_Session facilitated using the BMAD CIS brainstorming framework_
