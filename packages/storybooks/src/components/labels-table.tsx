import type { StorybookLabel } from "../utils/schemas";
import { Table } from "./table";
import { urlBuilder } from "../utils/constants";
import { getStore } from "../utils/store";

export interface LabelsTableProps {
  caption?: JSX.Element;
  projectId: string;
  labels: StorybookLabel[];
}

export async function LabelsTable({
  labels,
  projectId,
  caption = "Labels",
}: LabelsTableProps) {
  const { locale } = getStore();

  return (
    <Table
      caption={caption}
      data={labels}
      columns={[
        {
          id: "slug",
          header: "Slug",
          cell: (item) => {
            return (
              <a safe href={urlBuilder.labelSlug(projectId, item.slug)}>
                {item.slug}
              </a>
            );
          },
        },
        {
          id: "value",
          header: "Label",
        },
        {
          id: "build",
          header: "Latest build",
          cell: (item) => {
            if (!item.buildSHA) {
              return <span class="description">No build available</span>;
            }

            return (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <span safe style={{ fontFamily: "monospace" }}>
                  [{item.buildSHA.slice(0, 7)}]
                </span>
                <a href={urlBuilder.buildSHA(projectId, item.buildSHA)}>
                  Build
                </a>
                <a
                  href={urlBuilder.storybookIndexHtml(projectId, item.buildSHA)}
                >
                  Storybook
                </a>
              </div>
            );
          },
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
