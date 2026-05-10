# LabManager Scripts

This directory contains utility scripts for LabManager automation.

## Notion Documentation Sync (`sync-to-notion.js`)

This script recursively reads the markdown files from `documentation/docs-site/docs` and uploads them directly to Notion, preserving the folder and file hierarchy. It handles code blocks, nested folders, index files, and correctly bypasses Notion's 100-block payload limitation.

### Prerequisites

Before you run the script, ensure you have the required dependencies:

```bash
pnpm add @notionhq/client glob front-matter
```

### Setup Instructions

1. **Create a Notion Integration**:
   - Go to [Notion My Integrations](https://www.notion.so/my-integrations).
   - Click **"New Integration"**, name it something like `LabManager Docs Sync`, and select your workspace.
   - Copy the **Internal Integration Secret Token**.

2. **Prepare a Parent Page in Notion**:
   - Open Notion and create an empty page (e.g., "LabManager Technical Docs").
   - **Important:** Click the three dots `...` in the top right corner of the page, click **Add Connections**, and search for your new integration (`LabManager Docs Sync`). Select it to give the script access to this page.
   - Get the **Page ID** from the URL. For example, if your URL is `https://www.notion.so/LabManager-Docs-abcdef1234567890abcdef1234567890`, the Page ID is `abcdef1234567890abcdef1234567890`.

3. **Configure Environment Variables**:
   You can either export these in your terminal or add them to an `.env` file that the script runs with.

   ```bash
   export NOTION_TOKEN="secret_your_integration_token_here"
   export NOTION_PARENT_PAGE_ID="your_parent_page_id_here"
   ```

### Running the Script

Once your environment variables are configured and the integration has access to the target page, run the script from the root of the project:

```bash
node scripts/sync-to-notion.js
```

The script will log its progress as it creates folders and appends blocks for each markdown file. If a file contains more than 100 blocks, it will safely chunk and append them sequentially.
