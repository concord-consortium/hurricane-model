// Minimal mock for @aws-sdk/client-s3. The real v3 package pulls in ESM-only
// @smithy submodules (cbor, protocols) that don't transform cleanly under Jest.
// Component tests only import cloud-storage transitively and never exercise the
// upload, so a lightweight stub is enough. cloud-storage.test.ts overrides this
// with its own inline jest.mock to assert on the client/command.
class S3Client {
  send() {
    return Promise.resolve({});
  }
}

class PutObjectCommand {
  constructor(input) {
    this.input = input;
  }
}

module.exports = { S3Client, PutObjectCommand };
