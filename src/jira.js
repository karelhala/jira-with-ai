import nodeFetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { WORK_TYPES } from './constants.js';

const SEARCH = '/rest/api/2/search';
const UPDATE_ISSUE = '/rest/api/2/issue/';
const TRANSITION_ISSUE = '/rest/api/2/issue/{key}/transitions';
const WORK_TYPE_CUSTOM_FIELD = 'customfield_12320040';
const STORY_POINTS_FIELD = 'customfield_10002'; // Standard story points field

export function JiraBot() {
  const baseUrl = process.env.IS_PROD
    ? 'https://issues.redhat.com'
    : 'https://issues.stage.redhat.com';
  const token = process.env.IS_PROD ? process.env.JIRA_TOKEN : process.env.JIRA_STAGE_TOKEN;
  const proxy = !process.env.IS_PROD ? process.env.PROXY_URL : '';
  let proxyAgent;
  if (proxy) {
    proxyAgent = new HttpsProxyAgent(proxy);
  }
  const fetcher = (url, urlParams, method = 'GET', data) =>
    nodeFetch(`${baseUrl}${replacer(url, urlParams)}`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(proxy && { agent: proxyAgent }),
      method: method,
      ...(data ? { body: data } : {}),
    }).then(async data => {
      if (data.status === 200 || data.status === 201) {
        return await data.json();
      } else if (data.status === 204) {
        // No Content - successful update with no response body
        return { success: true };
      } else {
        console.log(data);
        console.log(data.statusText);
        return {};
      }
    });
  this.token = token;
  this.baseUrl = baseUrl;
  this.fetcher = fetcher;
  this.proxyAgent = proxyAgent;
}

// Utility function to replace URL parameters
function replacer(url, params = {}) {
  let result = url;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

JiraBot.prototype.search = async function (query, type = 'jql') {
  const baseSearchParams = {};

  if (type === 'filter') {
    // For filter search, use the filter parameter
    baseSearchParams.filter = query;
  } else {
    // For JQL search, use the jql parameter
    baseSearchParams.jql = query;
  }

  // Add additional useful parameters
  baseSearchParams.fields = 'key,summary,status,priority,issuetype,created,updated';

  console.log(`\nSearching JIRA with ${type}: ${query}`);
  console.log('🔄 Fetching all results (this may take a moment for large result sets)...');

  let allIssues = [];
  let startAt = 0;
  const maxResults = 100; // Use larger batch size for efficiency
  let total = 0;
  let isFirstRequest = true;

  try {
    while (true) {
      // Prepare search parameters for this batch
      const searchParams = {
        ...baseSearchParams,
        maxResults,
        startAt,
      };

      const queryString = new URLSearchParams(searchParams).toString();
      const searchUrl = `${SEARCH}?${queryString}`;

      if (isFirstRequest) {
        console.log(`Initial request URL: ${this.baseUrl}${searchUrl}`);
        isFirstRequest = false;
      }

      // Fetch this batch
      const result = await this.fetcher(searchUrl);

      if (!result || !result.issues) {
        console.log('❌ No results returned or error occurred');
        break;
      }

      // Add issues from this batch to our collection
      allIssues = allIssues.concat(result.issues);
      total = result.total;

      console.log(`📥 Retrieved ${allIssues.length} of ${total} issues...`);

      // Check if we've got all issues
      if (allIssues.length >= total || result.issues.length < maxResults) {
        break;
      }

      // Move to next batch
      startAt += maxResults;
    }

    console.log(`✅ Retrieved all ${allIssues.length} issues`);

    // Return the combined result in the same format as the original API
    return {
      issues: allIssues,
      total: total,
      startAt: 0,
      maxResults: allIssues.length,
    };
  } catch (error) {
    console.error('❌ Error during search:', error.message);
    throw error;
  }
};

/**
 * Update work type custom field for JIRA issues
 * @param {Array} issues - Array of issues with workType classification
 * @returns {Array} Results of update operations
 */
JiraBot.prototype.updateWorkType = async function (issues) {
  const results = [];

  for (const issue of issues) {
    if (!issue.workType || !issue.workType.category) {
      console.log(`⚠️ Skipping ${issue.key} - no work type classification`);
      results.push({ issueKey: issue.key, status: 'skipped', reason: 'No work type' });
      continue;
    }

    // Map Gemini's work type value to JIRA ID
    const workType = WORK_TYPES.find(wt => wt.value === issue.workType.category);

    if (!workType) {
      console.log(`⚠️ Skipping ${issue.key} - unknown work type: ${issue.workType.category}`);
      results.push({
        issueKey: issue.key,
        status: 'skipped',
        reason: `Unknown work type: ${issue.workType.category}`,
      });
      continue;
    }

    try {
      console.log(`🔄 Updating ${issue.key} with work type: ${workType.name} (ID: ${workType.id})`);

      const updateUrl = `${UPDATE_ISSUE}${issue.key}`;
      const updateData = {
        fields: {
          [WORK_TYPE_CUSTOM_FIELD]: {
            id: workType.id,
          },
        },
      };

      const response = await this.fetcher(updateUrl, {}, 'PUT', JSON.stringify(updateData));

      if (response && response.success) {
        // JIRA returns 204 No Content for successful updates
        console.log(`✅ Successfully updated ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'success',
          workType: workType.name,
          confidence: issue.workType.confidence,
        });
      } else {
        console.log(`❌ Failed to update ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'failed',
          reason: 'Update request failed',
        });
      }
    } catch (error) {
      console.error(`❌ Error updating ${issue.key}:`, error.message);
      results.push({
        issueKey: issue.key,
        status: 'error',
        reason: error.message,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`\n📊 Update Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️ Skipped: ${skipped}`);
  console.log(`   📋 Total: ${results.length}`);

  return results;
};

/**
 * Update JIRA issues with AI-suggested edits
 * @param {Array} issues - Array of issues with aiEdit data
 * @returns {Array} Results of update operations
 */
JiraBot.prototype.updateEditedIssues = async function (issues) {
  const results = [];

  for (const issue of issues) {
    if (!issue.aiEdit || !issue.aiEdit.modified) {
      console.log(`⚠️ Skipping ${issue.key} - no AI edits to apply`);
      results.push({ issueKey: issue.key, status: 'skipped', reason: 'No AI edits' });
      continue;
    }

    try {
      console.log(`🔄 Applying AI edits to ${issue.key}...`);

      // Build update data from modified fields (excluding the aiEdit metadata)
      const updateData = { fields: {} };

      // Apply changes to core fields
      if (issue.fields.summary !== issue.originalFields?.summary) {
        updateData.fields.summary = issue.fields.summary;
      }
      if (issue.fields.description !== issue.originalFields?.description) {
        updateData.fields.description = issue.fields.description;
      }

      // Skip if no actual field changes to apply
      if (Object.keys(updateData.fields).length === 0) {
        console.log(`⚠️ Skipping ${issue.key} - no field changes detected`);
        results.push({ issueKey: issue.key, status: 'skipped', reason: 'No field changes' });
        continue;
      }

      const updateUrl = `${UPDATE_ISSUE}${issue.key}`;
      const response = await this.fetcher(updateUrl, {}, 'PUT', JSON.stringify(updateData));

      if (response && response.success) {
        console.log(`✅ Successfully updated ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'success',
          changes: issue.aiEdit.changes,
          confidence: issue.aiEdit.confidence,
        });
      } else {
        console.log(`❌ Failed to update ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'failed',
          reason: 'Update request failed',
        });
      }
    } catch (error) {
      console.error(`❌ Error updating ${issue.key}:`, error.message);
      results.push({
        issueKey: issue.key,
        status: 'error',
        reason: error.message,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`\n📊 Edit Update Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️ Skipped: ${skipped}`);
  console.log(`   📋 Total: ${results.length}`);

  return results;
};

/**
 * Update story points for JIRA issues
 * @param {Array} issues - Array of issues with storyPointEstimate data
 * @returns {Array} Results of update operations
 */
JiraBot.prototype.updateStoryPoints = async function (issues) {
  const results = [];

  for (const issue of issues) {
    if (!issue.storyPointEstimate || !issue.storyPointEstimate.points) {
      console.log(`⚠️ Skipping ${issue.key} - no story point estimate`);
      results.push({ issueKey: issue.key, status: 'skipped', reason: 'No story points' });
      continue;
    }

    try {
      const points = issue.storyPointEstimate.points;
      console.log(`🔄 Updating ${issue.key} with ${points} story points...`);

      const updateUrl = `${UPDATE_ISSUE}${issue.key}`;
      const updateData = {
        fields: {
          [STORY_POINTS_FIELD]: points,
        },
      };

      const response = await this.fetcher(updateUrl, {}, 'PUT', JSON.stringify(updateData));

      if (response && response.success) {
        console.log(`✅ Successfully updated ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'success',
          storyPoints: points,
          confidence: issue.storyPointEstimate.confidence,
        });
      } else {
        console.log(`❌ Failed to update ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'failed',
          reason: 'Update request failed',
        });
      }
    } catch (error) {
      console.error(`❌ Error updating ${issue.key}:`, error.message);
      results.push({
        issueKey: issue.key,
        status: 'error',
        reason: error.message,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`\n📊 Story Points Update Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️ Skipped: ${skipped}`);
  console.log(`   📋 Total: ${results.length}`);

  return results;
};

/**
 * Update workflow transitions for JIRA issues
 * @param {Array} issues - Array of issues with workflowRecommendation data
 * @returns {Array} Results of update operations
 */
JiraBot.prototype.updateWorkflowTransitions = async function (issues) {
  const results = [];

  for (const issue of issues) {
    if (!issue.workflowRecommendation || !issue.workflowRecommendation.recommendedTransition) {
      console.log(`⚠️ Skipping ${issue.key} - no workflow recommendation`);
      results.push({
        issueKey: issue.key,
        status: 'skipped',
        reason: 'No workflow recommendation',
      });
      continue;
    }

    try {
      const recommendedTransition = issue.workflowRecommendation.recommendedTransition;
      console.log(`🔄 Getting available transitions for ${issue.key}...`);

      // First, get available transitions
      const transitionsUrl = TRANSITION_ISSUE.replace('{key}', issue.key);
      const transitionsResponse = await this.fetcher(transitionsUrl);

      if (!transitionsResponse || !transitionsResponse.transitions) {
        console.log(`❌ Failed to get transitions for ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'failed',
          reason: 'Could not fetch available transitions',
        });
        continue;
      }

      // Find matching transition by name
      const transition = transitionsResponse.transitions.find(
        t =>
          t.name.toLowerCase() === recommendedTransition.toLowerCase() ||
          t.to.name.toLowerCase() === recommendedTransition.toLowerCase()
      );

      if (!transition) {
        console.log(
          `⚠️ Skipping ${issue.key} - transition "${recommendedTransition}" not available`
        );
        const availableTransitions = transitionsResponse.transitions.map(t => t.name).join(', ');
        results.push({
          issueKey: issue.key,
          status: 'skipped',
          reason: `Transition not available. Available: ${availableTransitions}`,
        });
        continue;
      }

      console.log(`🔄 Transitioning ${issue.key} to "${transition.to.name}"...`);

      // Execute the transition
      const transitionData = {
        transition: {
          id: transition.id,
        },
      };

      const response = await this.fetcher(
        transitionsUrl,
        {},
        'POST',
        JSON.stringify(transitionData)
      );

      if (response && response.success) {
        console.log(`✅ Successfully transitioned ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'success',
          transition: transition.to.name,
          confidence: issue.workflowRecommendation.confidence,
        });
      } else {
        console.log(`❌ Failed to transition ${issue.key}`);
        results.push({
          issueKey: issue.key,
          status: 'failed',
          reason: 'Transition request failed',
        });
      }
    } catch (error) {
      console.error(`❌ Error transitioning ${issue.key}:`, error.message);
      results.push({
        issueKey: issue.key,
        status: 'error',
        reason: error.message,
      });
    }
  }

  // Summary
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed' || r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`\n📊 Workflow Transition Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️ Skipped: ${skipped}`);
  console.log(`   📋 Total: ${results.length}`);

  return results;
};
