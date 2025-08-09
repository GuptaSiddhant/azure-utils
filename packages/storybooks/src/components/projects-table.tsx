import { getRequestStore } from "../utils/stores";
import type { StorybookProject } from "../utils/schemas";
import { Table } from "./table";
import { urlBuilder } from "../utils/constants";

export interface ProjectsTableProps {
  projects: Array<StorybookProject>;
}

export async function ProjectsTable({ projects }: ProjectsTableProps) {
  const { locale } = getRequestStore();

  return (
    <Table
      data={projects}
      columns={[
        {
          id: "id",
          header: "ID",
          cell: (item) => {
            return (
              <a safe href={urlBuilder.projectId(item.id)}>
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
