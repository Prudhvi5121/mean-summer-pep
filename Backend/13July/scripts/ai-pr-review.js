#!/usr/bin/env node

'use strict';

const { execFileSync } = require('child_process');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');

const MAX_DIFF_CHARS = 12000;
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|pdf|zip|exe|mp3|mp4)$/i;

function logStep(message) {
  console.log(`[ai-pr-review] ${message}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getGitDiff(baseSha, headSha) {
  logStep(`Generating diff from ${baseSha} to ${headSha}`);
  const output = execFileSync('git', ['diff', baseSha, headSha], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return output.trim();
}

function splitDiffByFile(diffText) {
  if (!diffText) {
    return [];
  }

  return diffText
    .split(/^diff --git /gm)
    .filter(Boolean)
    .map((section) => {
      const match = section.match(/^a\/(.+?) b\//m);
      if (!match) {
        return null;
      }

      return {
        file: match[1],
        content: section
      };
    })
    .filter(Boolean);
}

function truncateIfNeeded(content) {
  if (content.length <= MAX_DIFF_CHARS) {
    return content;
  }

  return `${content.slice(0, MAX_DIFF_CHARS)}\n\n[truncated due to size limit]`;
}

async function callGrokReview(filePath, diffContent) {
  const prompt = [
    {
      role: 'system',
      content: [
        'You are a senior software engineer reviewing a pull request for a production codebase.',
        'Review only the changed code.',
        'Focus on bugs, security issues, performance problems, edge cases, and best practices.',
        'Be concise and actionable.',
        'If no significant issues are found, reply exactly: ✅ LGTM'
      ].join(' ')
    },
    {
      role: 'user',
      content: `Review the following git diff for ${filePath}:\n\n${diffContent}`
    }
  ];

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-3-latest',
        messages: prompt,
        max_tokens: 1024
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROK_API_KEY}`
        },
        timeout: 60000
      }
    );

    return response?.data?.choices?.[0]?.message?.content?.trim() || '⚠️ No review content returned.';
  } catch (error) {
    logStep(`Grok review failed for ${filePath}: ${error.message}`);
    return `⚠️ Review unavailable for ${filePath}: ${error.message}`;
  }
}

async function postReviewComment(octokit, owner, repo, prNumber, body) {
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
    logStep(`Posted review comment to PR #${prNumber}`);
  } catch (error) {
    logStep(`Failed to post review comment: ${error.message}`);
  }
}

async function main() {
  try {
    const githubToken = requireEnv('GITHUB_TOKEN');
    const grokApiKey = requireEnv('GROK_API_KEY');
    const prNumber = Number(requireEnv('PR_NUMBER'));
    const owner = requireEnv('OWNER');
    const repo = requireEnv('REPO');
    const baseSha = requireEnv('BASE_SHA');
    const headSha = requireEnv('HEAD_SHA');

    if (!grokApiKey) {
      throw new Error('GROK_API_KEY is required');
    }

    const octokit = new Octokit({ auth: githubToken });
    const diffText = getGitDiff(baseSha, headSha);

    if (!diffText) {
      logStep('No code changes detected. Skipping review.');
      return;
    }

    const fileDiffs = splitDiffByFile(diffText);
    if (fileDiffs.length === 0) {
      logStep('No file-level differences were found.');
      return;
    }

    const reviewSections = [];

    for (const entry of fileDiffs) {
      const filePath = entry.file;

      if (BINARY_EXTENSIONS.test(filePath)) {
        logStep(`Skipping binary file: ${filePath}`);
        continue;
      }

      const safeDiff = truncateIfNeeded(entry.content);
      const reviewText = await callGrokReview(filePath, safeDiff);
      reviewSections.push(`### ${filePath}\n\n${reviewText}`);
    }

    const finalReview = [
      '## AI Pull Request Review',
      '',
      reviewSections.join('\n\n'),
      '',
      '---',
      '',
      'Review completed automatically by the AI PR review workflow.'
    ].join('\n');

    await postReviewComment(octokit, owner, repo, prNumber, finalReview);
  } catch (error) {
    logStep(`Review workflow failed: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
