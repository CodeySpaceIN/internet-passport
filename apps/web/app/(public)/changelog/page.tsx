import { AsymmetricShell } from "@/components/marketing/asymmetric-shell";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { ReleaseNotes } from "@/components/marketing/release-notes";

export default function ChangelogPage() {
  return (
    <AsymmetricShell
      className="pt-24 pb-16"
      rail={
        <SpotlightCard className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Changelog</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Release notes</h1>
          <p className="mt-3 text-sm text-slate-600">
            Transparent shipping history focused on trust infrastructure quality and reliability.
          </p>
        </SpotlightCard>
      }
    >
      <ReleaseNotes />
    </AsymmetricShell>
  );
}
