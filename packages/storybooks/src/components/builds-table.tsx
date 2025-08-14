import { getStore } from "../utils/store";
import { Table } from "./table";
import { urlBuilder } from "../utils/url-builder";
import { BuildType } from "../models/builds";
import { ProjectType } from "../models/projects";
import { LabelType } from "../models/labels";

export interface BuildTableProps {
  caption?: JSX.Element;
  builds: Array<BuildType>;
  project: ProjectType;
  labels: LabelType[] | undefined;

  toolbar?: JSX.Element;
}

export async function BuildTable({
  caption,
  toolbar,
  builds,
  project,
}: BuildTableProps) {
  const { locale } = getStore();

  return (
    <Table
      caption={caption ?? `Builds (${builds.length})`}
      toolbar={toolbar}
      data={builds}
      columns={[
        {
          id: "sha",
          header: "SHA",
          cell: (item) => {
            return (
              <a safe href={urlBuilder.buildSHA(project.id, item.sha)}>
                {item.sha.slice(0, 7)}
              </a>
            );
          },
        },
        // labels
        //   ? {
        //       id: "labels",
        //       header: "Labels",
        //       cell: (item) => {
        //         return (
        //           <div safe>
        //             {item.labels.split(",").map((labelSlug, index, arr) => (
        //               <>
        //                 <a
        //                   safe
        //                   href={urlBuilder.labelSlug(project.id, labelSlug)}
        //                 >
        //                   {labels.find((label) => label.slug === labelSlug)
        //                     ?.value || labelSlug}
        //                 </a>
        //                 {index < arr.length - 1 ? ", " : ""}
        //               </>
        //             ))}
        //           </div>
        //         );
        //       },
        //     }
        //   : undefined,
        {
          id: "storybook",
          header: "Storybook",
          cell: (item) => {
            return (
              <div style={{ display: "flex", gap: "1rem" }}>
                <a
                  href={urlBuilder.storybookIndexHtml(project.id, item.sha)}
                  target="_blank"
                >
                  View
                </a>
                <a
                  href={urlBuilder.storybookZip(project.id, item.sha)}
                  target="_blank"
                  download={`storybook-${project.id}-${item.sha}.zip`}
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
                  href={urlBuilder.storybookTestReport(project.id, item.sha)}
                  target="_blank"
                >
                  Test Report
                </a>
                <a
                  href={urlBuilder.storybookCoverage(project.id, item.sha)}
                  target="_blank"
                >
                  Coverage
                </a>
              </div>
            );
          },
        },
        {
          id: "gitHub",
          header: "GitHub",
          cell: (item) => {
            return (
              <div style={{ display: "flex", gap: "1rem" }}>
                <a
                  href={urlBuilder.gitHub(
                    project.gitHubRepo,
                    "commit",
                    item.sha
                  )}
                  target="_blank"
                >
                  Commit
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
