import { TokenServiceClient, S3Resource } from "@concord-consortium/token-service";
import S3 from "aws-sdk/clients/s3";
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
  const client = new TokenServiceClient({ env: "production" });
  const resource = await client.createResource({
    tool: TOOL_NAME,
    type: "s3Folder",
    name: FILENAME,
    description: "Created by Hurricane Explorer",
    accessRuleType: "readWriteToken"
  }) as S3Resource;

  const readWriteToken = client.getReadWriteToken(resource) || "";
  const credentials = await client.getCredentials(resource.id, readWriteToken);

  const { bucket, region } = resource;
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;
  const s3 = new S3({ region, accessKeyId, secretAccessKey, sessionToken });
  const publicPath = client.getPublicS3Path(resource, FILENAME);

  const compressed = pako.gzip(JSON.stringify(state));
  const blob = new Blob([compressed as BlobPart], { type: "application/gzip" });

  await s3.upload({
    Bucket: bucket,
    Key: publicPath,
    Body: blob,
    ContentType: "application/json",
    ContentEncoding: "gzip",
    CacheControl: "public, max-age=31536000, immutable" // immutable, cache for a year
  }).promise();

  return resource.id;
}

/**
 * Loads a previously saved model by id. The browser decompresses the gzip
 * transparently (it was uploaded with ContentEncoding: gzip), so we just parse
 * JSON. Throws a descriptive Error on any failure so callers can surface the
 * message to the user (a network rejection from fetch propagates as-is).
 */
export async function loadModelFromCloud(modelId: string): Promise<IHurricaneInteractiveState> {
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
