import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError, responseHTML } from "../utils/response-utils";
import {
  deleteAzureTableEntities,
  getAzureProjectsTableClient,
  getAzureTableClientForProject,
  listAzureTableEntities,
} from "../utils/azure-data-tables";
import {
  StorybookBuild,
  storybookBuildSchema,
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
import { BuildTable } from "../components/builds-table";
import { LabelsTable } from "../components/labels-table";

export async function listLabels(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;
  context.log("Serving all labels for project '%s'...", projectId);

  try {
    const { connectionString } = getStore();
    const entities = await listAzureTableEntities(
      context,
      getAzureTableClientForProject(connectionString, projectId, "Labels")
    );
    const labels = storybookLabelSchema.array().parse(entities);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout title="All Labels" breadcrumbs={[projectId]}>
          <LabelsTable
            labels={labels}
            projectId={projectId}
            caption={`Labels (${labels.length})`}
          />
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: labels };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function getLabel(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;
  context.log("Getting label '%s' for project '%s'...", labelSlug, projectId);

  try {
    const { connectionString } = getStore();
    const client = getAzureTableClientForProject(
      connectionString,
      projectId,
      "Labels"
    );
    const labelDetails = storybookLabelSchema.parse(
      await client.getEntity(projectId, labelSlug)
    );

    const buildsClient = getAzureTableClientForProject(
      connectionString,
      projectId,
      "Builds"
    );
    const builds = storybookBuildSchema.array().parse(
      await listAzureTableEntities<StorybookBuild>(context, buildsClient, {
        filter: (build) => build.labels.split(",").includes(labelSlug),
      })
    );

    const accept = request.headers.get("accept");
    const project = await getAzureProjectsTableClient(
      connectionString
    ).getEntity(PROJECTS_TABLE_PARTITION_KEY, projectId);

    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title={labelDetails.value}
          breadcrumbs={[projectId, "Labels"]}
        >
          <>
            <RawDataPreview data={labelDetails} summary={"Label details"} />
            <BuildTable
              caption={`Builds (${builds.length})`}
              builds={builds}
              labels={undefined}
              project={storybookProjectSchema.parse(project)}
            />
          </>
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: { ...labelDetails, builds } };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function deleteLabel(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;
  context.log("Deleting label '%s' for project '%s'...", labelSlug, projectId);

  try {
    const { connectionString } = getStore();

    await deleteAzureTableEntities<StorybookBuild>(
      context,
      getAzureTableClientForProject(connectionString, projectId, "Builds"),
      { filter: (build) => build.labels.split(",").includes(labelSlug) }
    );

    await getAzureTableClientForProject(
      connectionString,
      projectId,
      "Labels"
    ).deleteEntity(projectId, labelSlug);

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

export async function getLabelLatestBuild(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;
  context.log(
    "Getting latest build for label '%s' in project '%s'...",
    labelSlug,
    projectId
  );

  try {
    const { connectionString } = getStore();

    const client = getAzureTableClientForProject(
      connectionString,
      projectId,
      "Labels"
    );
    const labelDetails = storybookLabelSchema.parse(
      await client.getEntity(projectId, labelSlug)
    );

    const latestBuildSHA = labelDetails.buildSHA;

    if (!latestBuildSHA) {
      return {
        status: 404,
        jsonBody: { error: "No builds found for this label." },
      };
    }

    return {
      status: 303,
      headers: { Location: urlBuilder.buildSHA(projectId, latestBuildSHA) },
    };
  } catch (error) {
    return responseError(error, context);
  }
}
