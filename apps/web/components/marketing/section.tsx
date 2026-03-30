import { cn } from "@/lib/utils";

type MarketingSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export function MarketingSection({
  eyebrow,
  title,
  description,
  className,
  children,
}: MarketingSectionProps) {
  return (
    <section className={cn("w-full px-6 py-16 lg:px-10 xl:px-14", className)}>
      <div className="max-w-4xl">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-4 text-base text-muted">{description}</p> : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
