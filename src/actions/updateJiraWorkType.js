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
 * Handle updating JIRA work types from classified issues
 * @param {Array} issues - Issues that have been classified with work types
 * @param {Object} jira - JIRA bot instance
 * @returns {Array} Update results
 */
export async function handleUpdateJiraWorkType(issues, jira) {
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

  // Filter issues that have work type classifications
  const classifiedIssues = issuesToUpdate.filter(
    issue => issue.workType && issue.workType.category
  );

  if (classifiedIssues.length === 0) {
    console.log('⚠️ No issues found with work type classifications');
    return [];
  }

  console.log(`\n📊 Found ${classifiedIssues.length} issues with work type classifications:`);

  // Show summary of classifications
  const workTypeSummary = classifiedIssues.reduce((acc, issue) => {
    const category = issue.workType.categoryName;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  Object.entries(workTypeSummary).forEach(([category, count]) => {
    console.log(`   • ${category}: ${count} issues`);
  });

  // Ask for confirmation
  const shouldUpdate = await confirm({
    message: `\n🔄 Do you want to update these ${classifiedIssues.length} issues in JIRA?`,
    default: false,
  });

  if (!shouldUpdate) {
    console.log('❌ Update cancelled');
    return [];
  }

  console.log('\n🚀 Starting JIRA updates...');

  // Update the work types in JIRA
  const results = await jira.updateWorkType(classifiedIssues);

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
