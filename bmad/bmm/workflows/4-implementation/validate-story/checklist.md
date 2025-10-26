# Story Validation Report - Validation Checklist

## Report Completeness

- [ ] Story number and title documented
- [ ] Validation date and validator recorded
- [ ] Story file path included
- [ ] Story status documented
- [ ] Epic ID captured

## Story Information Section

- [ ] Story file successfully loaded and read
- [ ] Story-context file checked (exists or noted as missing)
- [ ] Key story metadata extracted (title, status, epic)

## Story-Context Alignment

- [ ] Context file existence verified
- [ ] If context exists: Alignment check performed
- [ ] If context exists: Acceptance criteria coverage verified
- [ ] If context exists: Referenced artifacts validated
- [ ] If context exists: Constraints consistency checked
- [ ] Alignment status clearly documented

## Cross-Story Conflict Check

- [ ] Related stories identified (same epic, keywords, dependencies)
- [ ] At least 1 related story checked (or noted if none found)
- [ ] Conflict analysis performed
- [ ] Conflicting requirements documented (or "No conflicts" stated)
- [ ] Story dependency consistency verified

## Architecture Documentation Alignment

- [ ] Architecture documentation locations identified
- [ ] Relevant architecture docs reviewed
- [ ] Architectural constraints extracted
- [ ] Story alignment with architecture verified
- [ ] Architecture violations documented (or "Aligned" stated)

## Findings Synthesis

- [ ] All findings categorized: Passed / Issues / Critical
- [ ] Validations passed section populated
- [ ] Issues identified section populated (or "None" if applicable)
- [ ] Critical conflicts section populated (or "None" if applicable)

## Recommendations

- [ ] Recommendations provided based on findings
- [ ] Severity of issues clearly communicated
- [ ] Action items suggested if issues found
- [ ] Handoff requirement determined

## Handoff Decision

### If Critical Conflicts Found
- [ ] Handoff to @architect specified
- [ ] Conflicting stories/documents identified
- [ ] Nature of conflict explained
- [ ] Impact assessment provided
- [ ] Suggested resolution approach included

### If Only Non-Critical Issues
- [ ] "No handoff required" stated
- [ ] Issues documented as informational
- [ ] Improvement suggestions provided

### If All Validations Passed
- [ ] "No handoff required" stated
- [ ] Confirmation of alignment documented

## Quality Checks

- [ ] Report is clear and actionable
- [ ] All file paths are project-relative
- [ ] Evidence provided for all findings
- [ ] No speculation - only documented facts
- [ ] Validation demonstrates systematic methodology

## Final Validation

- [ ] Report saved to correct location: {output_folder}/validation-reports/
- [ ] Report filename matches story number
- [ ] All template placeholders replaced with actual content
- [ ] Findings are specific (not vague)
