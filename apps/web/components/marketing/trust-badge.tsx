import { ShieldCheck } from "lucide-react";

type TrustBadgeProps = {
  label: string;
  className?: string;
};

export function TrustBadge({ label, className }: TrustBadgeProps) {
  return (
    <span className={`trust-badge ${className ?? ""}`}>
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
