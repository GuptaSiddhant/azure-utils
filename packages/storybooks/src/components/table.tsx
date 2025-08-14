export type TableItem = Record<string, unknown>;

export type TableProps<T extends TableItem> = {
  data: T[];
  columns: (TableColumn<NoInfer<T>> | undefined)[];
  caption?: JSX.Element;
  toolbar?: JSX.Element;
};

export type TableColumn<T extends TableItem> = {
  id: keyof T | (string & {});
  header?: JSX.Element;
  cell?: (item: T) => JSX.Element | null;
  style?: JSX.HtmlTag["style"];
};

export function Table<T extends TableItem>({
  caption: safeCaption,
  columns,
  data,
  toolbar: safeToolbar,
}: TableProps<T>) {
  const cols = columns.filter(Boolean) as TableColumn<T>[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          margin: 0,
          gap: "1rem",
        }}
      >
        {
          <div
            style={{
              fontSize: "1.25em",
              fontWeight: "bold",
              paddingLeft: "1rem",
            }}
          >
            {safeCaption}
          </div>
        }
        {<div>{safeToolbar}</div>}
      </div>
      <table style={{ flex: 1 }}>
        <thead>
          <tr>
            {cols.map((col) => (
              <th safe>{String(col.header || col.id)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            return (
              <tr>
                {cols.map((col) => {
                  const value = col.cell?.(item) || item[col.id];
                  if (!value) return <td />;

                  if (typeof value === "string") {
                    const safeValue = value;
                    return <td style={col.style}>{safeValue}</td>;
                  }

                  if (typeof value === "object") {
                    return (
                      <td safe style={col.style}>
                        {JSON.stringify(value)}
                      </td>
                    );
                  }

                  return (
                    <td safe style={col.style}>
                      {String(value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
