export function RawDataPreview({
  data,
  open,
  summary,
}: {
  data: unknown;
  open?: boolean;
  summary?: JSX.Element;
}) {
  if (summary) {
    return (
      <details open={open}>
        <summary>{summary}</summary>
        <pre safe class="raw-data">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    );
  }

  return (
    <pre safe class="raw-data">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
