import { prepareIssuesForGemini } from '../helpers/dataProcessing.js';

/**
 * Handle analyze issues action
 * @param {Array} issues - JIRA issues to analyze
 * @param {Object} gemini - Gemini bot instance
 */
export async function handleAnalyzeIssues(issues, gemini) {
  const sanitizedAnalysisIssues = prepareIssuesForGemini(issues.slice(0, 100));
  const analysisPrompt = `Analyze these JIRA issues and provide insights including:
- Overall summary and patterns
- Priority analysis
- Issue type distribution
- Common themes and recommendations

Issues:
${JSON.stringify(sanitizedAnalysisIssues, null, 2)}`;

  console.log('\n🤖 Analyzing issues...');
  const analysis = await gemini.generateText(analysisPrompt);
  console.log('\n📊 AI Analysis:');
  console.log(analysis);
}
