export function ErrorMessage({ children }: { children: string }) {
  return (
    <pre
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
