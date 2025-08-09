export function RawDataPreview({ data }: { data: unknown }) {
  return (
    <pre safe class="raw-data">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
