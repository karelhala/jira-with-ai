import { writeFileSync } from 'fs';

/**
 * Save raw Gemini response for debugging
 * @param {string} response - Raw Gemini response
 * @param {number} batchNumber - Batch number for filename
 * @param {string} action - Action type for filename
 */
export function saveRawResponse(response, batchNumber, action) {
  try {
    const filename = `raw_${action}_${batchNumber}.txt`;
    writeFileSync(filename, response);
    console.log(`🔍 Raw response saved to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving raw response: ${error.message}`);
  }
}

/**
 * Save processed issues to JSON file
 * @param {Array} issues - Processed issues
 * @param {string} filename - Output filename (default: issues.json)
 */
export function saveIssues(issues, filename = 'issues.json') {
  try {
    writeFileSync(filename, JSON.stringify(issues, null, 2));
    console.log(`\n💾 Issues saved to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving issues: ${error.message}`);
  }
}
