import { getRequestStore } from "../utils/stores";
import type { StorybookBuild, StorybookProject } from "../utils/schemas";
import { joinUrl } from "../utils/url-utils";
import { Table } from "./components/table";

export interface BuildTableProps {
  builds: Array<StorybookBuild>;
  project?: StorybookProject;
}

export async function BuildTable({ builds }: BuildTableProps) {
  const { locale, url } = getRequestStore();

  return (
    <Table
      data={builds}
      columns={[
        {
          id: "sha",
          header: "SHA",
          cell: (item) => {
            const href = joinUrl(url, item.sha);
            return (
              <a safe href={href}>
                {item.sha}
              </a>
            );
          },
        },
        { id: "message", header: "Message" },
        { id: "labels", header: "Labels" },
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
