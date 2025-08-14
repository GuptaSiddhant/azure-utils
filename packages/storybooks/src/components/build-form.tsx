import { CONTENT_TYPES } from "../utils/constants";
import { urlBuilder } from "../utils/url-builder";
import { ErrorMessage } from "./error-message";

export interface BuildFormProps {
  projectId: string;
}

export async function BuildForm({ projectId }: BuildFormProps) {
  return (
    <form
      hx-ext="response-targets"
      hx-post={urlBuilder.allBuilds(projectId)}
      hx-target-error="#form-error"
      style={{ maxWidth: "60ch" }}
      enctype={CONTENT_TYPES.FORM_MULTIPART}
    >
      <fieldset>
        <legend>Details</legend>

        <div class="field">
          <label for="sha">SHA</label>
          <input id="sha" name="sha" required />
        </div>

        <div class="field">
          <label for="message">Message</label>
          <input id="message" name="message" />
        </div>

        <div class="field">
          <label for="zipFile">Zip file</label>
          <input
            id="zipFile"
            name="zipFile"
            type="file"
            accept={CONTENT_TYPES.ZIP}
            required
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Author</legend>

        <div class="field">
          <label for="authorName">Name</label>
          <input id="authorName" name="authorName" required />
        </div>
        <div class="field">
          <label for="authorEmail">Email</label>
          <input id="authorEmail" name="authorEmail" required />
        </div>
      </fieldset>

      <fieldset>
        <legend>Labels</legend>

        {Array.from({ length: 4 }).map((_, i) => {
          const id = `label-${i}`;
          return (
            <div class="field">
              <label for={id}>Label {i + 1}</label>
              <input id={id} name="labels" required={i === 0} />
              {i === 0 ? <span class="description">Required</span> : null}
            </div>
          );
        })}
      </fieldset>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button type="submit">Upload build</button>
        <button type="reset">Reset</button>
      </div>

      <ErrorMessage id="form-error" />
    </form>
  );
}
