const fs = require('fs');
<<<<<<< HEAD
=======
const path = require('path');
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

<<<<<<< HEAD
let env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
env = env.replace(/VITE_APP_VERSION=.*/g, `VITE_APP_VERSION=${version}`);
if (!env.includes('VITE_APP_VERSION=')) env += `\nVITE_APP_VERSION=${version}`;

fs.writeFileSync('.env', env);
console.log(`✅ Synced version ${version} to .env`);
=======
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
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
