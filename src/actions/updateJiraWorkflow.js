import { confirm } from '@inquirer/prompts';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { DEFAULT_ISSUES_FILE, SUCCESS_ISSUES_FILE, STATIC_DIR } from '../constants.js';

/**
 * Ensure the static directory exists
 */
function ensureStaticDir() {
  if (!existsSync(STATIC_DIR)) {
    mkdirSync(STATIC_DIR, { recursive: true });
  }
}

/**
 * Handle updating JIRA issues with AI workflow recommendations
 * @param {Array} issues - Issues that have workflow recommendations
 * @param {Object} jira - JIRA bot instance
 * @returns {Array} Update results
 */
export async function handleUpdateJiraWorkflow(issues, jira) {
  // If no issues provided, try to read from the default file
  let issuesToUpdate = issues;

  if (!issuesToUpdate || issuesToUpdate.length === 0) {
    try {
      console.log(`📁 No issues provided, reading from ${DEFAULT_ISSUES_FILE}...`);
      const fileContent = readFileSync(DEFAULT_ISSUES_FILE, 'utf8');
      issuesToUpdate = JSON.parse(fileContent);
    } catch (error) {
      console.error(`❌ Could not read ${DEFAULT_ISSUES_FILE}:`, error.message);
      return [];
    }
  }

  // Filter issues that have workflow recommendations
  const workflowIssues = issuesToUpdate.filter(
    issue => issue.workflowRecommendation && issue.workflowRecommendation.recommendedTransition
  );

  if (workflowIssues.length === 0) {
    console.log('⚠️ No issues found with workflow recommendations');
    return [];
  }

  console.log(`\n🔄 Found ${workflowIssues.length} issues with workflow recommendations:`);

  // Show summary of transitions
  const transitionSummary = workflowIssues.reduce((acc, issue) => {
    const transition = issue.workflowRecommendation.recommendedTransition;
    const riskLevel = issue.workflowRecommendation.riskLevel || 'unknown';
    const key = `${transition} (${riskLevel} risk)`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  Object.entries(transitionSummary).forEach(([transition, count]) => {
    console.log(`   • ${transition}: ${count} issues`);
  });

  // Ask for confirmation with risk warning
  const hasHighRisk = workflowIssues.some(
    issue => issue.workflowRecommendation.riskLevel === 'high'
  );

  if (hasHighRisk) {
    console.log('\n⚠️ WARNING: Some transitions are marked as high risk!');
  }

  const shouldUpdate = await confirm({
    message: `\n🔄 Do you want to apply these workflow transitions to ${workflowIssues.length} issues in JIRA?`,
    default: false,
  });

  if (!shouldUpdate) {
    console.log('❌ Workflow update cancelled');
    return [];
  }

  console.log('\n🚀 Starting JIRA workflow transitions...');

  // Update the workflows in JIRA
  const results = await jira.updateWorkflowTransitions(workflowIssues);

  // Process results and move successful issues
  const successfulKeys = results
    .filter(result => result.status === 'success')
    .map(result => result.issueKey);

  if (successfulKeys.length > 0) {
    console.log(`\n📁 Processing file updates for ${successfulKeys.length} successful updates...`);

    // Separate successful and remaining issues
    const successfulIssues = issuesToUpdate.filter(issue => successfulKeys.includes(issue.key));
    const remainingIssues = issuesToUpdate.filter(issue => !successfulKeys.includes(issue.key));

    try {
      ensureStaticDir();

      // Save successful issues to success_issues.json
      writeFileSync(SUCCESS_ISSUES_FILE, JSON.stringify(successfulIssues, null, 2));
      console.log(
        `✅ Moved ${successfulIssues.length} successful issues to ${SUCCESS_ISSUES_FILE}`
      );

      // Save remaining issues back to issues.json
      writeFileSync(DEFAULT_ISSUES_FILE, JSON.stringify(remainingIssues, null, 2));
      console.log(
        `📝 Updated ${DEFAULT_ISSUES_FILE} with ${remainingIssues.length} remaining issues`
      );
    } catch (error) {
      console.error('❌ Error updating files:', error.message);
    }
  } else {
    console.log('\n⚠️ No successful updates - files not modified');
  }

  return results;
}
