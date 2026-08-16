import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs';

export function isS3Enabled(): boolean {
  return !!(
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_BUCKET_NAME
  );
}

const s3Client = isS3Enabled()
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT, // e.g. https://s3.us-west-004.backblazeb2.com
      region: process.env.S3_REGION ?? 'us-west-004',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    })
  : null;

/**
 * Upload a local file to S3-compatible cloud storage (e.g. Backblaze B2)
 */
export async function uploadToS3(localFilePath: string, key: string, mimeType: string): Promise<string> {
  if (!s3Client) {
    throw new Error('S3 Client is not configured. Check environmental variables.');
  }

  const fileStream = fs.createReadStream(localFilePath);
  const bucketName = process.env.S3_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return the public base URL of the uploaded file
  const endpoint = (process.env.S3_ENDPOINT ?? 'https://s3.us-west-004.backblazeb2.com').replace(/\/$/, '');
  return `${endpoint}/${bucketName}/${key}`;
}

/**
 * Delete a file from S3-compatible cloud storage (e.g. Backblaze B2)
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!s3Client) return;

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete object from S3: ${key}`, error);
  }
}

/**
 * Generate a secure presigned GET URL for a private S3 object (valid for expiresInSeconds)
 */
export async function getPresignedUrl(key: string, expiresInSeconds: number = 300): Promise<string> {
  if (!s3Client) {
    return `/uploads/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Helper to extract storage key (e.g. "media/file.jpg") from any local or remote file URL
 */
export function extractStorageKey(url: string): string | null {
  if (url.startsWith('/uploads/')) {
    return url.replace('/uploads/', '');
  }

  const folders = ['avatars/', 'media/', 'verification/'];
  for (const folder of folders) {
    const index = url.indexOf(folder);
    if (index !== -1) {
      // Extract the key starting with the folder name
      return url.slice(index);
    }
  }

  return null;
}

/**
 * Helper to sign private URLs (media, verification) for temporary download access (5 mins)
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

  // Avatars are public, no signing required
  if (key.startsWith('avatars/')) {
    return url;
  }

  try {
    // Generate secure presigned URL valid for 5 minutes (300 seconds)
    return await getPresignedUrl(key, 300);
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


