# Professional CI/CD Pipeline Implementation Plan

This document outlines the steps to implement a professional CI/CD pipeline using `release-it`, `conventional-changelog`, Docker Compose, and GitHub Actions. This setup is designed for a single-developer environment, providing automation for versioning, changelog generation, and deployment.

## 1. Project Structure Overview

Your project structure is assumed to be similar to this, with `client` and `server` directories, and a root for shared configurations and scripts:

```
LabManager - Full stack/
├── .github/
│   └── workflows/
│       └── release.yml  (New: GitHub Actions workflow for CI/CD)
├── client/
│   ├── package.json
│   ├── Dockerfile
│   └── ... (frontend code)
├── server/
│   ├── package.json
│   ├── Dockerfile
│   └── ... (backend code)
├── .release-it.json     (New: release-it configuration)
├── .changelog-config.js (New: Optional, for custom changelog)
├── package.json         (Root package.json, if exists, otherwise client/package.json)
├── CI_CD_PLAN.md        (This document)
├── sync-version.js      (To be removed)
└── tag-version.js       (To be removed)
```

## 2. Install Development Dependencies

First, install `release-it` and its conventional changelog plugin. You should install these in the `package.json` that will manage your releases. If you have a root `package.json` for the entire monorepo, use that. Otherwise, install them in `client/package.json`.

Navigate to your project root (or `client` directory if no root `package.json`):

```bash
npm install --save-dev release-it @release-it/conventional-changelog
# or yarn add --dev release-it @release-it/conventional-changelog
```

## 3. Configure `release-it`

Create a `.release-it.json` file in the root of your project (or in the `client` directory if that's where you installed `release-it`). This configuration defines how `release-it` will manage versions, Git tags, and changelogs.

**File: `.release-it.json`**

```json
{
  "git": {
    "tagName": "v${version}",
    "commitMessage": "Release ${version}",
    "requireBranch": "main",
    "push": true,
    "commit": true,
    "tag": true
  },
  "npm": {
    "publish": false
  },
  "github": {
    "release": true,
    "tokenRef": "GITHUB_TOKEN"
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "angular",
      "infile": "CHANGELOG.md"
    }
  },
  "hooks": {
    "before:init": ["echo \"Starting release process...\""],
    "after:release": ["echo \"Successfully released ${version}\""]
  },
  "ci": false,
  "verbose": true
}
```

**Explanation of `.release-it.json`:**

*   `git.tagName`: Defines the format for Git tags (e.g., `v1.0.0`).
*   `git.commitMessage`: The commit message for the release commit.
*   `git.requireBranch`: Ensures releases only happen from the `main` branch (you can adjust this for `alpha`/`beta` branches later).
*   `git.push`, `git.commit`, `git.tag`: Enable pushing commits and tags to the remote repository.
*   `npm.publish`: Set to `false` as you are not publishing to npm.
*   `github.release`: Enables creating a GitHub Release for each tag.
*   `github.tokenRef`: Specifies the environment variable holding the GitHub Token for authentication.
*   `plugins.@release-it/conventional-changelog`: Integrates the changelog plugin using the `angular` preset, generating `CHANGELOG.md`.
*   `hooks`: Allows running custom commands at different stages of the release process.
*   `ci`: Set to `false` for local testing, but will be overridden in GitHub Actions.

### Optional: Custom Changelog Configuration

If you need more control over the changelog, create a `.changelog-config.js` file:

**File: `.changelog-config.js`**

```javascript
module.exports = {
  writerOpts: {
    commitsSort: ['subject', 'scope'],
  },
  // Further customization options can be added here
};
```

## 4. Add Release Script to `package.json`

Add a `release` script to the `scripts` section of your root `package.json` (or `client/package.json`).

**File: `package.json` (root or client)**

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "Your application description",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "release": "release-it",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "devDependencies": {
    "release-it": "^17.0.0",
    "@release-it/conventional-changelog": "^8.0.0"
  }
}
```

## 5. Create GitHub Actions Workflow (`release.yml`)

Create a new file `.github/workflows/release.yml`. This workflow will automate the release and deployment process.

**File: `.github/workflows/release.yml`**

```yaml
name: Release and Deploy

on: [push]

jobs:
  release:
    runs-on: self-hosted
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/beta' || github.ref == 'refs/heads/alpha'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for release-it to determine version

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies (root)
        run: npm install # Or pnpm install if you use pnpm

      - name: Install client dependencies
        run: npm install --prefix client # Or pnpm install --prefix client

      - name: Install server dependencies
        run: npm install --prefix server # Or pnpm install --prefix server

      - name: Run release-it
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx release-it --ci

      - name: Create .env.production for frontend (UTF-8)
        shell: powershell
        run: |
          [System.IO.File]::WriteAllText("client/.env.production", "VITE_API_URL=${{ secrets.VITE_API_URL }}", [System.Text.Encoding]::UTF8)

      - name: Create empty .env for frontend (UTF-8)
        shell: powershell
        run: |
          [System.IO.File]::WriteAllText("client/.env", "", [System.Text.Encoding]::UTF8)

      - name: Copy .env.production to server/.env
        shell: powershell
        run: |
          Copy-Item ".env.production" "server/.env" -Force

      - name: Build and restart Docker containers
        shell: powershell
        run: |
          docker compose down --remove-orphans
          docker compose build --no-cache
          docker compose up -d

      - name: Clean up old versioning scripts
        run: |
          rm -f sync-version.js
          rm -f tag-version.js
          # Remove prebuild/postbuild scripts from client/package.json if they exist
          # This step might require a separate script or manual intervention if not handled by release-it
```

**Explanation of `release.yml`:**

*   `on: [push]`: Triggers the workflow on every push to any branch.
*   `runs-on: self-hosted`: Specifies that the job will run on your self-hosted runner.
*   `if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/beta' || github.ref == 'refs/heads/alpha'`: This condition ensures the release process only runs on your designated release branches.
*   `actions/checkout@v4` with `fetch-depth: 0`: Essential for `release-it` to correctly determine the version history.
*   `actions/setup-node@v4`: Sets up the Node.js environment.
*   `npm install --prefix client` and `npm install --prefix server`: Installs dependencies for both client and server applications.
*   `npx release-it --ci`: Executes `release-it` in CI mode, which prevents interactive prompts and uses the `GITHUB_TOKEN` for authentication.
*   **Environment Variable Steps:** These steps are directly taken from your existing <mcfile name="deploy.yml" path=".github/workflows/deploy.yml"></mcfile> to ensure `VITE_API_URL` and other `.env` files are correctly set up for the build.
*   **Docker Build and Restart:** These steps are also from your existing <mcfile name="deploy.yml" path=".github/workflows/deploy.yml"></mcfile>, ensuring your Docker containers are rebuilt and restarted after a successful release.
*   **Clean up old versioning scripts:** This step removes the old `sync-version.js` and `tag-version.js` files. You will also need to manually remove the `prebuild` and `postbuild` scripts from your `client/package.json` after this new system is in place.

## 6. Adopt Conventional Commits

For `release-it` to automatically determine version bumps and generate changelogs, you must adopt Conventional Commits. This means your commit messages should follow a specific format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Examples:**

*   `feat: add user authentication` (for new features, triggers minor version bump)
*   `fix: resolve login bug` (for bug fixes, triggers patch version bump)
*   `BREAKING CHANGE: remove old API endpoint` (for breaking changes, triggers major version bump)
*   `docs: update README` (for documentation changes, no version bump)
*   `chore: update dependencies` (for routine tasks, no version bump)

## 7. GitHub Secrets Configuration

Ensure the following secrets are configured in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

*   `GITHUB_TOKEN`: This is usually automatically provided by GitHub Actions, but ensure it has the necessary permissions (Contents: Write, Releases: Write).
*   `VITE_API_URL`: The URL for your frontend API.

## 8. Self-Hosted Runner Setup

Your self-hosted runner must have:

*   Node.js (version 20 or compatible) installed.
*   Git installed and configured.
*   Docker and Docker Compose installed.
*   Permissions to execute Docker commands and manage files.

## 9. Recent CI/CD Pipeline Refinements

To ensure stable deployments in restricted network environments and consistent Docker builds, the following refinements have been applied to our CI/CD pipeline:

### 1. Git Authentication over HTTPS
Previously, deployments using SSH keys encountered timeouts on the runner due to restrictive network firewalls blocking port 22.
- **Fix**: The GitHub Actions runner and the Docker containers are now configured to use Git over HTTPS. We inject the `GITHUB_TOKEN` directly into the `git config` and `package.json` resolutions, completely bypassing SSH and enabling fast, reliable clone operations.

### 2. Docker Native Compilation (`pnpm`)
The `pnpm install` step occasionally failed during Docker builds when compiling native dependencies that require Git.
- **Fix**: The `Dockerfile`s have been updated to include `git` as a base system dependency (`apk add --no-cache git`).
- **Fix**: We now properly persist build configurations by passing `onlyBuiltDependencies` options directly via `pnpm-lock.yaml` and environment variables in the Dockerfile to override restrictive policies during CI builds, instead of using deprecated `approve-builds` CLI tools.

## 10. Testing the New CI/CD Pipeline

1.  **Local Test of `release-it`:**
    *   Make sure your `package.json` version is `1.0.0`.
    *   Make a commit following Conventional Commits (e.g., `feat: initial setup`).
    *   Run `npm run release -- --dry-run` (or `npx release-it --dry-run`) in your terminal. This will simulate a release without actually pushing changes.
    *   If the dry run looks good, try `npm run release` to perform a local release.

2.  **GitHub Actions Test:**
    *   Push a commit (following Conventional Commits) to your `main` (or `beta`/`alpha`) branch.
    *   Monitor the GitHub Actions workflow run in your repository.
    *   Verify that a new Git tag is created, a GitHub Release is published, and your Docker containers are rebuilt and redeployed on your self-hosted server.

## 10. Cleanup Old Versioning Scripts

Once the new CI/CD pipeline is fully functional and verified, you can remove the old versioning scripts and their associated `package.json` entries:

*   Delete `sync-version.js`.
*   Delete `tag-version.js`.
*   Remove the `prebuild` and `postbuild` scripts from `client/package.json`.

This comprehensive plan will guide you through setting up a robust CI/CD pipeline for your project.