import { join } from "node:path";
import { PassThrough, pipeline, Readable, Writable } from "node:stream";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { AzureBlobStorageOptions } from "./types";

const STORAGE_CONN_STR = process.env["AzureWebJobsStorage"];
const AZURE_CONTAINER = process.env["CONTAINER_NAME"] ?? "turborepocache";

export async function createStorageClient({
  connectionString = STORAGE_CONN_STR,
  containerName = AZURE_CONTAINER,
}: Partial<AzureBlobStorageOptions>) {
  if (!connectionString) {
    throw new EvalError(
      "Connection String is missing for Azure Storage. Assign the value to env 'AzureWebJobsStorage'."
    );
  }

  const storage = await createAzureBlobStorage({
    connectionString,
    containerName,
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

async function createAzureBlobStorage({
  containerName,
  connectionString,
}: AzureBlobStorageOptions): Promise<StorageProvider> {
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);

  let containerClient: ContainerClient;

  try {
    containerClient = blobServiceClient.getContainerClient(containerName);
    if (!containerClient) {
      throw new Error("Container not found");
    }
  } catch {
    containerClient = (await blobServiceClient.createContainer(containerName))
      .containerClient;
  }

  return {
    exists(artifactPath, callback) {
      const blobClient = containerClient.getBlobClient(artifactPath);
      blobClient.exists().then((exists) => {
        callback(null, exists);
      }, callback);
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
