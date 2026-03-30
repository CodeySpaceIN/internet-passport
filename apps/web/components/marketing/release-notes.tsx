import { SpotlightCard } from "@/components/ui/spotlight-card";

const notes = [
  {
    version: "v0.15.0",
    date: "2026-03-23",
    items: [
      "Developer docs expanded with API reference and integration guide.",
      "Launch readiness upgrades: error boundaries, toasts, health checks, and analytics placeholders.",
      "Core journey integration test script added for onboarding, verification, org/domain/agent, API keys, trust-check, and admin review.",
    ],
  },
  {
    version: "v0.14.0",
    date: "2026-03-18",
    items: [
      "Admin console workflows expanded for review queues, suspicious flags, and trust recalculation controls.",
      "Public trust profile routes and organization workspace management shipped.",
    ],
  },
];

export function ReleaseNotes() {
  return (
    <div className="space-y-4">
      {notes.map((entry) => (
        <SpotlightCard key={entry.version} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-semibold text-slate-900">{entry.version}</p>
            <p className="text-xs text-slate-500">{entry.date}</p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {entry.items.map((item) => (
              <li key={item} className="text-sm text-slate-700">
                - {item}
              </li>
            ))}
          </ul>
        </SpotlightCard>
      ))}
    </div>
  );
}
