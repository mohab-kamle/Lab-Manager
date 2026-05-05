const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

const envFiles = [
  '../.env.development',
  '../.env.production'
];

envFiles.forEach(file => {
  const filePath = path.resolve(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.match(/VITE_APP_VERSION=.*/)) {
      content = content.replace(/VITE_APP_VERSION=.*/g, `VITE_APP_VERSION=${version}`);
    } else {
      content += `\nVITE_APP_VERSION=${version}`;
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Synced version ${version} to ${file}`);
  }
});