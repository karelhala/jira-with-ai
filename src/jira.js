import nodeFetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const SEARCH = '/rest/api/2/search';

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
  this.wtType = '12320040';
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

// JiraBot.prototype.updateWorkType = async function (issues) {};
