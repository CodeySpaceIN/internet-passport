import { StatusChip } from "@/components/app/status-chip";
import { TrustCardShareQr } from "@/components/public/trust-card-share-qr";
import type { PublicTrustViewModel } from "@/lib/data/public-trust";

export function PublicTrustCardView({
  card,
  canonicalUrl,
}: {
  card: PublicTrustViewModel;
  canonicalUrl: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Internet Passport</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {card.displayName ?? "Public trust profile"}
          </h1>
          <p className="mt-1 font-mono text-sm text-slate-600">@{card.handle}</p>
          {card.summary ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700">{card.summary}</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <TrustCardShareQr value={canonicalUrl} />
          <p className="mt-2 text-center text-[11px] text-slate-500">Share-ready card</p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Trust status</p>
          {card.trustTier ? (
            <div className="mt-2 flex items-center gap-2">
              <StatusChip value={card.trustTier} />
              {typeof card.trustScore === "number" ? <span className="text-sm font-medium text-slate-800">Score {card.trustScore}</span> : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Not publicly shared</p>
          )}
          {card.organizationAssociation ? (
            <p className="mt-3 text-sm text-slate-700">Associated organization: {card.organizationAssociation}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Verification badges</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {card.verificationBadges.length > 0 ? (
              card.verificationBadges.map((badge) => <StatusChip key={badge} value={badge} />)
            ) : (
              <p className="text-sm text-slate-500">No public badges</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Linked public identities</p>
          {card.linkedPublicIdentities.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {card.linkedPublicIdentities.map((identity) => (
                <li key={identity}>- {identity}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No public identities</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Public claims</p>
          {card.publicClaims.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {card.publicClaims.map((claim) => (
                <li key={claim}>- {claim}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No public claims</p>
          )}
        </div>
      </section>
    </article>
  );
}

export function PublicTrustUnavailable({ handle }: { handle: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Public trust card</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Profile unavailable</h1>
      <p className="mt-3 text-sm text-slate-600">
        The trust card for <span className="font-mono">@{handle}</span> is not currently published.
      </p>
    </div>
  );
}
