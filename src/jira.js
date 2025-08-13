import nodeFetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent';

export default () => {
  const JIRA_URL = process.env.IS_PROD ? 'https://issues.redhat.com' : 'https://issues.stage.redhat.com';
  const token = process.env.IS_PROD ? process.env.JIRA_TOKEN : process.env.JIRA_STAGE_TOKEN;
  console.log('Whoa!', JIRA_URL);
}
