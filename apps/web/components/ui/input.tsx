import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-card-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-blue-500",
        className,
      )}
      {...props}
    />
  );
}
