import dotenv from "dotenv";
import { JiraBot } from './jira.js';
dotenv.config();

const jira = new JiraBot();

console.log('Hello world', jira);
