/**
 * Data processing utilities for JIRA issues and Gemini responses
 */

/**
 * Strip unnecessary fields from JIRA issues to reduce payload size
 * @param {Array} issues - Array of JIRA issues
 * @returns {Array} Streamlined issues with only essential fields
 */
export function streamlineIssues(issues) {
  return issues.map(issue => ({
    key: issue.key,
    fields: {
      summary: issue.fields.summary,
      description: issue.fields.description,
      priority: issue.fields.priority ? {
        name: issue.fields.priority.name
      } : null,
      issuetype: issue.fields.issuetype ? {
        name: issue.fields.issuetype.name
      } : null,
      created: issue.fields.created,
      updated: issue.fields.updated,
      // Keep any custom fields that might be important
      ...Object.fromEntries(
        Object.entries(issue.fields).filter(([key]) => 
          key.startsWith('customfield_') || key === 'labels' || key === 'components'
        )
      )
    }
  }));
}

/**
 * Clean JIRA issues by replacing backticks with single quotes
 * @param {Array} issues - Array of issues to sanitize
 * @returns {Array} Sanitized issues
 */
export function sanitizeIssues(issues) {
  const sanitizedIssues = JSON.parse(JSON.stringify(issues)); // Deep clone
  
  function replaceBackticks(obj) {
    if (typeof obj === 'string') {
      return obj.replace(/`/g, "'");
    } else if (Array.isArray(obj)) {
      return obj.map(replaceBackticks);
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceBackticks(value);
      }
      return result;
    }
    return obj;
  }
  
  return replaceBackticks(sanitizedIssues);
}

/**
 * Clean Gemini response by removing markdown code block formatting and explanatory text
 * @param {string} response - Raw Gemini response
 * @returns {string} Cleaned JSON string
 */
export function cleanGeminiResponse(response) {
  if (typeof response !== 'string') {
    return response;
  }
  
  let cleaned = response.trim();
  
  // Find the first occurrence of ```json and remove everything before it
  const jsonStartIndex = cleaned.indexOf('```json');
  if (jsonStartIndex !== -1) {
    cleaned = cleaned.substring(jsonStartIndex);
  }
  
  // Check for various markdown code block patterns
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  
  // Remove ending ``` marker
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  
  return cleaned.trim();
}

/**
 * Process issues and prepare them for Gemini
 * @param {Array} issues - Raw JIRA issues
 * @returns {Array} Processed and sanitized issues
 */
export function prepareIssuesForGemini(issues) {
  const streamlined = streamlineIssues(issues);
  return sanitizeIssues(streamlined);
}
