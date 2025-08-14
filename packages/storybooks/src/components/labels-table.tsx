import { Table } from "./table";
import { urlBuilder } from "../utils/url-builder";
import { getStore } from "../utils/store";
import { LabelType } from "../models/labels";

export interface LabelsTableProps {
  caption?: JSX.Element;
  projectId: string;
  toolbar?: JSX.Element;
  labels: LabelType[];
}

export async function LabelsTable({
  labels,
  projectId,
  toolbar,
  caption,
}: LabelsTableProps) {
  const { locale } = getStore();

  return (
    <Table
      caption={caption ?? `Labels (${labels.length})`}
      data={labels}
      toolbar={toolbar}
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
