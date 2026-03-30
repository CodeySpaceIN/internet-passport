import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-light public-atmosphere min-h-screen text-foreground [font-family:Inter,system-ui,Segoe_UI,Arial,sans-serif]">
      <MarketingNavbar />
      <div className="relative overflow-hidden">
        {children}
      </div>
      <MarketingFooter />
    </div>
  );
}
