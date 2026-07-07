import { TokenServiceClient, S3Resource } from "@concord-consortium/token-service";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pako from "pako";
import { migrateState } from "../models/interactive-state";
import { IHurricaneInteractiveState } from "../types/interactive-state";

const TOOL_NAME = "hurricane-models";
const FILENAME = "model.json.gz";

/**
 * Uploads the serialized interactive state to S3 via Concord's token-service.
 * Resolves to the resource id, which is used as the shareable `modelId`.
 */
export async function saveModelToCloud(state: IHurricaneInteractiveState): Promise<string> {
  // Always use the production token-service; shared models live in one place regardless of build env.
  const client = new TokenServiceClient({ env: "production" });
  const resource = await client.createResource({
    tool: TOOL_NAME,
    type: "s3Folder",
    name: FILENAME,
    description: "Created by Hurricane Explorer",
    accessRuleType: "readWriteToken"
  }) as S3Resource;

  const readWriteToken = client.getReadWriteToken(resource);
  if (!readWriteToken) {
    throw new Error("Could not save model: the storage service did not return a write token.");
  }
  const credentials = await client.getCredentials(resource.id, readWriteToken);

  const { bucket, region } = resource;
  // Recent @aws-sdk/client-s3 v3 sends default request-checksum headers (x-amz-checksum-*,
  // x-amz-sdk-checksum-algorithm). If browser PUTs start failing with opaque CORS errors,
  // the bucket's CORS config must allow those headers (or set requestChecksumCalculation).
  const s3 = new S3Client({ region, credentials });
  const publicPath = client.getPublicS3Path(resource, FILENAME);

  const compressed = pako.gzip(JSON.stringify(state));

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: publicPath,
    Body: compressed,
    // JSON payload stored gzip-encoded; ContentType stays application/json so the browser auto-decompresses on fetch.
    ContentType: "application/json",
    ContentEncoding: "gzip",
    CacheControl: "public, max-age=31536000, immutable" // immutable, cache for a year
  }));

  return resource.id;
}

/**
 * Loads a previously saved model by id. The browser decompresses the gzip
 * transparently (it was uploaded with ContentEncoding: gzip), so we just parse
 * JSON. Throws a descriptive Error on any failure so callers can surface the
 * message to the user (a network rejection from fetch propagates as-is).
 */
export async function loadModelFromCloud(modelId: string): Promise<IHurricaneInteractiveState> {
  // Must match the upload Key (client.getPublicS3Path => "<TOOL_NAME>/<id>/<FILENAME>"); we only have
  // the id at load time, so the public URL is reconstructed by convention.
  const url = `https://models-resources.concord.org/${TOOL_NAME}/${modelId}/${FILENAME}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Model "${modelId}" could not be loaded (${response.status} ${response.statusText}).`);
  }
  const data = await response.json();
  const migrated = migrateState(data);
  if (!migrated) {
    throw new Error(`Model "${modelId}" is incompatible with this version of Hurricane Explorer.`);
  }
  return migrated;
}
