import clsx from "clsx";
import Card from "./Card";

export default function Header({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <Card as="header" className={clsx(className)}>
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center justify-between">
        <a href="#" className="font-bold ">
          Azure Feature Flags
        </a>

        {children}
      </div>
    </Card>
  );
}
