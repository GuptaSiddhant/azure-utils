import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError, responseHTML } from "../utils/response-utils";
import { CONTENT_TYPES } from "../utils/constants";
import { DocumentLayout } from "../components/layout";
import { RawDataPreview } from "../components/raw-data";
import { getStore } from "../utils/store";
import { BuildTable } from "../components/builds-table";
import { LabelsTable } from "../components/labels-table";
import { LabelModel } from "../models/labels";
import { urlBuilder } from "../utils/url-builder";

export async function listLabels(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;
  context.log("Serving all labels for project '%s'...", projectId);

  try {
    const { connectionString } = getStore();
    const labelModel = new LabelModel(context, connectionString, projectId);
    const labels = await labelModel.list();

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

  try {
    const { connectionString } = getStore();
    const labelModel = new LabelModel(context, connectionString, projectId);
    const projectModel = labelModel.projectModel;

    const label = await labelModel.get(labelSlug);
    const project = await projectModel.get(projectId);
    const builds = await projectModel.buildModel(projectId).list({
      filter: `PartitionKey eq '${labelSlug}'`,
    });

    const accept = request.headers.get("accept");

    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout title={label.value} breadcrumbs={[projectId, "Labels"]}>
          <>
            <RawDataPreview data={label} summary={"Label details"} />
            <BuildTable
              caption={`Builds (${builds.length})`}
              builds={builds}
              labels={undefined}
              project={project}
            />
          </>
        </DocumentLayout>
      );
    }

    return { status: 200, jsonBody: { ...label, builds } };
  } catch (error) {
    return responseError(error, context);
  }
}

export async function deleteLabel(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;

  try {
    const { connectionString } = getStore();
    const labelModel = new LabelModel(context, connectionString, projectId);
    await labelModel.delete(labelSlug);

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
    const labelModel = new LabelModel(context, connectionString, projectId);
    const { buildSHA: latestBuildSHA } = await labelModel.get(labelSlug);

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
