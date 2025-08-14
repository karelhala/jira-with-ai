import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { STATIC_DIR, DEFAULT_ISSUES_FILE } from '../constants.js';

/**
 * Ensure the static directory exists
 */
function ensureStaticDir() {
  if (!existsSync(STATIC_DIR)) {
    mkdirSync(STATIC_DIR, { recursive: true });
  }
}

/**
 * Save raw Gemini response for debugging
 * @param {string} response - Raw Gemini response
 * @param {number} batchNumber - Batch number for filename
 * @param {string} action - Action type for filename
 */
export function saveRawResponse(response, batchNumber, action) {
  try {
    ensureStaticDir();
    const filename = `${STATIC_DIR}/raw_${action}_${batchNumber}.txt`;
    writeFileSync(filename, response);
    console.log(`🔍 Raw response saved to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving raw response: ${error.message}`);
  }
}

/**
 * Save processed issues to JSON file
 * @param {Array} issues - Processed issues
 * @param {string} filename - Output filename (default: static/issues.json)
 */
export function saveIssues(issues, filename = DEFAULT_ISSUES_FILE) {
  try {
    ensureStaticDir();
    writeFileSync(filename, JSON.stringify(issues, null, 2));
    console.log(`\n💾 Issues saved to ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving issues: ${error.message}`);
  }
}
