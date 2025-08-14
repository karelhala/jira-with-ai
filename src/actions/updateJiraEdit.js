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
 * Handle updating JIRA issues with AI edits
 * @param {Array} issues - Issues that have been edited with AI
 * @param {Object} jira - JIRA bot instance
 * @returns {Array} Update results
 */
export async function handleUpdateJiraEdit(issues, jira) {
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

  // Filter issues that have AI edits
  const editedIssues = issuesToUpdate.filter(issue => issue.aiEdit && issue.aiEdit.modified);

  if (editedIssues.length === 0) {
    console.log('⚠️ No issues found with AI edits');
    return [];
  }

  console.log(`\n📝 Found ${editedIssues.length} issues with AI edits:`);

  // Show summary of edits
  editedIssues.forEach(issue => {
    const changes = issue.aiEdit.changes || ['unknown'];
    console.log(`   • ${issue.key}: ${changes.join(', ')} (${issue.aiEdit.confidence} confidence)`);
  });

  // Ask for confirmation
  const shouldUpdate = await confirm({
    message: `\n🔄 Do you want to apply these AI edits to ${editedIssues.length} issues in JIRA?`,
    default: false,
  });

  if (!shouldUpdate) {
    console.log('❌ Edit update cancelled');
    return [];
  }

  console.log('\n🚀 Starting JIRA edit updates...');

  // Update the issues in JIRA
  const results = await jira.updateEditedIssues(editedIssues);

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
