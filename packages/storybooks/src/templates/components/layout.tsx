import { globalStyleSheet } from "../../utils/style-utils";

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
          <style safe>{globalStyleSheet()}</style>
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
