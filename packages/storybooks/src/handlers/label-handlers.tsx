import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  responseError,
  responseHTML,
  responseRedirect,
} from "#utils/response-utils";
import { DocumentLayout } from "#components/layout";
import { RawDataPreview } from "#components/raw-data";
import { BuildTable } from "#components/builds-table";
import { LabelsTable } from "#components/labels-table";
import { urlBuilder } from "#utils/url-builder";
import {
  checkIsEditMode,
  checkIsHTMLRequest,
  checkIsHXRequest,
  checkIsNewMode,
} from "#utils/request-utils";
import { LabelForm } from "#components/label-form";
import { CONTENT_TYPES } from "#utils/constants";
import { urlSearchParamsToObject } from "#utils/url-utils";
import { LabelSlugModel, LabelsModel } from "#labels/model";
import { BuildsModel } from "#builds/model";

export async function listLabels(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "" } = request.params;

  try {
    if (checkIsNewMode()) {
      return responseHTML(
        <DocumentLayout
          title="Create Label"
          breadcrumbs={[
            { label: projectId, href: urlBuilder.projectId(projectId) },
            { label: "Labels", href: urlBuilder.allLabels(projectId) },
          ]}
        >
          <LabelForm projectId={projectId} label={undefined} />
        </DocumentLayout>
      );
    }

    const labelModel = new LabelsModel(projectId);
    const labels = await labelModel.list();

    if (checkIsHTMLRequest()) {
      return responseHTML(
        <DocumentLayout
          title="All Labels"
          breadcrumbs={[projectId]}
          toolbar={<a href={urlBuilder.labelCreate(projectId)}>+ Create</a>}
        >
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
    return responseError(error);
  }
}

export async function createLabel(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const { projectId = "" } = request.params;
    const labelsModel = new LabelsModel(projectId);

    if (!(await labelsModel.projectModel.has())) {
      return responseError(`The project '${projectId}' does not exist.`, 404);
    }

    const contentType = request.headers.get("content-type");
    if (!contentType) {
      return responseError("Content-Type header is required", 400);
    }
    if (!contentType.includes(CONTENT_TYPES.FORM_ENCODED)) {
      return responseError(
        `Invalid Content-Type, expected ${CONTENT_TYPES.FORM_ENCODED}`,
        415
      );
    }

    const data = await labelsModel.create(
      urlSearchParamsToObject(await request.formData())
    );

    const labelUrl = urlBuilder.labelSlug(
      projectId,
      LabelsModel.createSlug(data.value)
    );

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(labelUrl, 303);
    }

    return {
      status: 201,
      headers: { Location: labelUrl },
      jsonBody: { data, links: { self: labelUrl } },
    };
  } catch (error) {
    return responseError(error);
  }
}

export async function getLabel(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;

  try {
    const labelModel = new LabelSlugModel(projectId, labelSlug);
    const label = await labelModel.get();

    if (checkIsEditMode()) {
      return responseHTML(
        <DocumentLayout
          title="Edit Label"
          breadcrumbs={[
            { label: projectId, href: urlBuilder.projectId(projectId) },
            { label: "Labels", href: urlBuilder.allLabels(projectId) },
            {
              label: label.slug,
              href: urlBuilder.labelSlug(projectId, labelSlug),
            },
          ]}
        >
          <LabelForm projectId={projectId} label={label} />
        </DocumentLayout>
      );
    }

    const projectModel = labelModel.projectModel;
    const project = await projectModel.get();
    const builds = await new BuildsModel(projectId).list({
      filter: `PartitionKey eq '${labelSlug}'`,
    });

    if (checkIsHTMLRequest()) {
      return responseHTML(
        <DocumentLayout
          title={`[${label.type}] ${label.value}`}
          breadcrumbs={[projectId, "Labels"]}
          toolbar={
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <a href={urlBuilder.labelSlugEdit(projectId, labelSlug)}>Edit</a>
              <form
                hx-delete={request.url}
                hx-confirm="Are you sure about deleting the label?"
              >
                <button>Delete</button>
              </form>
            </div>
          }
        >
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

    return { status: 202, jsonBody: { ...label, builds } };
  } catch (error) {
    return responseError(error);
  }
}

export async function updateLabel(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;

  try {
    const contentType = request.headers.get("content-type");
    if (!contentType) {
      return responseError("Content-Type header is required", 400);
    }
    if (!contentType.includes(CONTENT_TYPES.FORM_ENCODED)) {
      return responseError(
        `Invalid Content-Type, expected ${CONTENT_TYPES.FORM_ENCODED}`,

        415
      );
    }

    const labelModel = new LabelSlugModel(projectId, labelSlug);
    await labelModel.update(urlSearchParamsToObject(await request.formData()));

    const labelUrl = urlBuilder.labelSlug(projectId, labelSlug);

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(request.url, 303);
    }

    return {
      status: 202,
      headers: { Location: labelUrl },
      jsonBody: {
        data: await labelModel.get(),
        links: { self: request.url },
      },
    };
  } catch (error) {
    return responseError(error);
  }
}

export async function deleteLabel(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const { projectId = "", labelSlug = "" } = request.params;

  try {
    const labelModel = new LabelSlugModel(projectId, labelSlug);
    await labelModel.delete();

    const labelsUrl = urlBuilder.allLabels(projectId);

    if (checkIsHTMLRequest() || checkIsHXRequest()) {
      return responseRedirect(labelsUrl, 303);
    }

    return { status: 204, headers: { Location: labelsUrl } };
  } catch (error) {
    return responseError(error);
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
    const labelModel = new LabelSlugModel(projectId, labelSlug);
    const { buildSHA: latestBuildSHA } = await labelModel.get();

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
    return responseError(error);
  }
}
