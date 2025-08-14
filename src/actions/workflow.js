import { processBatches } from '../helpers/batchProcessing.js';
import { prepareIssuesForGemini, cleanGeminiResponse } from '../helpers/dataProcessing.js';
import { saveRawResponse } from '../helpers/fileOperations.js';
import { displayAiResponse } from '../cli/display.js';

/**
 * Handle workflow recommendations action
 * @param {Array} issues - JIRA issues to analyze
 * @param {Object} gemini - Gemini bot instance
 * @returns {Array} Issues with workflow recommendations
 */
export async function handleWorkflow(issues, gemini) {
  return await processBatches(issues, async (batch, batchNumber) => {
    const sanitizedBatch = prepareIssuesForGemini(batch);
    const prompt = `Analyze these JIRA issues and recommend appropriate workflow transitions based on their content and context.

Instructions:
- Analyze each issue's current state and content
- Consider issue content, completion indicators, priority, type of work, dependencies and blockers
- For each issue, add a "workflowRecommendation" field with the following structure:
  {
    "recommendedTransition": "In Progress",
    "confidence": "85%", 
    "reasoning": "Brief explanation of why this transition is recommended",
    "prerequisites": ["list", "of", "requirements"],
    "riskLevel": "low|medium|high"
  }

Note: Use percentage values for confidence (e.g., "95%", "80%", "65%") based on how certain you are about the workflow recommendation.

Issues:
${JSON.stringify(sanitizedBatch, null, 2)}`;

    const response = await gemini.generateText(prompt);
    displayAiResponse(response, '🔄 Workflow Recommendations for this batch');

    // Save raw response for debugging
    saveRawResponse(response, batchNumber, 'workflow');

    try {
      const cleanedResponse = cleanGeminiResponse(response);
      const updatedIssues = JSON.parse(cleanedResponse);
      return Array.isArray(updatedIssues) ? updatedIssues : batch;
    } catch (e) {
      console.log('JSON Parse Error:', e.message);
      return batch;
    }
  });
}
