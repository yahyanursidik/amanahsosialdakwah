import {
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type StorageConfig = {
  bucket: string;
  client: S3Client;
};

let cached: StorageConfig | null = null;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Konfigurasi storage ${name} belum tersedia.`);
  return value;
}

export function getStorageConfig(): StorageConfig {
  if (cached) return cached;
  const endpoint = required("S3_ENDPOINT");
  const region = required("S3_REGION");
  const bucket = required("S3_BUCKET");
  cached = {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: required("S3_ACCESS_KEY_ID"),
        secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      },
    }),
  };
  return cached;
}

export async function createSignedUpload(input: {
  contentType: string;
  key: string;
  sizeBytes: number;
  metadata: Record<string, string>;
}) {
  const { bucket, client } = getStorageConfig();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentLength: input.sizeBytes,
    ContentType: input.contentType,
    Metadata: input.metadata,
  });
  return {
    bucket,
    expiresIn: 600,
    url: await getSignedUrl(client, command, { expiresIn: 600 }),
  };
}

export async function verifyStoredObject(input: {
  key: string;
  expectedContentType: string;
  expectedSize: number;
}) {
  const { bucket, client } = getStorageConfig();
  const result = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: input.key }),
  );
  return {
    valid:
      result.ContentLength === input.expectedSize &&
      result.ContentType === input.expectedContentType,
    contentLength: result.ContentLength,
    contentType: result.ContentType,
  };
}

export async function createSignedDownload(input: {
  fileName: string;
  key: string;
}) {
  const { bucket, client } = getStorageConfig();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ResponseContentDisposition: `attachment; filename="${input.fileName.replaceAll('"', "")}"`,
  });
  return {
    expiresIn: 300,
    url: await getSignedUrl(client, command, { expiresIn: 300 }),
  };
}
