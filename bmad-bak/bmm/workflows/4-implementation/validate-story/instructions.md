# Story Validation Workflow Instructions

```xml
<critical>The workflow execution engine is governed by: {project-root}/bmad/core/tasks/workflow.xml</critical>
<critical>You MUST have already loaded and processed: {installed_path}/workflow.yaml</critical>
<critical>Communicate all responses in {communication_language}</critical>
<critical>This workflow validates story/context alignment and identifies documentation conflicts</critical>

<workflow>

<step n="1" goal="Load story and related documentation">

  <ask response="story_selection">Which story would you like to validate? Provide:
    1. Story number (e.g., "6.5")
    2. Story path
    3. Or [list] to see available stories
  </ask>

  <check if="story_selection == 'list'">
    <action>Scan {story_dir} for story files (story-*.md)</action>
    <action>List stories with: number, title, status, last modified</action>
    <ask>Select a story to validate (1-N):</ask>
  </check>

  <action>Read complete story file</action>
  <action>Extract: story_number, story_title, story_status, epic_id, acceptance_criteria, tasks, dev_notes</action>

  <action>Check for story-context file at {story_dir}/{{story_key}}.context.md</action>

  <check if="context file exists">
    <action>Read complete story-context file</action>
    <template-output>context_path, context_alignment_status="Context Found"</template-output>
  </check>

  <check if="context file missing">
    <template-output>context_path="N/A", context_alignment_status="No Context File"</template-output>
    <action>Note: This is not necessarily an error - context may not be created yet</action>
  </check>

  <template-output>story_path, story_title, story_status, epic_id</template-output>

</step>

<step n="2" goal="Validate story-context alignment">

  <check if="context file exists">

    <action>Compare story acceptance criteria against context requirements:
      - Are all ACs represented in context?
      - Do context constraints match story requirements?
      - Are referenced artifacts relevant to story tasks?
    </action>

    <action>Check for inconsistencies:
      - Context references non-existent files
      - Context constraints contradict story Dev Notes
      - Context interfaces don't match story requirements
      - Context test ideas don't cover all ACs
    </action>

    <template-output>context_alignment_details (detailed findings)</template-output>

  </check>

  <check if="no context file">
    <template-output>context_alignment_details="Context file not yet created - no alignment validation possible"</template-output>
  </check>

</step>

<step n="3" goal="Check for cross-story conflicts">

  <action>Identify related stories:
    - Same epic stories (search for stories with same epic_id)
    - Keyword-related stories (search story titles/descriptions for overlapping keywords)
    - Dependency-referenced stories (stories mentioned in Dev Notes or dependencies sections)
  </action>

  <action>For each related story found:
    - Read complete story file
    - Extract acceptance criteria and key requirements
    - Compare against current story being validated
  </action>

  <action>Check for conflicts:
    - Contradictory acceptance criteria
    - Conflicting Dev Notes or constraints
    - Overlapping features with different specifications
    - Dependency inconsistencies
    - Status conflicts (one story says "deprecated", another says "implement")
  </action>

  <template-output>stories_checked (list of related stories)</template-output>
  <template-output>conflict_findings (detailed conflict analysis or "No conflicts detected")</template-output>

</step>

<step n="4" goal="Validate against architecture documentation">

  <action>Identify architecture documentation locations:
    - Look for docs/architecture/ or similar
    - Check for ARCHITECTURE.md, architecture.md, or arch/ folders
    - Search for PRD or specification documents
  </action>

  <action>For each architecture document found:
    - Read relevant sections
    - Extract architectural patterns, constraints, and principles
    - Compare against story requirements and Dev Notes
  </action>

  <action>Check for alignment issues:
    - Story violates architectural constraints
    - Story uses deprecated patterns
    - Story conflicts with system design principles
    - Story requires architectural changes not documented
  </action>

  <template-output>architecture_docs (list of docs checked)</template-output>
  <template-output>architecture_alignment (findings or "Aligned with architecture")</template-output>

</step>

<step n="5" goal="Synthesize findings and determine severity">

  <action>Categorize all findings:

    ✅ PASSED:
      - Story-context aligned
      - No cross-story conflicts
      - Architecture alignment verified
      - All references valid

    ⚠️ ISSUES (Non-critical):
      - Missing context file (but story is Draft)
      - Minor inconsistencies in wording
      - Suggested improvements

    🚨 CRITICAL CONFLICTS:
      - Story contradicts another story
      - Story violates architecture constraints
      - Context references invalid files/interfaces
      - Acceptance criteria conflict within same epic
  </action>

  <template-output>validations_passed, issues_identified, critical_conflicts</template-output>

</step>

<step n="6" goal="Generate recommendations and handoff">

  <check if="critical_conflicts found">
    <action>Create detailed recommendations:
      - Which stories/docs are in conflict
      - Nature of the conflict
      - Suggested resolution approach
      - Impact if not resolved
    </action>

    <template-output>handoff_required="Yes - @architect"</template-output>
    <template-output>handoff_details="Critical documentation conflicts require architectural review and specification clarification. See Critical Conflicts section for details."</template-output>
  </check>

  <check if="only issues (no critical conflicts)">
    <action>Provide improvement suggestions but no handoff required</action>
    <template-output>handoff_required="No - Informational only"</template-output>
    <template-output>handoff_details="Issues identified are non-critical. See Issues section for suggested improvements."</template-output>
  </check>

  <check if="all validations passed">
    <template-output>handoff_required="No - All validations passed"</template-output>
    <template-output>handoff_details="Story and related documentation are consistent and aligned."</template-output>
  </check>

  <template-output>recommendations</template-output>

  <action>Save validation report to {default_output_file}</action>

  <output>

  **✅ Story Validation Complete, {user_name}!**

  **Story**: {{story_title}} ({{story_number}})

  **Results**:
  - ✅ Passed: {{count validations_passed}}
  - ⚠️ Issues: {{count issues_identified}}
  - 🚨 Critical: {{count critical_conflicts}}

  **Report Location**: {default_output_file}

  {{handoff_required}}

  </output>

</step>

<step n="7" goal="Validate report" optional="true">
  <invoke-task>Validate against checklist at {installed_path}/checklist.md using bmad/core/tasks/validate-workflow.xml</invoke-task>
</step>

</workflow>
```
