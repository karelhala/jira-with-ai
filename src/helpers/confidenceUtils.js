/**
 * Extract confidence percentage from various AI result fields
 * @param {Object} issue - Issue object with AI results
 * @returns {number} Confidence percentage (0-100)
 */
export function extractConfidencePercentage(issue) {
  // Check different AI fields for confidence
  const confidenceFields = [
    issue.aiEdit?.confidence,
    issue.storyPointEstimate?.confidence,
    issue.workflowRecommendation?.confidence,
    issue.workType?.confidence,
  ].filter(Boolean);

  if (confidenceFields.length === 0) return 0;

  // Parse percentage strings (e.g., "85%" -> 85)
  const percentages = confidenceFields.map(conf => {
    if (typeof conf === 'string' && conf.includes('%')) {
      return parseInt(conf.replace('%', ''));
    }
    return typeof conf === 'number' ? conf : 0;
  });

  // Return the highest confidence percentage found
  return Math.max(...percentages);
}

/**
 * Filter issues based on confidence threshold and available AI modifications
 * @param {Array} issues - Issues to filter
 * @param {number} threshold - Minimum confidence percentage
 * @returns {Object} Filtered issues grouped by action type
 */
export function filterIssuesByConfidence(issues, threshold) {
  const eligibleIssues = {
    edit: [],
    'story-points': [],
    workflow: [],
    'work-type': [],
  };

  issues.forEach(issue => {
    const confidence = extractConfidencePercentage(issue);

    if (confidence >= threshold) {
      // Check which AI modifications are available
      if (issue.aiEdit && issue.aiEdit.modified) {
        eligibleIssues.edit.push({ ...issue, confidence });
      }
      if (issue.storyPointEstimate) {
        eligibleIssues['story-points'].push({ ...issue, confidence });
      }
      if (issue.workflowRecommendation) {
        eligibleIssues.workflow.push({ ...issue, confidence });
      }
      if (issue.workType && issue.workType.category) {
        eligibleIssues['work-type'].push({ ...issue, confidence });
      }
    }
  });

  return eligibleIssues;
}
