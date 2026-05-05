# Notion Documentation Sync Guide

This guide explains how to transport the LabManager technical documentation into Notion using the provided automated script.

## Prerequisites

1. **Notion Integration**:
   - Go to [Notion Integrations](https://www.notion.so/my-integrations).
   - Create a new "Internal Integration".
   - Copy the **Internal Integration Token**.

2. **Parent Page**:
   - Create a page in Notion where you want the documentation to live.
   - Click the `...` menu (top right) -> **Add connections** -> Select your integration.
   - Copy the **Page ID** from the URL (the 32-character string at the end of the URL before any `?`).

## Setup

1. Install required dependencies:
   ```bash
   pnpm add @notionhq/client glob front-matter
   ```

2. Set your environment variables:
   - **Windows (PowerShell)**:
     ```powershell
     $env:NOTION_TOKEN="your_token_here"
     $env:NOTION_PARENT_PAGE_ID="your_page_id_here"
     ```
   - **Linux/Mac**:
     ```bash
     export NOTION_TOKEN="your_token_here"
     export NOTION_PARENT_PAGE_ID="your_page_id_here"
     ```

## Execution

Run the sync script from the root directory:
```bash
node scripts/sync-to-notion.js
```

## How it Works
- **Automatic Hierarchy**: The script recursively scans `documentation/docs-site/docs` and recreates the folder structure in Notion. Each folder becomes a parent page, and each `.md` file becomes a sub-page.
- **Smart Formatting**: It extracts titles from Markdown front-matter and converts headers, lists, and paragraphs into native Notion blocks.
- **Navigation**: This mirrors the navigation structure of your Docusaurus sidebar, making it easy to browse the technical manual directly in Notion.

> [!TIP]
> For more advanced formatting (tables, images, code blocks), consider replacing the `mdToBlocks` function in the script with a robust library like **[Martian](https://github.com/instantish/martian)**.
