import { getRequestStore } from "../utils/stores";
import type {
  StorybookBuild,
  StorybookLabel,
  StorybookProject,
} from "../utils/schemas";
import { Table } from "./table";
import { urlBuilder } from "../utils/constants";

export interface BuildTableProps {
  caption?: JSX.Element;
  builds: Array<StorybookBuild>;
  project?: StorybookProject;
  labels: StorybookLabel[] | undefined;
}

export async function BuildTable({
  caption = "Builds",
  builds,
  labels,
}: BuildTableProps) {
  const { locale } = getRequestStore();

  return (
    <Table
      caption={caption}
      data={builds}
      columns={[
        {
          id: "sha",
          header: "SHA",
          cell: (item) => {
            return (
              <a safe href={urlBuilder.buildSHA(item.project, item.sha)}>
                {item.sha}
              </a>
            );
          },
        },
        labels
          ? {
              id: "labels",
              header: "Labels",
              cell: (item) => {
                return (
                  <div>
                    {item.labels.split(",").map((labelSlug, index, arr) => (
                      <>
                        <a
                          safe
                          href={urlBuilder.labelSlug(item.project, labelSlug)}
                        >
                          {labels.find((label) => label.slug === labelSlug)
                            ?.value || labelSlug}
                        </a>
                        {index < arr.length - 1 ? ", " : ""}
                      </>
                    ))}
                  </div>
                );
              },
            }
          : undefined,
        {
          id: "storybook",
          header: "Storybook",
          cell: (item) => {
            return (
              <div style={{ display: "flex", gap: "1rem" }}>
                <a
                  href={urlBuilder.storybookIndexHtml(item.project, item.sha)}
                  target="_blank"
                >
                  View
                </a>
                <a
                  href={urlBuilder.storybookZip(item.project, item.sha)}
                  target="_blank"
                  download={`storybook-${item.project}-${item.sha}.zip`}
                >
                  Download
                </a>
              </div>
            );
          },
        },
        {
          id: "test",
          header: "Tests",
          cell: (item) => {
            return (
              <div style={{ display: "flex", gap: "1rem" }}>
                <a
                  href={urlBuilder.storybookTestReport(item.project, item.sha)}
                  target="_blank"
                >
                  Test Report
                </a>
                <a
                  href={urlBuilder.storybookCoverage(item.project, item.sha)}
                  target="_blank"
                >
                  Coverage
                </a>
              </div>
            );
          },
        },
        { id: "message", header: "Message" },
        {
          id: "authorName",
          header: "Author",
          cell: (item) => (
            <span safe title={item.authorEmail}>
              {item.authorName || "Unknown"}
            </span>
          ),
        },
        {
          id: "timestamp",
          header: "Last modified",
          cell: (item) => {
            if (!item.timestamp) {
              return null;
            }

            return (
              <time datetime={item.timestamp} safe>
                {new Date(item.timestamp).toLocaleString(locale)}
              </time>
            );
          },
        },
      ]}
    />
  );
}
