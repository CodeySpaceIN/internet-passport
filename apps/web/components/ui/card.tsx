import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-card-border bg-card p-6 shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
