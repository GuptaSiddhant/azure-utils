import { getRequestStore } from "../utils/stores";
import type { StorybookBuild, StorybookProject } from "../utils/schemas";
import { Table } from "./table";
import { urlBuilder } from "../utils/constants";

export interface BuildTableProps {
  builds: Array<StorybookBuild>;
  project?: StorybookProject;
}

export async function BuildTable({ builds }: BuildTableProps) {
  const { locale } = getRequestStore();

  return (
    <Table
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
        { id: "message", header: "Message" },
        { id: "labels", header: "Labels" },
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
