# Security Remediation: Cloudflare Tunnel Credentials

This document provides instructions for completing the remediation of the exposed Cloudflare Tunnel credentials and ensuring your production environment remains secure and functional.

## 1. Rotate Compromised Secrets (Mandatory)

Even though the files have been removed from the repository, the secrets are already compromised. You **MUST** rotate them in the Cloudflare Dashboard.

1. Log in to the **Cloudflare Dashboard**.
2. Go to **Zero Trust** -> **Networks** -> **Tunnels**.
3. Select your tunnel (`labmanager-tunnel`).
4. If you were using a "Locally Managed" tunnel:
    * Delete the old tunnel and create a new one, OR
    * Rotate the `TunnelSecret`.
5. **Recommended**: Switch to a **"Remotely Managed"** tunnel. This allows you to manage all ingress rules in the Cloudflare Dashboard and only requires a `TUNNEL_TOKEN` environment variable on your server.


## 2. Purge Git History (Mandatory)

The secrets are still visible in your GitHub commit history. You need to purge them.

### Option A: Using `git-filter-repo` (Recommended)

Since you don't have it installed, here is how to get it and use it:

1. **Install Python** (if not already installed).
2. Install `git-filter-repo` via pip:

    ```bash
    pip install git-filter-repo
    ```

3. **Backup your repository** before proceeding.
4. Run the following commands to purge the sensitive files:

    ```bash
    git filter-repo --path cloudflared/10fab1a5-dbe6-4dbb-8d72-da40e7b3d386.json --invert-paths
    git filter-repo --path cloudflared/cert.pem --invert-paths
    ```

5. Force push to GitHub:

    ```bash
    git push origin main --force
    ```

### Option B: Using BFG Repo-Cleaner

If you prefer a Java-based tool:

1. Download [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/).
2. Run:

    ```bash
    java -jar bfg.jar --delete-files 10fab1a5-dbe6-4dbb-8d72-da40e7b3d386.json
    java -jar bfg.jar --delete-files cert.pem
    ```

3. Run `git reflog expire --expire=now --all && git gc --prune=now --aggressive`.
4. Force push: `git push origin main --force`.

## 3. CI/CD and Production Configuration

We have switched to a **Remotely Managed Tunnel** using the `TUNNEL_TOKEN` environment variable. This is the most secure and clean way to manage your tunnel in CI/CD.

### How it works now
1. **GitHub Secrets**: Ensure you have a secret named `CLOUDFLARE_TUNNEL_TOKEN` in your GitHub Repository settings. This should contain the token for your new/rotated tunnel.
2. **CI/CD Pipeline**: The `deploy.yml` workflow automatically injects this token into the `.env.production` file on your EC2 server as `TUNNEL_TOKEN`.
3. **Docker Compose**: The `cloudflared` service in `docker-compose.prod.yml` now uses `env_file: .env.production` to load the token.
4. **No more files**: The `cloudflared/` directory has been deleted entirely. All ingress rules should now be managed in the Cloudflare Zero Trust Dashboard.


## 4. Final Verification

After performing the steps above:

1. Check GitHub to ensure the `cloudflared/` secrets are gone from both the file list and the history.
2. Verify the `cloudflared` container logs on your EC2 server:

    ```bash
    docker logs cloudflared
    ```

    It should show "Connected" or "Healthy".
