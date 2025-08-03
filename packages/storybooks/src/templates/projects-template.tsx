import { css } from "../utils/style-utils";
import { StorybookTableEntity } from "../utils/types";
import { DocumentLayout } from "./components/layout";

export interface ProjectsTemplateProps {
  basePathname: string;
  projects: Array<StorybookTableEntity>;
}

export async function ProjectsTemplate({
  projects,
  basePathname,
}: ProjectsTemplateProps) {
  console.log({ basePathname });

  return (
    <DocumentLayout title="Projects">
      <table>
        <style safe>{templateStylesheet()}</style>
        <thead>
          <tr>
            <th>Name</th>
            <th>Last modified</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const href = [...basePathname.split("/"), project.rowKey].join("/");

            return (
              <tr>
                <td>
                  <a safe href={href}>
                    {project.rowKey}
                  </a>
                </td>
                <td>{"N/A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DocumentLayout>
  );
}

function templateStylesheet() {
  return css`
table {  
  padding: 0.5rem;
  width: 100%;  
  border-radius: 0.25rem;    
}

thead {
  background-color: var(--color-bg-base);
  color: var(--color-text-secondary);
}

th {
  color: var(--color-text-secondary)
  font-weight: medium;
  text-align: start;
  padding: 0.25rem 0.5rem;
  }
  
td {
  text-align: start;
  padding: 0.5rem;
  color: var(--color-text-primary)
}
  `;
}
