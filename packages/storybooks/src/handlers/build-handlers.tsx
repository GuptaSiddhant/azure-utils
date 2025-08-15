import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import {
  responseError,
  responseHTML,
  responseRedirect,
} from "#utils/response-utils";
import { DocumentLayout } from "#components/layout";
import { RawDataPreview } from "#components/raw-data";
import { urlSearchParamsToObject } from "#utils/url-utils";
import { BuildTable } from "#components/builds-table";
import { validateBuildUploadZipBody } from "#utils/validators";
import { uploadZipWithDecompressed } from "#utils/upload-utils";
import { urlBuilder } from "#utils/url-builder";
import {
  checkIsHTMLRequest,
  checkIsHXRequest,
  checkIsNewMode,
} from "#utils/request-utils";
import { BuildForm } from "#components/build-form";
import { CONTENT_TYPES, QUERY_PARAMS } from "#utils/constants";
import { BuildSHAModel, BuildsModel } from "#builds/model";
import { ProjectIdModel } from "#projects/model";
import { LabelsModel } from "#labels/model";
import { BuildUploadFormSchema, BuildUploadSchema } from "#builds/schema";

export async function listBuilds(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;

  try {
    if (checkIsNewMode()) {
      return responseHTML(
        <DocumentLayout
          title="Upload Build"
          breadcrumbs={[
            { label: projectId, href: urlBuilder.projectId(projectId) },
            { label: "Builds", href: urlBuilder.allBuilds(projectId) },
          ]}
        >
          <BuildForm projectId={projectId} />
        </DocumentLayout>
      );
    }

    const buildModel = new BuildsModel(projectId);
    const builds = await buildModel.list();

    if (checkIsHTMLRequest()) {
      const project = await new ProjectIdModel(projectId).get();
      const labels = await new LabelsModel(projectId).list();

      return responseHTML(
        <DocumentLayout
          title="All Builds"
          breadcrumbs={[projectId]}
          toolbar={<a href={urlBuilder.buildUpload(projectId)}>Upload</a>}
        >
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
    return responseError(error);
  }
}

export async function getBuild(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "", buildSHA = "" } = request.params;
  const labelSlug = request.query.get(QUERY_PARAMS.labelSlug) || undefined;

  try {
    const buildModel = new BuildSHAModel(projectId, buildSHA);
    const build = await buildModel.get(labelSlug);

    if (checkIsHTMLRequest()) {
      return responseHTML(
        <DocumentLayout
          breadcrumbs={[projectId, "Builds"]}
          title={
            build.message
              ? `[${build.sha.slice(0, 7)}] ${build.message}`
              : buildSHA.slice(0, 7)
          }
          toolbar={
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <form
                hx-delete={request.url}
                hx-confirm="Are you sure about deleting the build?"
              >
                <button>Delete</button>
              </form>
            </div>
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
    return responseError(error);
  }
}

export async function deleteBuild(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "", buildSHA = "" } = request.params;

  try {
    const buildModel = new BuildSHAModel(projectId, buildSHA);
    await buildModel.delete();

    const buildsUrl = urlBuilder.allBuilds(projectId);
    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(buildsUrl, 303);
    }

    return { status: 204, headers: { Location: buildsUrl } };
  } catch (error) {
    return responseError(error);
  }
}

export async function uploadBuild(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const { projectId = "" } = request.params;
    const buildsModel = new BuildsModel(projectId);

    if (!(await buildsModel.projectModel.has())) {
      return responseError(`The project '${projectId}' does not exist.`, 404);
    }

    const contentType = request.headers.get("content-type");
    if (contentType?.includes(CONTENT_TYPES.ZIP)) {
      const buildUploadData = BuildUploadSchema.parse(
        urlSearchParamsToObject(request.query)
      );
      const bodyValidationResponse = validateBuildUploadZipBody(request);
      if (bodyValidationResponse) {
        return bodyValidationResponse;
      }
      const uploadResponse = await uploadZipWithDecompressed(
        projectId,
        buildUploadData.sha
      );
      if (uploadResponse) {
        return uploadResponse;
      }
      await buildsModel.create(buildUploadData);

      const buildUrl = urlBuilder.buildSHA(projectId, buildUploadData.sha);
      if (checkIsHTMLRequest() || checkIsHXRequest()) {
        return responseRedirect(buildUrl, 303);
      }

      return { status: 202 };
    }

    if (contentType?.includes(CONTENT_TYPES.FORM_MULTIPART)) {
      const { zipFile, ...buildUploadData } = BuildUploadFormSchema.parse(
        urlSearchParamsToObject(await request.formData())
      );
      const uploadResponse = await uploadZipWithDecompressed(
        projectId,
        buildUploadData.sha,
        zipFile
      );
      if (uploadResponse) {
        return uploadResponse;
      }
      await buildsModel.create(buildUploadData);

      const buildUrl = urlBuilder.buildSHA(projectId, buildUploadData.sha);
      if (checkIsHTMLRequest() || checkIsHXRequest()) {
        return responseRedirect(buildUrl, 303);
      }

      return { status: 202 };
    }

    return responseError(
      `Invalid content type, expected ${CONTENT_TYPES.ZIP} or ${CONTENT_TYPES.FORM_MULTIPART}.`,
      415
    );
  } catch (error) {
    return responseError(error);
  }
}
