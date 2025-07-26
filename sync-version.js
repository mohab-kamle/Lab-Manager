const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

let env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
env = env.replace(/VITE_APP_VERSION=.*/g, `VITE_APP_VERSION=${version}`);
if (!env.includes('VITE_APP_VERSION=')) env += `\nVITE_APP_VERSION=${version}`;

fs.writeFileSync('.env', env);
console.log(`✅ Synced version ${version} to .env`);