import { css } from "../../utils/style-utils";

export function DocumentLayout({
  title,
  children,
}: {
  title: string;
  children: JSX.Element;
}) {
  return (
    <>
      {"<!DOCTYPE html>"}
      <html lang="en">
        <head>
          <title safe>{title} | Storybooks</title>
          <style safe>{documentStylesheet()}</style>
        </head>
        <body>
          <header safe>Storybooks - {title}</header>
          <main>{children}</main>
          <footer></footer>
        </body>
      </html>
    </>
  );
}

function documentStylesheet() {
  return css`
    :root {
      --color-bg-base: #f2f2f2;
      --color-bg-card: #ffffff;
      --color-text-primary: #1d1d1d;
      --color-text-secondary: #444444;
    }

    * {
      box-sizing: border-box;
      color-scheme: light dark;
      font-family: system-ui;
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
    }

    body > header {
      margin-top: 1rem;
      padding: 1rem;
      font-weight: bold;
    }

    body > main {
      flex: 1;
    }

    body > footer {
      margin-bottom: 1rem;
      padding: 1rem;
    }
  `;
}
