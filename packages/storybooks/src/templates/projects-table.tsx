import { getRequestStore } from "../utils/stores";
import type { StorybookProject } from "../utils/schemas";
import { joinUrl } from "../utils/url-utils";
import { Table } from "./components/table";

export interface ProjectsTableProps {
  projects: Array<StorybookProject>;
}

export async function ProjectsTable({ projects }: ProjectsTableProps) {
  const { locale, url } = getRequestStore();

  return (
    <Table
      data={projects}
      columns={[
        {
          id: "id",
          header: "ID",
          cell: (item) => {
            const href = joinUrl(url, item.id);
            return (
              <a safe href={href}>
                {item.id}
              </a>
            );
          },
        },
        { id: "name", header: "Name" },
        {
          id: "gitHubRepo",
          header: "GitHub",
          cell: (item) => {
            const href = new URL(item.gitHubRepo, "https://github.com");
            return (
              <a
                safe
                href={href.toString()}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.gitHubRepo}
              </a>
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
