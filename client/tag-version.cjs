const { execSync } = require('child_process');
const pkg = require('./package.json');

const version = pkg.version;
const tag = `v${version}`;

try {
  // Quote the tag to handle spaces in version strings
  execSync(`git tag "${tag}"`);
  execSync(`git push origin "${tag}"`);
  console.log(`✅ Tagged and pushed ${tag}`);
} catch (err) {
  console.error(`❌ Failed to tag: ${err.message}`);
}