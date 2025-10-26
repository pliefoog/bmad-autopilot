# Bug Investigation Workflow Instructions (DMAIC Framework)

```xml
<critical>The workflow execution engine is governed by: {project-root}/bmad/core/tasks/workflow.xml</critical>
<critical>You MUST have already loaded and processed: {installed_path}/workflow.yaml</critical>
<critical>Communicate all responses in {communication_language}</critical>
<critical>This workflow implements DMAIC methodology for systematic bug investigation</critical>

<workflow>

<step n="1" goal="D - DEFINE: Gather initial report and identify related story">

  <ask response="user_description">Please describe the issue you're experiencing in detail. What's not working as expected?</ask>

  <ask response="expected_behavior">What behavior did you expect? (If you're not sure, I'll help identify this from the project documentation)</ask>

  <ask response="reproduction_steps">Can you provide steps to reproduce the issue? Or should I help guide you through capturing this?</ask>

  <action>Ask user if they know which story/feature this relates to, or auto-discover by analyzing the description against story files in {story_dir}</action>

  <check if="story identified">
    <action>Read the related story file completely</action>
    <action>Check if corresponding story-context file exists at {story_dir}/{{story_key}}.context.md</action>
    <action>Read story-context if available</action>
    <action>Extract expected behavior from story Acceptance Criteria</action>
  </check>

  <check if="no story identified">
    <action>Search {story_dir} for stories matching keywords from user description</action>
    <action>Present top 3 matches to user for selection</action>
    <ask>Which story does this relate to? (1-3) or [none] if this might be a new feature request</ask>
  </check>

  <action>Generate bug ID: BUG-{{story_number}}-{{sequence}} where sequence is next available number for that story</action>

  <action>Create initial hypothesis classification:
    - If user expectation != story specification → Likely "not a bug" or documentation issue
    - If user expectation == story specification → Likely code bug
    - If unclear → Needs investigation
  </action>

  <template-output>bug_id, reported_by, report_date, story_reference, context_reference, user_description, expected_behavior, initial_hypothesis</template-output>

  <output>

  **Investigation Started: {{bug_id}}**

  Related to: {{story_reference}}
  Initial hypothesis: {{initial_hypothesis}}

  Now moving to evidence collection...
  </output>

</step>

<step n="2" goal="M - MEASURE: Collect evidence systematically">

  <action>Guide user through evidence collection based on issue type</action>

  <ask>Have you already captured any of the following evidence? (Check all that apply):
    [ ] Screenshots of the issue
    [ ] Log files or console output
    [ ] Network request/response data
    [ ] Steps to reproduce
    [ ] Expected vs actual results
  </ask>

  <check if="user has evidence">
    <ask>Please share the evidence you've collected (paste logs, describe screenshots, etc.)</ask>
  </check>

  <check if="user needs guidance">
    <action>Provide specific evidence collection instructions based on:
      - Project tech stack (read package.json, project config files)
      - Issue type (UI, data, network, logic)
      - Available logging mechanisms
    </action>
    <ask>I can help you gather this evidence. Would you like me to:
      1. Guide you on capturing screenshots/logs
      2. Attempt to access logs/system state directly (if I have access)
      3. Provide a checklist of evidence to gather before continuing
    </ask>
  </check>

  <action>Attempt to reproduce the issue based on provided steps (if feasible in current environment)</action>

  <critical>Self-Reflection Checkpoint:
    - Do I have enough evidence to proceed?
    - Does the evidence align with the story specification?
    - Am I investigating the right layer (UI/data/network/logic)?
  </critical>

  <template-output>reproduction_steps, evidence_collected</template-output>

  <output>

  **Evidence Collection Complete**

  Evidence gathered:
  {{evidence_collected}}

  Moving to analysis phase...
  </output>

</step>

<step n="3" goal="A - ANALYZE: Root cause analysis using Five Whys">

  <action>Begin systematic investigation following DMAIC and Five Whys methodology</action>

  <critical>Investigation Strategy:
    1. Always reference story/story-context as single source of truth
    2. Investigate from user-visible layer down to root cause
    3. After EACH step, cross-compare findings to story specification
    4. Practice self-critical reflection - am I on the right track?
    5. Document each step with evidence
  </critical>

  <action>Create investigation plan based on:
    - Issue symptoms from user report
    - Project structure (read project files to understand architecture)
    - Tech stack (identify relevant layers: UI → Store → Service → Data)
    - Story specification (what should be happening)
  </action>

  <output>

  **Investigation Plan:**
  Based on the evidence and project structure, I will investigate in this order:
  [List investigation steps with rationale]

  Starting investigation...
  </output>

  <!-- Investigation Loop - Execute multiple times as needed -->
  <step n="3a" goal="Investigation Step" repeat="until root cause found">

    <action>Execute next planned investigation step:
      - Read relevant source code files
      - Check configuration files
      - Examine data flow
      - Verify dependencies
      - Compare implementation vs story/context specification
    </action>

    <action>Document step findings:
      **Step {{step_number}}: {{step_description}}**
      - Action Taken: {{action_taken}}
      - Evidence: {{evidence_found}}
      - Findings: {{what_discovered}}
      - Story Alignment: {{matches_spec_or_not}}
    </action>

    <critical>Self-Critical Reflection:
      - What did I just learn?
      - Does this align with the story/context specification?
      - Am I still on the right track or should I pivot?
      - Do I need to investigate a different layer?
      - Ask "Why?" - go deeper if needed
    </critical>

    <action>Cross-compare findings against:
      - Story acceptance criteria
      - Story-context specifications
      - Previous investigation step findings
      - Architecture documentation
    </action>

    <check if="gap identified between implementation and specification">
      <action>Document the gap clearly</action>
      <action>Determine if this is the root cause or a symptom</action>
      <ask>Continue investigating deeper [c] or move to classification [classify]?</ask>
    </check>

    <check if="implementation matches specification">
      <action>Note that code is working as specified</action>
      <critical>This may indicate:
        - User misunderstanding (not a bug)
        - Documentation issue (spec is wrong)
        - Feature request (user wants different behavior)
      </critical>
    </check>

    <template-output>investigation_steps (append each step)</template-output>

  </step>

  <action>After investigation loop completes, synthesize all findings</action>

  <template-output>root_cause, findings_summary</template-output>

</step>

<step n="4" goal="I - IDENTIFY: Classify the issue and assess impact">

  <action>Based on investigation findings, classify the issue:</action>

  <classification-decision-tree>

    IF implementation != story specification:
      IF gap is simple (single file, minimal change, no architecture impact):
        → Classification: "Small Bug"
        → Handoff Target: @dev

      IF gap requires multiple changes OR touches architecture:
        → Classification: "Complex Bug - Architectural Assessment Needed"
        → Handoff Target: @architect

    IF story conflicts with other stories OR story contradicts architecture:
      → Classification: "Documentation Conflict"
      → Handoff Target: @architect

    IF implementation == story specification (working as documented):
      → Classification: "Not a Bug - Working As Specified"
      → Handoff Target: user (explain findings)

    IF external library has structural issues (not just version):
      → Classification: "External Dependency - Architectural Issue"
      → Handoff Target: @architect

    IF issue cannot be fixed without major refactoring:
      → Classification: "Design Flaw - Unfixable As Designed"
      → Handoff Target: @architect (with impact assessment)

  </classification-decision-tree>

  <action>Assess impact:
    - Scope: Which components/features affected?
    - Severity: Critical/High/Medium/Low based on user impact
    - Affected Components: List specific files/modules
  </action>

  <template-output>classification, impact_scope, impact_severity, affected_components</template-output>

  <output>

  **Classification Complete:**
  - Type: {{classification}}
  - Severity: {{impact_severity}}
  - Scope: {{impact_scope}}

  Preparing handoff...
  </output>

</step>

<step n="5" goal="C - COMMUNICATE: Create handoff report">

  <action>Determine handoff target based on classification</action>

  <action>Compile handoff rationale:
    - Reference specific investigation steps
    - Include evidence that led to classification
    - Provide clear reasoning for routing decision
  </action>

  <action>Prepare recommended action based on classification:

    For @dev (Small Bug):
      - Specific file(s) and line numbers with issue
      - Expected vs actual behavior
      - Suggested fix approach (non-prescriptive)

    For @architect (Complex/Architectural):
      - Nature of architectural concern
      - Impact assessment
      - Alternatives considered during investigation
      - Request for architectural review

    For @architect (Documentation Conflict):
      - Specific stories/documents in conflict
      - Nature of contradiction
      - Request for specification clarification

    For user (Not a Bug):
      - Clear explanation of findings
      - Reference to story specification
      - Explanation of why current behavior is correct
  </action>

  <action>Generate evidence references section:
    - Stories: [list with paths]
    - Code: [files:lines with issue]
    - Logs: [relevant excerpts]
    - Documentation: [architecture docs referenced]
  </action>

  <template-output>handoff_target, handoff_rationale, recommended_action, evidence_references, total_steps</template-output>

  <action>Save complete Bug Investigation Report to {default_output_file}</action>

  <output>

  **✅ Bug Investigation Complete, {user_name}!**

  **Report**: {{bug_id}}
  **Classification**: {{classification}}
  **Handoff To**: {{handoff_target}}

  **Summary**: {{findings_summary}}

  **Next Steps**:
  {{recommended_action}}

  **Report Location**: {default_output_file}

  ---

  Investigation conducted using DMAIC methodology with {{total_steps}} systematic investigation steps.
  </output>

</step>

<step n="6" goal="Validate investigation report" optional="true">
  <invoke-task>Validate against checklist at {installed_path}/checklist.md using bmad/core/tasks/validate-workflow.xml</invoke-task>
</step>

</workflow>
```
