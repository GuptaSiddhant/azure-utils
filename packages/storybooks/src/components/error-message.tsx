export function ErrorMessage({
  children = "",
  id,
}: {
  id?: string;
  children?: string;
}) {
  return (
    <pre
      id={id}
      class="error-message raw-data"
      style={{ background: "#ff000020" }}
      safe
    >
      {children.includes("{")
        ? JSON.stringify(JSON.parse(children), null, 2)
        : children}
    </pre>
  );
}
