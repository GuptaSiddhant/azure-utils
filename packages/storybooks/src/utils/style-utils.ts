export function css(strings: TemplateStringsArray, ...values: unknown[]) {
  let fullStr = "";
  for (let i = 0; i <= strings.length; i++) {
    const str = strings[i];
    if (str) {
      fullStr += str;
    }

    const value = values[i];
    if (value) {
      fullStr += String(value);
    }
  }

  return fullStr.replace(/\s+/g, " ");
}

export function globalStyleSheet() {
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
