import { getRequestStore } from "../utils/stores";
import { globalStyleSheet } from "../utils/style-utils";
import { joinUrl } from "../utils/url-utils";

export function DocumentLayout({
  title,
  breadcrumbs = [],
  children,
}: {
  title: string;
  breadcrumbs?: string[] | Array<{ label: string; href?: string }>;
  children: JSX.Element;
}) {
  const safeStylesheet = globalStyleSheet();
  const store = getRequestStore();

  return (
    <>
      {"<!DOCTYPE html>"}
      <html lang="en">
        <head>
          <title safe>{title} | Storybooks</title>
          <style>{safeStylesheet}</style>
        </head>
        <body>
          <header>
            <div class="page-heading">
              {breadcrumbs.length > 0 ? (
                <ul>
                  {breadcrumbs.map((crumb, i, arr) => {
                    const href =
                      (typeof crumb === "object" ? crumb.href : "") ||
                      joinUrl(
                        store.url,
                        ...Array.from({ length: arr.length - i }).map(
                          () => ".."
                        )
                      );
                    return (
                      <li>
                        <a safe href={href}>
                          {typeof crumb === "object" ? crumb.label : crumb}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <div safe>{title}</div>
            </div>
            <div>
              <strong>
                STORY
                <br />
                BOOKS
              </strong>
            </div>
          </header>
          <main>{children}</main>
          <footer></footer>
        </body>
      </html>
    </>
  );
}
