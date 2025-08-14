import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { responseError, responseHTML } from "../utils/response-utils";
import { CONTENT_TYPES, urlBuilder } from "../utils/constants";
import { DocumentLayout } from "../components/layout";
import { RawDataPreview } from "../components/raw-data";
import { getStore } from "../utils/store";
import { urlSearchParamsToObject } from "../utils/url-utils";
import { BuildTable } from "../components/builds-table";
import { validateBuildUploadBody } from "../utils/validators";
import { uploadZipWithDecompressed } from "../utils/upload-utils";
import { BuildModel, BuildUploadSchema } from "../models/builds";

export async function listBuilds(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;
  context.log("Serving all builds for project '%s'...", projectId);

  try {
    const { connectionString } = getStore();
    const buildModel = new BuildModel(context, connectionString, projectId);
    const builds = await buildModel.list();

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      const projectModel = buildModel.projectModel;
      const project = await projectModel.get(projectId);
      const labels = await projectModel.labelModel(projectId).list();

      return responseHTML(
        <DocumentLayout title="All Builds" breadcrumbs={[projectId]}>
          <BuildTable
            builds={builds}
            labels={labels}
            project={project}
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
    const buildModel = new BuildModel(context, connectionString, projectId);
    const build = await buildModel.get(buildSHA);

    const accept = request.headers.get("accept");
    if (accept?.includes(CONTENT_TYPES.HTML)) {
      return responseHTML(
        <DocumentLayout
          breadcrumbs={[projectId, "Builds"]}
          title={
            build.message
              ? `[${build.sha.slice(0, 7)}] ${build.message}`
              : buildSHA.slice(0, 7)
          }
        >
          <>
            <RawDataPreview data={build} summary={"Build details"} open />
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

    return { status: 200, jsonBody: build };
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
    const buildModel = new BuildModel(context, connectionString, projectId);
    await buildModel.delete(buildSHA);

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

  const buildModel = new BuildModel(context, connectionString, projectId);

  if (!(await buildModel.projectModel.has(projectId))) {
    return responseError(
      `The project '${projectId}' does not exist.`,
      context,
      404
    );
  }

  context.log("Uploading build for project '%s'...", projectId);

  const queryParseResult = BuildUploadSchema.safeParse(
    urlSearchParamsToObject(request.query)
  );
  if (!queryParseResult.success) {
    return responseError(queryParseResult.error, context, 400);
  }
  const buildUploadData = queryParseResult.data;

  const bodyValidationResponse = validateBuildUploadBody(request, context);
  if (typeof bodyValidationResponse === "object") {
    return bodyValidationResponse;
  }

  try {
    const response = await uploadZipWithDecompressed(
      context,
      request,
      connectionString,
      projectId,
      buildUploadData.sha
    );
    if (response) {
      return response;
    }

    await buildModel.create(buildUploadData);

    return { status: 202 };
  } catch (error) {
    return responseError(error, context);
  }
}
