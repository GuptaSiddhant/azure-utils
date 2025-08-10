import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError, responseHTML } from "../utils/response-utils";
import {
  getAzureTableClientForProject,
  listAzureTableEntities,
} from "../utils/azure-data-tables";
import { storybookBuildSchema, storybookLabelSchema } from "../utils/schemas";
import { CONTENT_TYPES, urlBuilder } from "../utils/constants";
import { DocumentLayout } from "../components/layout";
import { RawDataPreview } from "../components/raw-data";
import { getRequestStore } from "../utils/stores";
import { BuildTable } from "../components/builds-table";
import { LabelsTable } from "../components/labels-table";

export async function listLabels(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;
  context.log("Serving all labels for project '%s'...", projectId);

  try {
    const { connectionString } = getRequestStore();
    const entities = await listAzureTableEntities(
      context,
      getAzureTableClientForProject(connectionString, projectId, "Labels")
    );
    const labels = storybookLabelSchema.array().parse(entities);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title="All Labels"
          breadcrumbs={["Projects", projectId]}
        >
          <LabelsTable labels={labels} projectId={projectId} />
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
    const { connectionString } = getRequestStore();
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
    const builds = storybookBuildSchema
      .array()
      .parse(
        await listAzureTableEntities(context, buildsClient, { limit: 10 })
      );

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          title={labelDetails.value}
          breadcrumbs={["Projects", projectId, "Labels"]}
        >
          <>
            <RawDataPreview data={labelDetails} />
            <BuildTable builds={builds} labels={undefined} />
          </>
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: labelDetails };
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
    const { connectionString } = getRequestStore();
    const client = getAzureTableClientForProject(
      connectionString,
      projectId,
      "Labels"
    );
    await client.deleteEntity(projectId, labelSlug);

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
