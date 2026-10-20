import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return '';
  }
};

let event = null;
if (process.env.GITHUB_EVENT_PATH) {
  try {
    event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  } catch {
    // Fall back to the checked out commit for local runs or incomplete events.
  }
}

const sha = process.env.GITHUB_SHA || tryGit('rev-parse', 'HEAD') || `local-${Date.now()}`;
const remoteUrl = tryGit('remote', 'get-url', 'origin');
const repository = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : (remoteUrl || 'https://github.com/nimmsel23/skills-dev')
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '');
const pushedCommits = Array.isArray(event?.commits)
  ? event.commits
      .filter((commit) => commit.id)
      .map((commit) => ({
        sha: commit.id,
        message: (commit.message || '').split('\n')[0],
      }))
  : [];
const commits = pushedCommits.length
  ? pushedCommits
  : [{ sha, message: tryGit('log', '-1', '--format=%s', sha) || 'Skills-Update' }];

await mkdir('public', { recursive: true });
await writeFile('public/release-info.json', `${JSON.stringify({ id: sha, repository, commits }, null, 2)}\n`);
