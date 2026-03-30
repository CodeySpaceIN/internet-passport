import { cn } from "@/lib/utils";

type AsymmetricShellProps = {
  rail: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AsymmetricShell({ rail, children, className }: AsymmetricShellProps) {
  return (
    <main className={cn("w-full px-6 py-14 lg:px-10 xl:px-14", className)}>
      <div className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">{rail}</aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
