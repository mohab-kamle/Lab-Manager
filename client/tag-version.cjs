const { execSync } = require('child_process');
const pkg = require('./package.json');

const version = pkg.version;
const tag = `v${version}`;

try {
  // Create tag locally (don't push - let GitHub Actions handle pushing)
  execSync(`git tag "${tag}"`);
  console.log(`✅ Tagged locally: ${tag}`);
  console.log(`To push the tag, run: git push origin "${tag}"`);
} catch (err) {
  console.error(`❌ Failed to tag: ${err.message}`);
}