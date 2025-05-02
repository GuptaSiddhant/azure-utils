import clsx from "clsx";
import Card from "./Card";

export default function Footer({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <Card
      as="footer"
      className={clsx("text-gray-500 text-center justify-between", className)}
    >
      {children}

      <ul className="flex gap-2 justify-between ">
        <li>
          <a
            className="text-blue-500"
            target="_blank"
            href="https://github.com/guptasiddhant/azure-utils/"
          >
            <img
              alt="GitHub Tag"
              src="https://img.shields.io/github/v/tag/GuptaSiddhant/azure-utils?label=GitHub"
            />
          </a>
        </li>
        <li>
          <a
            href="https://www.npmjs.com/package/@azure-utils/feature-flags"
            target="_blank"
          >
            <img
              alt="NPM Version"
              src="https://img.shields.io/npm/v/@azure-utils/feature-flags"
            />
          </a>
        </li>
        <li>
          <a href="https://jsr.io/@azure-utils/feature-flags" target="_blank">
            <img
              src="https://jsr.io/badges/@azure-utils/feature-flags"
              alt="Azure Feature Flags on JSR"
            />
          </a>
        </li>
      </ul>

      <span>© 2024 Siddhant Gupta</span>
    </Card>
  );
}
