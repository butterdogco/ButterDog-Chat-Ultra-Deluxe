const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const bucketName = process.env.CDN_BUCKET_NAME;

let s3Client;
let s3ClientTimeout;

function initS3Client() {
  if (s3Client) {
    return;
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CDN_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CDN_ACCESS_KEY,
      secretAccessKey: process.env.CDN_SECRET_KEY
    }
  });

  // Set a timeout to destroy the client after 5 minutes of inactivity
  if (s3ClientTimeout) {
    clearTimeout(s3ClientTimeout);
  }

  s3ClientTimeout = setTimeout(() => {
    s3Client.destroy();
    s3Client = null;
  }, 5 * 60 * 1000); // 5 minutes
}

function uploadFileToCDN(buffer, key, contentType) {
  initS3Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });

  return s3Client.send(command);
}

function getFileFromCDN(key) {
  initS3Client();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  return s3Client.send(command);
}

function generatePresignedUrl(key, expiresInSeconds = 3600) {
  initS3Client();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  return s3Client.getSignedUrl(command, { expiresIn: expiresInSeconds });
}

function listFilesInCDN(prefix) {
  initS3Client();

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix
  });

  return s3Client.send(command);
}

module.exports = {
  uploadFileToCDN,
  getFileFromCDN,
  generatePresignedUrl,
  listFilesInCDN
};