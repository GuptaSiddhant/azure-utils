import { getStore } from "../utils/store";
import type { StorybookProject } from "../utils/schemas";
import { Table } from "./table";
import { urlBuilder } from "../utils/constants";

export interface ProjectsTableProps {
  caption?: string;
  projects: Array<StorybookProject>;
}

export async function ProjectsTable({
  caption = "Projects",
  projects,
}: ProjectsTableProps) {
  const { locale, defaultGitHubBranch } = getStore();

  return (
    <Table
      caption={caption}
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
          id: "gitHub",
          header: "GitHub",
          cell: (item) => {
            const pathnames = item.gitHubPath
              ? ["tree", defaultGitHubBranch, item.gitHubPath]
              : [];
            const href = urlBuilder.gitHub(item, ...pathnames);

            return (
              <a safe href={href} target="_blank" rel="noopener noreferrer">
                {item.gitHubRepo}
              </a>
            );
          },
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
                <a href={urlBuilder.buildSHA(item.id, item.buildSHA)}>Build</a>
                <a href={urlBuilder.storybookIndexHtml(item.id, item.buildSHA)}>
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
