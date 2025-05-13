import { join } from "node:path";
import { PassThrough, pipeline, Readable, Writable } from "node:stream";
import { BlobServiceClient } from "@azure/storage-blob";

const AZURE_CONTAINER = process.env["CONTAINER_NAME"] ?? "turborepocache";

export function createStorageClient(connectionString: string) {
  const storage = createAzureBlobStorage({
    connectionString,
    containerName: AZURE_CONTAINER,
  });

  async function getCachedArtifactOrThrow(
    artifactId: string,
    team: string
  ): Promise<Readable> {
    return new Promise((resolve, reject) => {
      const artifactPath = join(team, artifactId);
      storage.exists(artifactPath, (err, exists) => {
        if (err) {
          return reject(err);
        }
        if (!exists) {
          return reject(new Error(`Artifact ${artifactPath} doesn't exist.`));
        }
        resolve(storage.createReadStream(artifactPath));
      });
    });
  }

  async function existsCachedArtifactOrThrow(
    artifactId: string,
    team: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const artifactPath = join(team, artifactId);
      storage.exists(artifactPath, (err, exists) => {
        if (err) {
          return reject(err);
        }
        if (!exists) {
          return reject(new Error(`Artifact ${artifactPath} doesn't exist.`));
        }
        resolve();
      });
    });
  }

  async function createCachedArtifact(
    artifactId: string,
    team: string,
    artifact: Readable
  ): Promise<NodeJS.WritableStream> {
    return pipeline(
      artifact,
      storage.createWriteStream(join(team, artifactId)),
      () => {}
    );
  }

  return {
    getCachedArtifactOrThrow,
    existsCachedArtifactOrThrow,
    createCachedArtifact,
  };
}

export interface StorageProvider {
  exists: (
    artifactPath: string,
    cb: (err: Error | null, exists?: boolean) => void
  ) => void;
  createReadStream: (artifactPath: string) => Readable;
  createWriteStream: (artifactPath: string) => Writable;
}

interface AzureBlobStorageOptions {
  containerName: string;
  connectionString: string;
}

function createAzureBlobStorage({
  containerName,
  connectionString,
}: AzureBlobStorageOptions): StorageProvider {
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);

  return {
    exists: (artifactPath, cb) => {
      const blobClient = containerClient.getBlobClient(artifactPath);
      blobClient.exists().then((exists) => {
        cb(null, exists);
      }, cb);
    },
    createReadStream(artifactPath) {
      const blobClient = containerClient.getBlobClient(artifactPath);
      const stream = new PassThrough();
      blobClient.download().then((response) => {
        if (response.readableStreamBody) {
          response.readableStreamBody.pipe(stream);
        }
      });
      return stream;
    },
    createWriteStream(artifactPath) {
      const blockBlobClient = containerClient.getBlockBlobClient(artifactPath);
      const stream = new PassThrough();
      blockBlobClient.uploadStream(stream);
      return stream;
    },
  };
}
