require("dotenv").config();
const { exec } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const command = "npx sequelize-cli db:migrate";

console.log(`🚀 Starting database migration...`);
console.log(`📂 Working directory: ${projectRoot}`);
console.log(`💻 Command: ${command}`);

const child = exec(command, {
    cwd: projectRoot,
    env: process.env,
});

child.stdout.on("data", (data) => {
    process.stdout.write(data);
});

child.stderr.on("data", (data) => {
    process.stderr.write(data);
});

child.on("close", (code) => {
    if (code === 0) {
        console.log("✅ Database migration completed successfully.");
        process.exit(0);
    } else {
        console.error(`❌ Database migration failed with exit code ${code}`);
        process.exit(code);
    }
});
