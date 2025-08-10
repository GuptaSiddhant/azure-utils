export function ErrorMessage({ children }: { children: string }) {
  return (
    <pre class="error-message raw-data" safe>
      {children.includes("{")
        ? JSON.stringify(JSON.parse(children), null, 2)
        : children}
    </pre>
  );
}
