// Helper script to convert Cairo font to base64 for pdfMake
// Run this with Node.js to generate the base64 font data

const fs = require('fs');
const path = require('path');

// Read the Cairo font file
const fontPath = path.join(__dirname, 'public', 'fonts', 'Cairo.ttf');
const fontBuffer = fs.readFileSync(fontPath);

// Convert to base64
const base64Font = fontBuffer.toString('base64');

// Create the vfs_fonts.js content
const vfsContent = `// pdfMake Virtual File System fonts
// Cairo font base64 data

export const vfs = {
  'Cairo-Regular.ttf': '${base64Font}',
  'Cairo-Bold.ttf': '${base64Font}', // Using same font for bold for now
};

export default vfs;
`;

// Write to file
fs.writeFileSync(path.join(__dirname, 'src', 'vfs_fonts.js'), vfsContent);

console.log('Font converted successfully!');
console.log('Base64 length:', base64Font.length);
console.log('File saved to: src/vfs_fonts.js'); 