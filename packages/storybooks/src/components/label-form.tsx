import { labelTypes, type LabelType } from "../models/labels";
import { urlBuilder } from "../utils/url-builder";
import { ErrorMessage } from "./error-message";

export interface LabelFormProps {
  projectId: string;
  label: LabelType | undefined;
}

export async function LabelForm({ label, projectId }: LabelFormProps) {
  return (
    <form
      hx-ext="response-targets"
      hx-patch={label ? urlBuilder.labelSlug(projectId, label.slug) : undefined}
      hx-post={label ? undefined : urlBuilder.allLabels(projectId)}
      hx-target-error="#form-error"
      style={{ maxWidth: "60ch" }}
    >
      <fieldset>
        <legend>Details</legend>

        {label ? <input type="hidden" name="slug" value={label.slug} /> : null}

        <div class="field">
          <label for="value">Label</label>
          <input id="value" name="value" required value={label?.value} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Type</legend>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "0.5rem",
          }}
        >
          {labelTypes.map((type) => {
            const id = `type-${type}`;
            return (
              <div>
                <input
                  id={id}
                  name="type"
                  type="radio"
                  required
                  value={type}
                  checked={type === label?.type}
                />
                <label for={id}>{type}</label>
              </div>
            );
          })}
        </div>

        <span class="description">
          Type of label defines behaviour of the label.
        </span>
      </fieldset>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button type="submit">{label ? "Update" : "Create"} Label</button>
        <button type="reset">Reset</button>
      </div>

      <ErrorMessage id="form-error" />
    </form>
  );
}
