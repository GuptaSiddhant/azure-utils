import type { StorybookLabel } from "../utils/schemas";
import { Table } from "./table";
import { urlBuilder } from "../utils/constants";
import { getRequestStore } from "../utils/stores";

export interface LabelsTableProps {
  projectId: string;
  labels: StorybookLabel[];
}

export async function LabelsTable({ labels, projectId }: LabelsTableProps) {
  const { locale } = getRequestStore();

  return (
    <Table
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
