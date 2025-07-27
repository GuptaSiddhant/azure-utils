import { responseError } from "../utils/error-utils";
import type {
  ServeFnOptions,
  StorybooksRouterHttpHandler,
} from "../utils/types";
import { serveFile } from "../utils/serve-file";
import { serveProjects } from "../utils/serve-projects";
import { serveCommits } from "../utils/serve-commits";
import { serveCommit } from "../utils/serve-commit";

export const serveStorybookHandler: StorybooksRouterHttpHandler =
  (options) => async (request, context) => {
    const { path = "" } = request.params;
    const [project, commitSha, ...filepath] = path.split("/");

    const serveFnOptions: ServeFnOptions = {
      context,
      options,
      request,
    };

    if (!project) {
      return await serveProjects(serveFnOptions);
    }

    if (!commitSha) {
      return await serveCommits(serveFnOptions, project);
    }

    if (!filepath.length || !filepath[0]) {
      return await serveCommit(serveFnOptions, project, commitSha);
    }

    try {
      return await serveFile(
        serveFnOptions,
        project,
        commitSha,
        filepath.join("/")
      );
    } catch (error) {
      return responseError(error, context);
    }
  };
