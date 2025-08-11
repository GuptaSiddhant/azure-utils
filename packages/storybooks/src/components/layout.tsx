import { DEFAULT_SERVICE_NAME, urlBuilder } from "../utils/constants";
import { getStore } from "../utils/store";
import { joinUrl } from "../utils/url-utils";

export function DocumentLayout({
  title,
  breadcrumbs = [],
  children,
  footer,
  header,
}: {
  title: string;
  breadcrumbs?: string[] | Array<{ label: string; href?: string }>;
  children: JSX.Element;
  footer?: JSX.Element | null;
  header?: JSX.Element | null;
}) {
  const safeStylesheet = globalStyleSheet();
  const store = getStore();

  return (
    <>
      {"<!DOCTYPE html>"}
      <html lang="en">
        <head>
          <title safe>
            {title} |{" "}
            {store.serviceName === DEFAULT_SERVICE_NAME
              ? "StoryBooks"
              : store.serviceName}
          </title>
          <style>{safeStylesheet}</style>
        </head>
        <body>
          <header>
            <div
              style={{
                borderRight: "1px solid var(--color-border)",
                paddingRight: "1rem",
              }}
            >
              <a href={urlBuilder.home()} title="Home">
                {store.serviceName === DEFAULT_SERVICE_NAME ? (
                  <strong
                    style={{
                      fontFamily: "monospace",
                      display: "block",
                      textAlign: "center",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    STORY
                    <br />
                    BOOKS
                  </strong>
                ) : (
                  <strong safe>{store.serviceName}</strong>
                )}
              </a>
            </div>

            <div class="page-heading" style={{ flex: 1 }}>
              {breadcrumbs.length > 0 ? (
                <ul>
                  {breadcrumbs.map((crumb, i, arr) => {
                    const href =
                      (typeof crumb === "object" ? crumb.href : "") ||
                      joinUrl(
                        store.url,
                        ...Array.from({ length: arr.length - i }).map(
                          () => ".."
                        )
                      );
                    return (
                      <li>
                        <a safe href={href}>
                          {typeof crumb === "object" ? crumb.label : crumb}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <div safe>{title}</div>
            </div>

            {header ? <div>{header}</div> : null}
          </header>
          <main>{children}</main>
          {footer ? <footer>{footer}</footer> : null}
        </body>
      </html>
    </>
  );
}

function globalStyleSheet() {
  return /*css*/ `
    :root {
      --color-bg-base: #f2f2f2;
      --color-bg-card: #ffffff;
      --color-text-primary: #09090b;
      --color-text-secondary: #71717b;
      --color-text-accent: #2b7fff;
      --color-border: #e4e4e7;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --color-bg-base: #09090b;
        --color-bg-card: #18181b;
        --color-text-primary: #fafafa;
        --color-text-secondary: #9f9fa9;
        --color-text-accent: #2b7fff;
        --color-border: #ffffff1a;
      }
    }

    * {
      box-sizing: border-box;
      color-scheme: light dark;
      font-family: system-ui;
      border-color: var(--color-border);
    }

    body {
      font-size: 1rem;
      padding: 0px;
      margin: 0px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: var(--color-bg-base);
      color: var(--color-text-secondary);
    }

    body > header,
    body > footer,
    body > main,
    body > aside {
      margin: 0 1rem;
      background-color: var(--color-bg-card);
      color: var(--color-text-primary);
      border-radius: 0.5rem;
      overflow: hidden;
      padding: 1rem;
    }

    body > header {
      margin-top: 1rem;      
      display: flex;
      align-items: center;      
      gap: 1rem;
    }

    body > main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow: auto;
    }

    body > footer {
      margin-bottom: 1rem;
    }

    hr {
      color: var(--color-border);
      background: var(--color-border);
      border-color: var(--color-border);
    }

    table {      
      height: 100%;
      width: 100%;
      border-radius: 0.25rem;
      overflow: hidden;
    }

    table caption {
      font-weight: bold;
      font-size: 1.25rem;
      padding: 0.5rem 1rem;            
      text-align: start;
    }

    thead {
      background-color: var(--color-bg-base);
      color: var(--color-text-secondary);
    }    

    th {
      color: var(--color-text-secondary);
      font-weight: medium;
      font-size: 0.9rem;
      text-align: start;
      padding: 0.25rem 1rem;
    }

    td {
      text-align: start;
      height: max-content;
      padding: 0.5rem 1rem;
      color: var(--color-text-primary);
    }

    time {
      font-family: monospace;
      font-size: 0.9rem;
      color: var(--color-text-secondary);
    }

    a,
    a:visited {
      color: var(--color-text-accent);
      text-decoration: none;
    }
    a:hover {
      color: var(--color-text-accent);
      text-decoration: underline;
    }

    .raw-data {
      margin: 0;
      background-color: #00000010;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.9rem;
      white-space: pre-wrap;
      padding: 0.5rem;
    }
      
    .page-heading {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-weight: bold;
    }

    .page-heading > ul {
      display: flex;
      align-items: center;
      padding: 0;
      margin: 0;
      list-style: none;
    }
    .page-heading > ul > li {      
      font-weight: normal;
      list-style: none;
      font-size: 0.9em;
    }
    .page-heading > ul > li::after {
      content: \"/\";
      color: inherit;
      margin: 0 0.5rem;
      opacity: 0.5;
    }

    .description {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }
  `.replace(/\s+/g, " ");
}
