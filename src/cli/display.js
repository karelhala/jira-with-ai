/**
 * Display utilities for CLI output
 */

/**
 * Display welcome message
 */
export function displayWelcome() {
  console.log('🎯 Welcome to JIRA Interactive Search CLI\n');
}

/**
 * Display search results
 * @param {Object} results - JIRA search results
 */
export function displaySearchResults(results) {
  if (!results || !results.issues || results.issues.length === 0) {
    console.log('\n❌ No issues found or search failed.');
    return false;
  }

  console.log(`\n✅ Found ${results.issues.length} issue(s):\n`);

  results.issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.key}: ${issue.fields.summary}`);
    console.log(`   Status: ${issue.fields.status.name}`);
    console.log(`   Priority: ${issue.fields.priority ? issue.fields.priority.name : 'None'}`);
    console.log(
      `   Assignee: ${issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned'}`
    );
    console.log(`   Created: ${new Date(issue.fields.created).toLocaleDateString()}`);
    console.log('');
  });

  console.log(`Total: ${results.total} issues (showing all ${results.issues.length})`);
  return true;
}

/**
 * Display AI response preview
 * @param {string} response - AI response
 * @param {string} title - Title for the response
 */
export function displayAiResponse(response, title) {
  console.log(`\n${title}:`);
  console.log(response.substring(0, 500) + (response.length > 500 ? '...' : ''));
}

/**
 * Display completion message
 * @param {number} count - Number of processed issues
 */
export function displayCompletion(count) {
  console.log(`\n🎉 Processing complete! ${count} issues processed.`);
}

/**
 * Display error message
 * @param {string} message - Error message
 */
export function displayError(message) {
  console.error(`\n❌ Error occurred: ${message}`);
}
