/**
 * LabManager Documentation Sync to Notion
 * 
 * This script recursively reads Markdown files from the docusaurus docs folder
 * and uploads/updates them in Notion while maintaining the hierarchy.
 * 
 * REQUIRED PACKAGES:
 * pnpm add @notionhq/client glob front-matter @tryfabric/martian
 * 
 * CONFIGURATION:
 * 1. Create a Notion Integration at https://www.notion.so/my-integrations
 * 2. Get your Secret Token.
 * 3. Create a parent page in Notion and get its ID from the URL.
 * 4. Add the Secret Token and Parent Page ID to your environment variables or a .env file.
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const fm = require('front-matter');
const { markdownToBlocks } = require('@tryfabric/martian');

// Environment Variables
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error('Error: NOTION_TOKEN and NOTION_PARENT_PAGE_ID must be set in environment variables.');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Define the root directories you want to sync into Notion
const SYNC_DIRS = [
  path.join(__dirname, '../documentation/docs-site/docs'),
  path.join(__dirname, '../documentation/uml')
];

const directoryMap = new Map();

// Helper to determine icon based on title/folder name to make it look beautiful
function getIconForTitle(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('technical')) return '🛠️';
  if (lowerTitle.includes('user guide') || lowerTitle.includes('user')) return '📘';
  if (lowerTitle.includes('backend')) return '⚙️';
  if (lowerTitle.includes('frontend')) return '💻';
  if (lowerTitle.includes('security')) return '🔒';
  if (lowerTitle.includes('deployment')) return '🚀';
  if (lowerTitle.includes('role')) return '👥';
  if (lowerTitle.includes('database')) return '🗄️';
  if (lowerTitle.includes('admin')) return '👑';
  if (lowerTitle.includes('chemist')) return '🧪';
  if (lowerTitle.includes('receptionist')) return '📞';
  if (lowerTitle.includes('uml') || lowerTitle.includes('use case') || lowerTitle.includes('diagram')) return '📈';
  if (lowerTitle.includes('overview') || lowerTitle.includes('index')) return '📖';
  return '📄'; // default page
}

function getIconForFolder(folderName) {
  return getIconForTitle(folderName) === '📄' ? '📁' : getIconForTitle(folderName);
}

// Helper to assign a beautiful cover image based on the content topic
function getCoverForTitle(title) {
  const lowerTitle = title.toLowerCase();
  let url = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1000&q=80'; // Default Lab Microscope

  if (lowerTitle.includes('technical')) url = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('security')) url = 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('frontend') || lowerTitle.includes('client')) url = 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('backend') || lowerTitle.includes('server')) url = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('deployment') || lowerTitle.includes('ci/cd')) url = 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('role') || lowerTitle.includes('user')) url = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('database')) url = 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1000&q=80';
  else if (lowerTitle.includes('uml') || lowerTitle.includes('diagram') || lowerTitle.includes('use case')) url = 'https://images.unsplash.com/photo-1542621334-a254cf47733d?auto=format&fit=crop&w=1000&q=80'; // Graphs and Data

  return {
    type: 'external',
    external: { url }
  };
}

// Recursive function to strip invalid relative URLs which the Notion API rejects
function sanitizeUrlsInObject(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(sanitizeUrlsInObject);
  } else if (obj !== null && typeof obj === 'object') {
    if (obj.type === 'text' && obj.text && obj.text.link && obj.text.link.url) {
      const url = obj.text.link.url;
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
        delete obj.text.link;
      }
    }
    for (const key in obj) {
      sanitizeUrlsInObject(obj[key]);
    }
  }
}

// Determines the relevant root directory for a given path
function getRootForPath(dirPath) {
  const normalizedDirPath = path.resolve(dirPath).toLowerCase();
  for (const root of SYNC_DIRS) {
    if (normalizedDirPath.startsWith(path.resolve(root).toLowerCase())) {
      return path.resolve(root).toLowerCase();
    }
  }
  return null;
}

// Function to add beautiful coloring, dividers, callouts, and Table of Contents
function postProcessBlocks(blocks) {
  const newBlocks = [];
  
  // 1. Auto-Inject Table of Contents
  newBlocks.push({
    object: 'block',
    type: 'table_of_contents',
    table_of_contents: { color: 'default' }
  });

  for (let block of blocks) {
    // Add colors to headings to make them pop
    if (block.type === 'heading_1' && block.heading_1) {
      block.heading_1.color = 'blue_background';
    } else if (block.type === 'heading_2' && block.heading_2) {
      block.heading_2.color = 'blue';
    } else if (block.type === 'heading_3' && block.heading_3) {
      block.heading_3.color = 'gray';
    } 
    // 2. Upgrade quotes to native Callout blocks with icons
    else if (block.type === 'quote' && block.quote) {
      block.type = 'callout';
      block.callout = {
        rich_text: block.quote.rich_text,
        icon: { type: 'emoji', emoji: '💡' },
        color: 'gray_background'
      };
      delete block.quote;
    }
    
    // Deeply sanitize URLs to prevent validation_error
    sanitizeUrlsInObject(block);
    
    newBlocks.push(block);

    // 3. Inject structural Dividers after H1 and H2
    if (block.type === 'heading_1' || block.type === 'heading_2') {
      newBlocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });
    }
  }

  return newBlocks;
}

/**
 * Ensures a Notion page exists for a given directory to act as a parent
 */
async function getOrCreateFolderPage(dirPath) {
  const normalizedDirPath = path.resolve(dirPath).toLowerCase();
  
  const root = getRootForPath(dirPath);
  if (!root) {
    throw new Error(`Path escaped all defined SYNC_DIRS: ${dirPath}`);
  }

  // Docs root maps directly to the parent page
  const docsRoot = path.resolve(path.join(__dirname, '../documentation/docs-site/docs')).toLowerCase();
  if (normalizedDirPath === docsRoot) return PARENT_PAGE_ID;
  
  if (directoryMap.has(normalizedDirPath)) return directoryMap.get(normalizedDirPath);

  let parentId;
  let folderName;

  // If this is the UML root folder, its parent is the main PARENT_PAGE_ID
  const umlRoot = path.resolve(path.join(__dirname, '../documentation/uml')).toLowerCase();
  if (normalizedDirPath === umlRoot) {
    parentId = PARENT_PAGE_ID;
    folderName = "UML Diagrams";
  } else {
    // Normal nested folder
    if (dirPath === path.dirname(dirPath)) {
      throw new Error(`Path escaped root check: ${dirPath}`);
    }
    const parentDir = path.dirname(dirPath);
    parentId = await getOrCreateFolderPage(parentDir);
    folderName = path.basename(dirPath).replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  const icon = getIconForFolder(folderName);
  const cover = getCoverForTitle(folderName);

  console.log(`Creating Folder Page: ${icon} ${folderName}...`);

  const response = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: 'emoji', emoji: icon },
    cover: cover,
    properties: {
      title: [{ text: { content: folderName } }],
    }
  });

  directoryMap.set(normalizedDirPath, response.id);
  return response.id;
}

async function syncFile(filePath) {
  const dirPath = path.dirname(filePath);
  const isIndex = path.basename(filePath).toLowerCase() === 'index.md';
  const parentId = await getOrCreateFolderPage(dirPath);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const { attributes, body } = fm(content);
  const title = attributes.title || path.basename(filePath, '.md').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Use @tryfabric/martian to convert markdown to fully compliant Notion Blocks
  let blocks = [];
  try {
     blocks = markdownToBlocks(body);
     blocks = postProcessBlocks(blocks); // Apply ToC, Callouts, Dividers, and syntax colors
  } catch (err) {
     console.error(`❌ Error parsing markdown for ${title}:`, err.message);
     return;
  }
  
  let targetPageId;
  const icon = getIconForTitle(title);
  const cover = getCoverForTitle(title);

  const root = getRootForPath(dirPath);

  // If this is an index file and NOT at the root of a sync dir, it represents the folder
  if (isIndex && root && path.resolve(dirPath).toLowerCase() !== root) {
    console.log(`Syncing Index File to Folder Page: ${icon} ${path.basename(dirPath)}...`);
    targetPageId = parentId;
    
    // Optionally update the folder page title, icon, and cover if the index.md has a specific title
    if (attributes.title) {
      try {
        await notion.pages.update({
          page_id: targetPageId,
          icon: { type: 'emoji', emoji: icon },
          cover: cover,
          properties: {
            title: [{ text: { content: attributes.title } }]
          }
        });
      } catch (error) {
        console.error(`❌ Error updating title for ${title}:`, error.message);
      }
    }
  } else {
    console.log(`Creating File Page: ${icon} ${title} in folder ${path.basename(dirPath)}...`);
    try {
      const response = await notion.pages.create({
        parent: { page_id: parentId },
        icon: { type: 'emoji', emoji: icon },
        cover: cover,
        properties: {
          title: [{ text: { content: title } }],
        }
      });
      targetPageId = response.id;
    } catch (error) {
      console.error(`❌ Error creating page ${title}:`, error.message);
      return;
    }
  }

  // Append blocks in chunks of 100 to avoid API limits
  try {
    for (let i = 0; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: targetPageId,
        children: chunk
      });
    }
    console.log(`✅ Success: ${title} (${blocks.length} blocks)`);
  } catch (error) {
    console.error(`❌ Error appending blocks for ${title}:`, error.message);
  }
}

async function run() {
  console.log('🚀 Starting Notion Sync...');
  let files = [];
  
  // Aggregate all files from the requested sync directories
  for (const dir of SYNC_DIRS) {
    files = files.concat(glob.sync(`${dir}/**/*.md`));
  }
  
  // Sort files by depth to ensure parent folders are created first.
  // Also process index.md files before other files in the same directory.
  const sortedFiles = files.sort((a, b) => {
    const depthA = a.split(path.sep).length;
    const depthB = b.split(path.sep).length;
    if (depthA !== depthB) return depthA - depthB;
    
    const isIndexA = path.basename(a).toLowerCase() === 'index.md';
    const isIndexB = path.basename(b).toLowerCase() === 'index.md';
    if (isIndexA && !isIndexB) return -1;
    if (!isIndexA && isIndexB) return 1;
    return 0;
  });

  for (const file of sortedFiles) {
    await syncFile(file);
  }
  console.log('🏁 Sync Complete!');
}

run();
