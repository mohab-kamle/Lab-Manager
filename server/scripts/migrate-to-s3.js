const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.development') });

// Override endpoint for local host execution (outside docker)
if (process.env.S3_ENDPOINT && process.env.S3_ENDPOINT.includes('minio')) {
  process.env.S3_ENDPOINT = 'http://127.0.0.1:9000';
}

const { s3Client, s3Bucket } = require('../services/s3Service');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const uploadDir = path.join(__dirname, '../uploads');

async function uploadDirectoryToS3(localDir, s3Prefix, isPublic = false) {
  if (!fs.existsSync(localDir)) {
    console.log(`Directory ${localDir} does not exist, skipping...`);
    return;
  }

  const files = fs.readdirSync(localDir);
  console.log(`Found ${files.length} files in ${localDir}`);

  for (const file of files) {
    const filePath = path.join(localDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const s3Key = `${s3Prefix}/${file}`;
      console.log(`Uploading ${file} to s3://${s3Bucket}/${s3Key}`);

      const fileStream = fs.createReadStream(filePath);
      let contentType = 'application/octet-stream';
      const ext = path.extname(file).toLowerCase();
      
      if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.pdf') contentType = 'application/pdf';

      const uploadParams = {
        Bucket: s3Bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
        // Since MinIO doesn't support ACLs nicely sometimes, we don't set ACL here. 
        // We rely on bucket policies if needed, but the s3Service doesn't set ACLs either.
      };

      try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(`✅ Success: ${file}`);
      } catch (err) {
        console.error(`❌ Failed: ${file}`, err);
      }
    }
  }
}

async function runMigration() {
  console.log('Starting migration to S3/MinIO...');
  console.log('Using endpoint:', process.env.S3_ENDPOINT || 'AWS S3 (Production)');
  console.log('Target Bucket:', s3Bucket);

  // Migrate logos -> public/logos
  await uploadDirectoryToS3(path.join(uploadDir, 'branding/logos'), 'public/logos', true);

  // Migrate comment images -> private/comment-images
  await uploadDirectoryToS3(path.join(uploadDir, 'comment-images'), 'private/comment-images', false);

  // Migrate private files -> private/uploads (if any exist)
  await uploadDirectoryToS3(path.join(uploadDir, 'private'), 'private/uploads', false);

  console.log('Migration complete!');
}

runMigration().catch(console.error);
