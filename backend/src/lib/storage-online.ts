import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs';

let cachedS3Client: S3Client | null = null;

function getS3Config() {
  const accessKey = (
    process.env.S3_ACCESS_KEY ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.B2_APPLICATION_KEY_ID ||
    process.env.B2_KEY_ID ||
    ''
  ).trim();

  const secretKey = (
    process.env.S3_SECRET_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.B2_APPLICATION_KEY ||
    process.env.B2_APP_KEY ||
    ''
  ).trim();

  const bucketName = (
    process.env.S3_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME ||
    process.env.B2_BUCKET_NAME ||
    'Only-Adult'
  ).trim();

  const endpoint = (
    process.env.S3_ENDPOINT ||
    'https://s3.us-east-005.backblazeb2.com'
  ).trim().replace(/\/$/, '');

  const region = (
    process.env.S3_REGION ||
    endpoint.split('.')[1] ||
    'us-east-005'
  ).trim();

  const cdnUrl = (
    process.env.CLOUDFLARE_CDN_URL ||
    process.env.S3_PUBLIC_DOMAIN ||
    process.env.CDN_URL ||
    ''
  ).trim().replace(/\/$/, '');

  return { accessKey, secretKey, bucketName, endpoint, region, cdnUrl };
}

export function isS3Enabled(): boolean {
  const { accessKey, secretKey, bucketName } = getS3Config();
  return Boolean(accessKey && secretKey && bucketName);
}

export function getS3Client(): S3Client | null {
  if (!isS3Enabled()) return null;

  const { accessKey, secretKey, endpoint, region } = getS3Config();

  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }

  return cachedS3Client;
}

/**
 * Upload a local file to S3-compatible cloud storage (e.g. Backblaze B2)
 */
export async function uploadToS3(localFilePath: string, key: string, mimeType: string): Promise<string> {
  const client = getS3Client();
  const { bucketName, endpoint, cdnUrl } = getS3Config();

  if (!client) {
    throw new Error('S3 Client is not configured. Check environmental variables (S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME).');
  }

  const fileStream = fs.createReadStream(localFilePath);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mimeType,
  });

  await client.send(command);

  // Si un CDN Cloudflare est configuré, renvoyer l'URL optimisée Cloudflare CDN
  if (cdnUrl) {
    return `${cdnUrl}/${bucketName}/${key}`;
  }

  // Return the public base URL of the uploaded file
  return `${endpoint}/${bucketName}/${key}`;
}

/**
 * Delete a file from S3-compatible cloud storage (e.g. Backblaze B2)
 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();
  if (!client) return;

  const { bucketName } = getS3Config();

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await client.send(command);
  } catch (error) {
    console.error(`Failed to delete object from S3: ${key}`, error);
  }
}

/**
 * Generate a secure presigned GET URL for a private S3 object (valid for expiresInSeconds, default 1 hour)
 */
export async function getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const client = getS3Client();
  if (!client) {
    return `/uploads/${key}`;
  }

  const { bucketName } = getS3Config();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Helper to extract storage key (e.g. "media/file.jpg") from any local or remote file URL
 */
export function extractStorageKey(url: string): string | null {
  if (!url) return null;

  // Nettoyer tous les paramètres de requête (?X-Amz-...) et ancres
  const cleanUrl = url.split('?')[0].split('#')[0];

  if (cleanUrl.startsWith('/uploads/')) {
    return cleanUrl.replace('/uploads/', '');
  }

  const folders = ['avatars/', 'media/', 'verification/', 'stories/'];
  for (const folder of folders) {
    const index = cleanUrl.indexOf(folder);
    if (index !== -1) {
      // Extract the clean key starting with the folder name
      return cleanUrl.slice(index);
    }
  }

  return null;
}

/**
 * Helper to sign private URLs (media, verification, audio) for secure download access (1 hour)
 * Avatars remain public and do not need signing.
 */
export async function signUrlIfNeeded(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  // Local files remain untouched
  if (url.startsWith('/uploads/')) {
    return url;
  }

  const key = extractStorageKey(url);
  if (!key) return url;

  try {
    // Generate secure presigned URL valid for 1 hour (3600 seconds)
    return await getPresignedUrl(key, 3600);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return url;
  }
}

/**
 * Helper to parse text, find S3/Scaleway URLs and replace them with dynamic presigned URLs
 */
export async function signTextUrls(text: string | null | undefined): Promise<string | null> {
  if (!text) return null;
  // Match absolute URLs (http/https) and local /uploads/ URLs
  const urlRegex = /(https?:\/\/[^\s]+|\/uploads\/[^\s]+)/g;
  const matches = Array.from(text.matchAll(urlRegex));
  if (matches.length === 0) return text;

  let signedText = text;
  for (const match of matches) {
    const rawUrl = match[0];
    const signedUrl = await signUrlIfNeeded(rawUrl);
    if (signedUrl) {
      signedText = signedText.replace(rawUrl, signedUrl);
    }
  }
  return signedText;
}


