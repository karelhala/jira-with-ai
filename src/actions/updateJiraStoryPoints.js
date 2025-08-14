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
 * Handle updating JIRA issues with AI story point estimates
 * @param {Array} issues - Issues that have story point estimates
 * @param {Object} jira - JIRA bot instance
 * @returns {Array} Update results
 */
export async function handleUpdateJiraStoryPoints(issues, jira) {
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

  // Filter issues that have story point estimates
  const storyPointIssues = issuesToUpdate.filter(
    issue => issue.storyPointEstimate && issue.storyPointEstimate.points
  );

  if (storyPointIssues.length === 0) {
    console.log('⚠️ No issues found with story point estimates');
    return [];
  }

  console.log(`\n📊 Found ${storyPointIssues.length} issues with story point estimates:`);

  // Show summary of estimates
  const pointsSummary = storyPointIssues.reduce((acc, issue) => {
    const points = issue.storyPointEstimate.points;
    acc[points] = (acc[points] || 0) + 1;
    return acc;
  }, {});

  Object.entries(pointsSummary).forEach(([points, count]) => {
    console.log(`   • ${points} points: ${count} issues`);
  });

  // Ask for confirmation
  const shouldUpdate = await confirm({
    message: `\n🔄 Do you want to update story points for these ${storyPointIssues.length} issues in JIRA?`,
    default: false,
  });

  if (!shouldUpdate) {
    console.log('❌ Story points update cancelled');
    return [];
  }

  console.log('\n🚀 Starting JIRA story points updates...');

  // Update the story points in JIRA
  const results = await jira.updateStoryPoints(storyPointIssues);

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
