/**
 * LabManager Documentation Sync to Notion
 * 
 * This script recursively reads Markdown files from the docusaurus docs folder
 * and uploads/updates them in Notion while maintaining the hierarchy.
 * 
 * REQUIRED PACKAGES:
 * pnpm add @notionhq/client glob front-matter
 * 
 * CONFIGURATION:
 * 1. Create a Notion Integration at https://www.notion.so/my-integrations
 * 2. Get your Secret Token.
 * 3. Create a parent page in Notion and get its ID from the URL.
 * 4. Add the Secret Token and Parent Page ID to your .env or export them.
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const fm = require('front-matter');

// Environment Variables
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error('Error: NOTION_TOKEN and NOTION_PARENT_PAGE_ID must be set in environment variables.');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

const DOCS_ROOT = path.join(__dirname, '../documentation/docs-site/docs');

// Cache to store created page IDs to maintain hierarchy
const directoryMap = new Map();

/**
 * Simple Markdown to Notion Block converter
 */
function mdToBlocks(content) {
  // Remove front-matter if present
  const body = content.replace(/^---[\s\S]*?---/, '').trim();
  const lines = body.split('\n');
  const blocks = [];

  lines.forEach(line => {
    if (!line.trim()) return;

    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: [{ type: 'text', text: { content: line.replace('# ', '').trim() } }] }
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: line.replace('## ', '').trim() } }] }
      });
    } else if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.replace('- ', '').trim() } }] }
      });
    } else {
      // Basic paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: line.trim() } }] }
      });
    }
  });

  return blocks;
}

/**
 * Ensures a Notion page exists for a given directory to act as a parent
 */
async function getOrCreateFolderPage(dirPath) {
  if (dirPath === DOCS_ROOT) return PARENT_PAGE_ID;
  if (directoryMap.has(dirPath)) return directoryMap.get(dirPath);

  const parentDir = path.dirname(dirPath);
  const parentId = await getOrCreateFolderPage(parentDir);
  const folderName = path.basename(dirPath).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  console.log(`Creating Folder Page: ${folderName}...`);

  const response = await notion.pages.create({
    parent: { page_id: parentId },
    properties: {
      title: [{ text: { content: folderName } }],
    }
  });

  directoryMap.set(dirPath, response.id);
  return response.id;
}

async function syncFile(filePath) {
  const dirPath = path.dirname(filePath);
  const parentId = await getOrCreateFolderPage(dirPath);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const { attributes, body } = fm(content);
  const title = attributes.title || path.basename(filePath, '.md').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  console.log(`Syncing File: ${title} in folder ${path.basename(dirPath)}...`);

  try {
    const response = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: [{ text: { content: title } }],
      },
      children: mdToBlocks(body).slice(0, 100)
    });
    console.log(`✅ Success: ${title}`);
    return response.id;
  } catch (error) {
    console.error(`❌ Error syncing ${title}:`, error.message);
  }
}

async function run() {
  console.log('🚀 Starting Notion Sync...');
  const files = glob.sync(`${DOCS_ROOT}/**/*.md`);
  
  // Sort files by depth to ensure parent folders are created first
  const sortedFiles = files.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);

  for (const file of sortedFiles) {
    await syncFile(file);
  }
  console.log('🏁 Sync Complete!');
}

run();
