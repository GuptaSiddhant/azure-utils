export type TableItem = Record<string, unknown>;

export type TableProps<T extends TableItem> = {
  data: T[];
  columns: TableColumn<NoInfer<T>>[];
};

export type TableColumn<T extends TableItem> = {
  id: keyof T | (string & {});
  header?: JSX.Element;
  cell?: (item: T) => JSX.Element | null;
};

export function Table<T extends TableItem>({ columns, data }: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th safe>{String(col.header || col.id)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => {
          return (
            <tr>
              {columns.map((col) => {
                if (col.cell) {
                  return <td safe>{col.cell(item)}</td>;
                }

                const value = item[col.id];
                if (!value) return <td />;

                if (typeof value === "object") {
                  return <td safe>{JSON.stringify(value)}</td>;
                }

                return <td safe>{String(value)}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
