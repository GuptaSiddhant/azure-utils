import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError, responseHTML } from "../utils/response-utils";
import {
  getAzureProjectsTableClient,
  getAzureTableClientForProject,
  listAzureTableEntities,
  upsertStorybookBuildToAzureTable,
  upsertStorybookLabelsToAzureTable,
} from "../utils/azure-data-tables";
import {
  StorybookBuild,
  storybookBuildSchema,
  storybookBuildUploadSchema,
  storybookLabelSchema,
  storybookProjectSchema,
} from "../utils/schemas";
import {
  CONTENT_TYPES,
  PROJECTS_TABLE_PARTITION_KEY,
  urlBuilder,
} from "../utils/constants";
import { DocumentLayout } from "../components/layout";
import { RawDataPreview } from "../components/raw-data";
import { getStore } from "../utils/store";
import { urlSearchParamsToObject } from "../utils/url-utils";
import { BuildTable } from "../components/builds-table";
import { validateBuildUploadBody } from "../utils/validators";
import { uploadZipWithDecompressed } from "../utils/upload-utils";

export async function listBuilds(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;
  context.log("Serving all builds for project '%s'...", projectId);

  try {
    const { connectionString } = getStore();
    const entities = await listAzureTableEntities(
      context,
      getAzureTableClientForProject(connectionString, projectId, "Builds")
    );
    const builds = storybookBuildSchema.array().parse(entities);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      const project = await getAzureProjectsTableClient(
        connectionString
      ).getEntity(PROJECTS_TABLE_PARTITION_KEY, projectId);
      const labels = (
        await listAzureTableEntities(
          context,
          getAzureTableClientForProject(connectionString, projectId, "Labels")
        )
      ).map((label) => storybookLabelSchema.parse(label));

      return responseHTML(
        <DocumentLayout title="All Builds" breadcrumbs={[projectId]}>
          <BuildTable
            builds={builds}
            labels={labels}
            project={storybookProjectSchema.parse(project)}
            caption={`Builds (${builds.length})`}
          />
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: builds };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function getBuild(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", buildSHA = "" } = request.params;
  context.log("Getting build '%s' for project '%s'...", buildSHA, projectId);

  try {
    const { connectionString } = getStore();
    const client = getAzureTableClientForProject(
      connectionString,
      projectId,
      "Builds"
    );
    const buildDetails = storybookBuildSchema.parse(
      await client.getEntity(projectId!, buildSHA!)
    );

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title={
            buildDetails.message
              ? `[${buildSHA.slice(0, 7)}] ${buildDetails.message}`
              : buildSHA.slice(0, 7)
          }
          breadcrumbs={[projectId, "Builds"]}
        >
          <>
            <RawDataPreview
              data={buildDetails}
              summary={"Build details"}
              open
            />
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <a
                href={urlBuilder.storybookIndexHtml(projectId, buildSHA)}
                target="_blank"
              >
                View Storybook
              </a>
              <a
                href={urlBuilder.storybookTestReport(projectId, buildSHA)}
                target="_blank"
              >
                View Test Report
              </a>
              <a
                href={urlBuilder.storybookCoverage(projectId, buildSHA)}
                target="_blank"
              >
                View Coverage
              </a>
              <a
                href={urlBuilder.storybookZip(projectId, buildSHA)}
                download={`storybook-${projectId}-${buildSHA}.zip`}
                target="_blank"
              >
                Download Storybook
              </a>
            </div>
          </>
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: buildDetails };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function deleteBuild(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", buildSHA = "" } = request.params;
  context.log("Deleting build '%s' for project '%s'...", buildSHA, projectId);

  try {
    const { connectionString } = getStore();
    const client = getAzureTableClientForProject(
      connectionString,
      projectId,
      "Builds"
    );
    await client.deleteEntity(projectId, buildSHA);

    const buildsUrl = urlBuilder.allBuilds(projectId);
    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return { status: 303, headers: { Location: buildsUrl } };
    }

    return { status: 204, headers: { Location: buildsUrl } };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function uploadBuild(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;
  const { connectionString } = getStore();

  try {
    await getAzureProjectsTableClient(connectionString).getEntity(
      PROJECTS_TABLE_PARTITION_KEY,
      projectId
    );
  } catch {
    return responseError(
      `The project '${projectId}' does not exist.`,
      context,
      404
    );
  }

  context.log("Uploading build for project '%s'...", projectId);

  const queryParseResult = storybookBuildUploadSchema.safeParse(
    urlSearchParamsToObject(request.query)
  );
  if (!queryParseResult.success) {
    return responseError(queryParseResult.error, context, 400);
  }

  const buildData = queryParseResult.data;
  const bodyValidationResponse = validateBuildUploadBody(request, context);
  if (typeof bodyValidationResponse === "object") {
    return bodyValidationResponse;
  }

  try {
    const blobName = await uploadZipWithDecompressed(
      context,
      request,
      connectionString,
      projectId,
      buildData.sha
    );

    const labelSlugs = await upsertStorybookLabelsToAzureTable(
      context,
      connectionString,
      projectId,
      buildData.labels,
      buildData.sha
    );

    const data: StorybookBuild = {
      ...buildData,
      project: projectId,
      labels: labelSlugs.join(","),
    };

    await upsertStorybookBuildToAzureTable(context, connectionString, data);

    await getAzureProjectsTableClient(connectionString).updateEntity(
      {
        partitionKey: PROJECTS_TABLE_PARTITION_KEY,
        rowKey: projectId,
        buildSHA: buildData.sha,
      },
      "Merge"
    );

    return { status: 202, jsonBody: { blobName, data } };
  } catch (error) {
    return responseError(error, context);
  }
}
