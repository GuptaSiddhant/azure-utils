export function globalStyleSheet() {
  return /*css*/ `
    :root {
      --color-bg-base: #f2f2f2;
      --color-bg-card: #ffffff;
      --color-text-primary: #1d1d1d;
      --color-text-secondary: #444444;
      --color-text-accent: #0040d9;
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
      padding: 1rem;
    }

    body > header {
      margin-top: 1rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: space-between;
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
      border: 1px solid #0008;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.9rem;
      white-space: pre-wrap;
      padding: 0.5rem;
    }

    .error-message {
      color: #ff0000;
      background-color: #ffe6e680;
      border-color: #ff0000;
    }

    .page-heading {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
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
