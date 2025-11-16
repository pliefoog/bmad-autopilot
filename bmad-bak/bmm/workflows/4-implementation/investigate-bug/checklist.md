# Bug Investigation Report - Validation Checklist

## Report Completeness

- [ ] Bug ID follows format: BUG-[story-number]-[sequence]
- [ ] Investigation date and investigator documented
- [ ] User name recorded

## Initial Report Section

- [ ] User description captured
- [ ] Expected behavior defined (from story/context or user)
- [ ] Related story referenced with path
- [ ] Story-context referenced (if available)
- [ ] Reproduction steps documented

## DMAIC Investigation

### D - DEFINE
- [ ] Initial hypothesis classification documented
- [ ] Related documentation identified
- [ ] Story specification extracted

### M - MEASURE
- [ ] Evidence collection documented
- [ ] Reproduction steps validated
- [ ] Sufficient evidence gathered (logs, screenshots, etc.)

### A - ANALYZE
- [ ] At least 2 investigation steps documented
- [ ] Each step includes: Action Taken, Evidence, Findings, Story Alignment
- [ ] Self-critical reflection performed at each step
- [ ] Cross-comparison to story/context performed
- [ ] Root cause identified (or determination made that it's not a bug)

### I - IDENTIFY
- [ ] Classification determined using decision tree
- [ ] Impact assessment completed (scope, severity, affected components)
- [ ] Classification aligns with investigation findings

### C - COMMUNICATE
- [ ] Handoff target determined (@dev, @architect, or user)
- [ ] Handoff rationale clearly explained
- [ ] Recommended action provided
- [ ] Evidence references documented (stories, code files, logs)

## Quality Checks

- [ ] No code implementation suggested or performed (investigation only)
- [ ] All file paths are project-relative (not absolute)
- [ ] Story/story-context treated as single source of truth
- [ ] Classification decision is evidence-based
- [ ] Investigation demonstrates reflective thinking (course corrections noted if any)
- [ ] Report is clear and actionable for handoff target

## Classification-Specific Checks

### If "Small Bug" → @dev
- [ ] Specific file(s) and line numbers identified
- [ ] Gap between implementation and specification clearly documented
- [ ] No architectural concerns identified

### If "Complex Bug" or "Architectural Issue" → @architect
- [ ] Architectural concern clearly articulated
- [ ] Impact assessment includes scope and severity
- [ ] Request for architectural review explicit

### If "Documentation Conflict" → @architect
- [ ] Conflicting stories/documents identified with specific references
- [ ] Nature of contradiction explained
- [ ] Request for specification clarification made

### If "Not a Bug" → User
- [ ] Findings clearly explained
- [ ] Story specification referenced
- [ ] Current behavior justified as correct

### If "Design Flaw - Unfixable" → @architect
- [ ] Design constraint preventing fix identified
- [ ] Impact assessment provided
- [ ] Recommendation for architectural review

## Final Validation

- [ ] Report saved to correct location: {output_folder}/bug-reports/
- [ ] Report filename matches bug ID
- [ ] Investigation demonstrates DMAIC methodology throughout
- [ ] All template placeholders replaced with actual content
