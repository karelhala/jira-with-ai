import nodeFetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent';

const LIST_PROJECTS = '/rest/api/2/project';
const ISSUE_TYPES = `/rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes`;
const FIELDS = '/rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}';
const SUGGESTIONS = '/rest/api/2/jql/autocompletedata/suggestions';
const SEARCH = '/rest/api/2/search'
const ISSUE = '/rest/api/2/issue/';

export function JiraBot() {
  const baseUrl = process.env.IS_PROD ? 'https://issues.redhat.com' : 'https://issues.stage.redhat.com';
  const token = process.env.IS_PROD ? process.env.JIRA_TOKEN : process.env.JIRA_STAGE_TOKEN;
  const proxy = !process.env.IS_PROD ? process.env.PROXY_URL : ''
  let proxyAgent;
  if (proxy) {
    proxyAgent = new HttpsProxyAgent(proxy);
  }
  const fetcher = (url, urlParams, method = 'GET', data) => nodeFetch(`${baseUrl}${replacer(url, urlParams)}`, {
    "credentials": "include",
    "headers": {
        'Accept': 'application/json',
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    },
    ...proxy && {agent: proxyAgent},
    "method": method,
    ...data ? {body: data} : {}
  }).then(async (data) => {
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
};

