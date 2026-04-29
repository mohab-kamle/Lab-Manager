const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multerS3 = require('multer-s3');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT : undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO
});

const s3UrlClient = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_EXTERNAL_ENDPOINT || process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: !!(process.env.S3_EXTERNAL_ENDPOINT || process.env.S3_ENDPOINT),
});

const s3Bucket = process.env.S3_BUCKET || 'cura-uploads';

// Configure multer to use S3 for uploads
const s3ImageUpload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: s3Bucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const labId = req.params.labId || (req.user && req.user.lab_id) || 'lab';
      const unique = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      
      // We store logos in a public prefix
      const s3Key = `public/logos/${labId}_${unique}_${base}${ext}`;
      cb(null, s3Key);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

const deleteOldS3Logo = async (logoUrl) => {
  if (!logoUrl) return;
  try {
    let oldKey;
    if (logoUrl.includes('public/logos/')) {
       oldKey = logoUrl.substring(logoUrl.indexOf('public/logos/'));
    } else {
      const oldFilename = path.basename(logoUrl);
      oldKey = `public/logos/${oldFilename}`;
    }

    const deleteParams = {
      Bucket: s3Bucket,
      Key: oldKey,
    };
    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error('Failed to delete old logo from S3:', error);
  }
};

const getS3FileUrl = async (key, isPublic = false) => {
  const externalEndpoint = process.env.S3_EXTERNAL_ENDPOINT || process.env.S3_ENDPOINT;

  if (isPublic) {
    if (externalEndpoint) {
      // Local MinIO
      return `${externalEndpoint}/${s3Bucket}/${key}`;
    }
    // AWS S3
    return `https://${s3Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }
  
  // Presigned URL for private files
  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key
  });
  return await getSignedUrl(s3UrlClient, command, { expiresIn: 3600 });
};

const s3CommentImageUpload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: s3Bucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const sanitizeFilenamePart = (part) => {
        if (!part) return '';
        return String(part).replace(/[^a-zA-Z0-9_-]/g, '');
      };

      const rawReportId = req.params.id || req.body.reportId || 'unknown';
      const rawCommentType = req.body.commentType || 'general';

      const reportId = sanitizeFilenamePart(rawReportId);
      const commentType = sanitizeFilenamePart(rawCommentType);

      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

      // Store in private prefix
      const s3Key = `private/comment-images/${reportId}_${commentType}_${timestamp}_${randomSuffix}_${sanitizedOriginalName}`;
      cb(null, s3Key);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

module.exports = {
  s3Client,
  s3Bucket,
  s3ImageUpload,
  s3CommentImageUpload,
  deleteOldS3Logo,
  getS3FileUrl
};
