import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { WORK_TYPES } from '../constants.js';

const WORK_TYPE_CUSTOM_FIELD = 'customfield_12320040';
const STORY_POINTS_FIELD = 'customfield_10002';

/**
 * Generate bash script for manual JIRA updates
 * @param {Array} issues - Issues to generate script for
 * @param {string} action - Type of action (work-type, story-points, edit, workflow)
 * @param {boolean} dryRun - Whether this is a dry run
 * @returns {string} Path to generated bash script
 */
export function generateBashScript(issues, action, dryRun = false) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `jira-update-${action}-${timestamp}.sh`;
  const staticDir = path.join(process.cwd(), 'static');
  const scriptPath = path.join(staticDir, filename);

  // Ensure static directory exists
  try {
    mkdirSync(staticDir, { recursive: true });
  } catch {
    // Directory might already exist, that's fine
  }

  let bashContent = generateBashHeader(action, dryRun);

  for (const issue of issues) {
    const commands = generateIssueCommands(issue, action);
    if (commands.length > 0) {
      bashContent += `\n# Update ${issue.key}: ${issue.fields.summary}\n`;
      bashContent += commands.join('\n') + '\n';
    }
  }

  bashContent += generateBashFooter();

  writeFileSync(scriptPath, bashContent, 'utf8');
  console.log(`📝 Generated bash script: static/${filename}`);

  return scriptPath;
}

/**
 * Generate bash script header with environment setup
 * @param {string} action - Action type
 * @param {boolean} dryRun - Whether this is a dry run
 * @returns {string} Bash header content
 */
function generateBashHeader(action, dryRun) {
  const dryRunNote = dryRun ? '\n# [DRY RUN MODE] Review these commands before execution!' : '';

  return `#!/bin/bash

# JIRA ${action.toUpperCase()} Update Script
# Generated on: ${new Date().toISOString()}${dryRunNote}
#
# PREREQUISITES:
# 1. Install jq for JSON processing:
#    sudo apt-get install jq  # Ubuntu/Debian
#    brew install jq          # macOS
#
# 2. Set environment variables:
#    export JIRA_TOKEN="your-jira-token"
#    export IS_PROD="true"  # or "false" for staging
#    export PROXY_URL="your-proxy-url"  # only if needed for staging
#
# 3. Make this script executable:
#    chmod +x static/${path.basename(process.cwd())}.sh
#
# 4. Run the script:
#    ./static/${path.basename(process.cwd())}.sh

set -e  # Exit on any error

# Configuration
if [ "$IS_PROD" = "true" ]; then
    JIRA_BASE_URL="https://issues.redhat.com"
    TOKEN="$JIRA_TOKEN"
else
    JIRA_BASE_URL="https://issues.stage.redhat.com"
    TOKEN="$JIRA_STAGE_TOKEN"
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Error: JIRA token not set. Please set JIRA_TOKEN or JIRA_STAGE_TOKEN environment variable."
    exit 1
fi

# Proxy setup for staging (if needed)
PROXY_ARGS=""
if [ "$IS_PROD" != "true" ] && [ -n "$PROXY_URL" ]; then
    PROXY_ARGS="--proxy $PROXY_URL"
fi

echo "🚀 Starting JIRA ${action} updates..."
echo "🌐 Base URL: $JIRA_BASE_URL"
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
`;
}

/**
 * Generate JIRA API commands for a specific issue
 * @param {Object} issue - JIRA issue object
 * @param {string} action - Action type
 * @returns {Array} Array of curl commands
 */
function generateIssueCommands(issue, action) {
  switch (action) {
    case 'work-type':
      return generateWorkTypeCommands(issue);
    case 'story-points':
      return generateStoryPointsCommands(issue);
    case 'edit':
      return generateEditCommands(issue);
    case 'workflow':
      return generateWorkflowCommands(issue);
    default:
      return [];
  }
}

/**
 * Generate work type update commands
 * @param {Object} issue - JIRA issue
 * @returns {Array} Curl commands
 */
function generateWorkTypeCommands(issue) {
  if (!issue.workType || !issue.workType.category) {
    return [`# Skipping ${issue.key} - no work type classification`];
  }

  // Map work type value to JIRA ID with fallback matching
  let workType = WORK_TYPES.find(wt => wt.value === issue.workType.category);

  // Fallback: try to match by partial string matching if exact match fails
  if (!workType) {
    const category = issue.workType.category.toLowerCase();
    workType = WORK_TYPES.find(wt => {
      const wtValue = wt.value.toLowerCase();
      const wtName = wt.name.toLowerCase();

      // Check if category matches the value or if there's substantial overlap
      return (
        category === wtValue ||
        category.includes(wtValue) ||
        wtValue.includes(category) ||
        // Special case for quality-stability variations
        (category.includes('quality') &&
          category.includes('stability') &&
          wtValue === 'quality-stability') ||
        // Match by name similarity
        category.replace(/[^a-z]/g, '') === wtName.replace(/[^a-z]/g, '')
      );
    });
  }

  if (!workType) {
    return [
      `# Skipping ${issue.key} - unknown work type: ${issue.workType.category}`,
      `# Available work types: ${WORK_TYPES.map(wt => wt.value).join(', ')}`,
    ];
  }

  const updateData = {
    fields: {
      [WORK_TYPE_CUSTOM_FIELD]: {
        id: workType.id,
      },
    },
  };

  return [
    `echo "🔄 Updating ${issue.key} with work type: ${workType.name}"`,
    `if curl -s -X PUT "$JIRA_BASE_URL/rest/api/2/issue/${issue.key}" \\`,
    `  -H "Accept: application/json" \\`,
    `  -H "Authorization: Bearer $TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  $PROXY_ARGS \\`,
    `  -d '${JSON.stringify(updateData)}' > /dev/null; then`,
    `  echo "✅ Successfully updated ${issue.key}"`,
    `  ((SUCCESS_COUNT++))`,
    `else`,
    `  echo "❌ Failed to update ${issue.key}"`,
    `  ((FAILED_COUNT++))`,
    `fi`,
  ];
}

/**
 * Generate story points update commands
 * @param {Object} issue - JIRA issue
 * @returns {Array} Curl commands
 */
function generateStoryPointsCommands(issue) {
  if (!issue.storyPointEstimate || !issue.storyPointEstimate.points) {
    return [`# Skipping ${issue.key} - no story point estimate`];
  }

  const points = issue.storyPointEstimate.points;
  const updateData = {
    fields: {
      [STORY_POINTS_FIELD]: points,
    },
  };

  return [
    `echo "🔄 Updating ${issue.key} with ${points} story points"`,
    `if curl -s -X PUT "$JIRA_BASE_URL/rest/api/2/issue/${issue.key}" \\`,
    `  -H "Accept: application/json" \\`,
    `  -H "Authorization: Bearer $TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  $PROXY_ARGS \\`,
    `  -d '${JSON.stringify(updateData)}' > /dev/null; then`,
    `  echo "✅ Successfully updated ${issue.key}"`,
    `  ((SUCCESS_COUNT++))`,
    `else`,
    `  echo "❌ Failed to update ${issue.key}"`,
    `  ((FAILED_COUNT++))`,
    `fi`,
  ];
}

/**
 * Generate edit commands for issue updates
 * @param {Object} issue - JIRA issue
 * @returns {Array} Curl commands
 */
function generateEditCommands(issue) {
  if (!issue.aiEdit || !issue.aiEdit.modified) {
    return [`# Skipping ${issue.key} - no AI edits to apply`];
  }

  const updateData = { fields: {} };

  // Apply changes to core fields (checking against originalFields if available)
  if (issue.fields.summary !== issue.originalFields?.summary) {
    updateData.fields.summary = issue.fields.summary;
  }
  if (issue.fields.description !== issue.originalFields?.description) {
    updateData.fields.description = issue.fields.description;
  }

  if (Object.keys(updateData.fields).length === 0) {
    return [`# Skipping ${issue.key} - no field changes detected`];
  }

  const changesText = issue.aiEdit.changes ? issue.aiEdit.changes.join(', ') : 'fields';

  return [
    `echo "🔄 Applying AI edits to ${issue.key} (${changesText})"`,
    `if curl -s -X PUT "$JIRA_BASE_URL/rest/api/2/issue/${issue.key}" \\`,
    `  -H "Accept: application/json" \\`,
    `  -H "Authorization: Bearer $TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  $PROXY_ARGS \\`,
    `  -d '${JSON.stringify(updateData)}' > /dev/null; then`,
    `  echo "✅ Successfully updated ${issue.key}"`,
    `  ((SUCCESS_COUNT++))`,
    `else`,
    `  echo "❌ Failed to update ${issue.key}"`,
    `  ((FAILED_COUNT++))`,
    `fi`,
  ];
}

/**
 * Generate workflow transition commands
 * @param {Object} issue - JIRA issue
 * @returns {Array} Curl commands
 */
function generateWorkflowCommands(issue) {
  if (!issue.workflowRecommendation || !issue.workflowRecommendation.recommendedTransition) {
    return [`# Skipping ${issue.key} - no workflow recommendation`];
  }

  const recommendedTransition = issue.workflowRecommendation.recommendedTransition;

  return [
    `echo "🔄 Processing workflow transition for ${issue.key} to '${recommendedTransition}'"`,
    ``,
    `# First, get available transitions`,
    `TRANSITIONS=$(curl -s -X GET "$JIRA_BASE_URL/rest/api/2/issue/${issue.key}/transitions" \\`,
    `  -H "Accept: application/json" \\`,
    `  -H "Authorization: Bearer $TOKEN" \\`,
    `  $PROXY_ARGS)`,
    ``,
    `if [ $? -ne 0 ]; then`,
    `  echo "❌ Failed to get transitions for ${issue.key}"`,
    `  ((FAILED_COUNT++))`,
    `else`,
    `  # Extract transition ID (simplified - may need manual adjustment)`,
    `  TRANSITION_ID=$(echo "$TRANSITIONS" | jq -r '.transitions[] | select(.name == "${recommendedTransition}" or .to.name == "${recommendedTransition}") | .id' | head -1)`,
    `  `,
    `  if [ "$TRANSITION_ID" = "null" ] || [ -z "$TRANSITION_ID" ]; then`,
    `    echo "⚠️ Transition '${recommendedTransition}' not available for ${issue.key}"`,
    `    echo "Available transitions:"`,
    `    echo "$TRANSITIONS" | jq -r '.transitions[].name'`,
    `    ((FAILED_COUNT++))`,
    `  else`,
    `    echo "🔄 Transitioning ${issue.key} using transition ID: $TRANSITION_ID"`,
    `    if curl -s -X POST "$JIRA_BASE_URL/rest/api/2/issue/${issue.key}/transitions" \\`,
    `      -H "Accept: application/json" \\`,
    `      -H "Authorization: Bearer $TOKEN" \\`,
    `      -H "Content-Type: application/json" \\`,
    `      $PROXY_ARGS \\`,
    `      -d "{\\"transition\\": {\\"id\\": \\"$TRANSITION_ID\\"}}" > /dev/null; then`,
    `      echo "✅ Successfully transitioned ${issue.key}"`,
    `      ((SUCCESS_COUNT++))`,
    `    else`,
    `      echo "❌ Failed to transition ${issue.key}"`,
    `      ((FAILED_COUNT++))`,
    `    fi`,
    `  fi`,
    `fi`,
  ];
}

/**
 * Generate bash script footer with summary
 * @returns {string} Bash footer content
 */
function generateBashFooter() {
  return `
echo ""
echo "🎉 Update script completed!"
echo "📊 Summary:"
echo "   ✅ Successful: $SUCCESS_COUNT"
echo "   ❌ Failed: $FAILED_COUNT"
echo "   📋 Total: $((SUCCESS_COUNT + FAILED_COUNT))"

if [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️ Some updates failed. Please review the output above."
    exit 1
else
    echo "🎉 All updates completed successfully!"
fi
`;
}
