import { writeFileSync } from 'fs';

/**
 * Parse command line arguments for dry run mode
 * @returns {Object} Parsed arguments with dryRun flag
 */
export function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('-d') || args.includes('--dry-run');

  return {
    dryRun: isDryRun,
  };
}

/**
 * Simulate JIRA update results for dry run mode
 * @param {Array} issues - Issues to simulate updating
 * @param {string} actionType - Type of action being simulated
 * @returns {Array} Simulated update results
 */
export function simulateJiraUpdates(issues, actionType) {
  console.log(`\n🔍 DRY RUN MODE: Simulating ${actionType} updates for ${issues.length} issues...`);

  const results = issues.map(issue => {
    console.log(`✅ [DRY RUN] Would update ${issue.key}`);
    return {
      issueKey: issue.key,
      status: 'success',
      actionType,
      confidence: issue.confidence || '100%',
      dryRun: true,
    };
  });

  // Summary
  console.log(`\n📊 [DRY RUN] ${actionType} Update Summary:`);
  console.log(`   ✅ Would be successful: ${results.length}`);
  console.log(`   ❌ Would fail: 0`);
  console.log(`   ⚠️ Would be skipped: 0`);
  console.log(`   📋 Total: ${results.length}`);

  return results;
}

/**
 * Save issues to success.json file for dry run mode
 * @param {Array} issues - Issues to save
 * @param {string} actionType - Type of action that was simulated
 */
export function saveDryRunResults(issues, actionType) {
  try {
    const filename = 'static/success.json';
    const data = {
      dryRun: true,
      actionType,
      timestamp: new Date().toISOString(),
      issues: issues,
      summary: {
        total: issues.length,
        successful: issues.length,
        failed: 0,
        skipped: 0,
      },
    };

    writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 [DRY RUN] Results saved to ${filename}`);
    console.log(`🔍 Review what would have been updated without making actual changes`);
  } catch (error) {
    console.error(`❌ Error saving dry run results: ${error.message}`);
  }
}

/**
 * Display dry run mode banner
 */
export function displayDryRunBanner() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DRY RUN MODE ENABLED');
  console.log('No actual changes will be made to JIRA');
  console.log('All updates will be simulated and logged');
  console.log('='.repeat(60));
}
