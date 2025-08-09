import { StorybookProjectTableEntity } from "../utils/types";
import { DocumentLayout } from "./components/layout";
import { Table } from "./components/table";

export interface ProjectsTemplateProps {
  basePathname: string;
  projects: Array<StorybookProjectTableEntity>;
}

export async function ProjectsTemplate({
  projects,
  basePathname,
}: ProjectsTemplateProps) {
  return (
    <DocumentLayout title="Projects">
      <Table
        data={projects}
        columns={[
          {
            id: "name",
            header: "Name",
            cell: (item) => {
              const href = [...basePathname.split("/"), item.rowKey]
                .join("/")
                .replace(/\/+/g, "/");
              return (
                <a safe href={href}>
                  {item.name ?? item.rowKey}
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
                  {new Date(item.timestamp).toISOString()}
                </time>
              );
            },
          },
        ]}
      />
    </DocumentLayout>
  );
}
