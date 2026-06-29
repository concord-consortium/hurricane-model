import type { IHurricaneInteractiveState } from "../types/interactive-state";
import { saveModelToCloud, loadModelFromCloud } from "./cloud-storage";

// --- token-service / aws-sdk / pako mocks ---
const uploadPromise = jest.fn().mockResolvedValue({});
const upload = jest.fn(() => ({ promise: uploadPromise }));
jest.mock("aws-sdk/clients/s3", () =>
  jest.fn().mockImplementation(() => ({ upload }))
);

const createResource = jest.fn().mockResolvedValue({
  id: "abc123", bucket: "models-bucket", region: "us-east-1"
});
const getReadWriteToken = jest.fn().mockReturnValue("rwtoken");
const getCredentials = jest.fn().mockResolvedValue({
  accessKeyId: "AK", secretAccessKey: "SK", sessionToken: "ST"
});
const getPublicS3Path = jest.fn().mockReturnValue("hurricane-models/abc123/model.json.gz");
jest.mock("@concord-consortium/token-service", () => ({
  TokenServiceClient: jest.fn().mockImplementation(() => ({
    createResource, getReadWriteToken, getCredentials, getPublicS3Path
  }))
}));

jest.mock("pako", () => ({ gzip: jest.fn((_s: string) => new Uint8Array([1, 2, 3])) }));

const sampleState = { version: 1, simulation: {}, ui: {} } as unknown as IHurricaneInteractiveState;

describe("cloud-storage", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("saveModelToCloud", () => {
    it("creates a hurricane-models resource and returns its id", async () => {
      const id = await saveModelToCloud(sampleState);
      expect(id).toBe("abc123");
      expect(createResource).toHaveBeenCalledWith(
        expect.objectContaining({ tool: "hurricane-models", type: "s3Folder" })
      );
      expect(upload).toHaveBeenCalledWith(expect.objectContaining({
        Bucket: "models-bucket",
        Key: "hurricane-models/abc123/model.json.gz",
        ContentEncoding: "gzip"
      }));
    });
  });

  describe("loadModelFromCloud", () => {
    it("fetches the gzip URL and returns migrated state", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ version: 1, simulation: { season: "fall" }, ui: {} })
      });
      const state = await loadModelFromCloud("abc123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://models-resources.concord.org/hurricane-models/abc123/model.json.gz"
      );
      expect(state.version).toBe(1);
    });

    it("throws a descriptive error on a non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
      await expect(loadModelFromCloud("missing")).rejects.toThrow(/missing.*404 Not Found/);
    });

    it("throws an incompatibility error when migrateState returns null", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 999 }) });
      await expect(loadModelFromCloud("abc123")).rejects.toThrow(/incompatible/i);
    });

    it("propagates the error when fetch rejects (network failure)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
      await expect(loadModelFromCloud("abc123")).rejects.toThrow("network down");
    });
  });
});
