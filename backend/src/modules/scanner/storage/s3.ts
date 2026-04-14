import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../../config/env.config';

export const scannerS3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const getPublicS3Url = (key: string): string =>
  `https://${config.scanner.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

export const uploadScannerDocumentToS3 = async (
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ s3_key: string; s3_url: string }> => {
  await scannerS3Client.send(
    new PutObjectCommand({
      Bucket: config.scanner.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    }),
  );

  return {
    s3_key: key,
    s3_url: getPublicS3Url(key),
  };
};

export const deleteScannerDocumentFromS3 = async (key: string): Promise<void> => {
  await scannerS3Client.send(
    new DeleteObjectCommand({
      Bucket: config.scanner.s3BucketName,
      Key: key,
    }),
  );
};

export const getScannerDocumentSignedUrl = async (key: string, expiresIn = 300): Promise<string> => {
  return getSignedUrl(
    scannerS3Client,
    new GetObjectCommand({
      Bucket: config.scanner.s3BucketName,
      Key: key,
    }),
    { expiresIn },
  );
};
