"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { StatusChip } from "@/components/app/status-chip";
import { useToast } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics/client";
import {
  createDeveloperApiKeyAction,
  revokeDeveloperApiKeyAction,
  type ApiKeyActionState,
} from "@/app/app/api/actions";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  organizationId: string | null;
};

type OrganizationOption = {
  id: string;
  name: string;
};

const initialState: ApiKeyActionState = { ok: true };

export function DeveloperApiManager({
  apiKeys,
  organizations,
}: {
  apiKeys: ApiKeyRow[];
  organizations: OrganizationOption[];
}) {
  const [state, createAction] = useActionState(createDeveloperApiKeyAction, initialState);
  const { showToast } = useToast();
  const lastSecretRef = useRef<string | undefined>(undefined);
  const lastErrorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      showToast({
        kind: "error",
        title: "API key creation failed",
        description: state.error,
      });
      trackEvent("developer_api_key.create_failed");
      lastErrorRef.current = state.error;
      return;
    }
    if (state.createdSecret && state.createdSecret !== lastSecretRef.current) {
      showToast({
        kind: "success",
        title: "API key created",
        description: state.createdPrefix
          ? `Prefix ${state.createdPrefix} is now active.`
          : "New key is active now.",
      });
      trackEvent("developer_api_key.created", {
        keyPrefix: state.createdPrefix,
      });
      lastSecretRef.current = state.createdSecret;
    }
  }, [showToast, state]);

  const revokeActionWithTracking = async (formData: FormData) => {
    await revokeDeveloperApiKeyAction(formData);
    showToast({
      kind: "info",
      title: "API key revoked",
      description: "The key can no longer access protected developer endpoints.",
    });
    trackEvent("developer_api_key.revoked");
  };

  return (
    <div className="space-y-4">
      <form action={createAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
        <label className="text-xs text-slate-600 md:col-span-1">
          Key name
          <input
            name="name"
            required
            placeholder="Production API key"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs text-slate-600 md:col-span-2">
          Scopes (comma-separated)
          <input
            name="scopes"
            defaultValue="trust:read,trust:check,actions:verify"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs text-slate-600 md:col-span-1">
          Organization (optional)
          <select
            name="organizationId"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            defaultValue=""
          >
            <option value="">Tenant-wide</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white md:col-span-4 md:w-fit">
          Create API key
        </button>
      </form>

      {state.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      ) : null}

      {state.createdSecret ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">Secret shown once</p>
          <p className="mt-2 font-mono text-sm text-emerald-900">{state.createdSecret}</p>
          <p className="mt-2 text-xs text-emerald-700">
            Save it now. Only hashed value is stored after creation.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Prefix</th>
              <th className="px-2 py-2">Scopes</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Last used</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((key) => (
              <tr key={key.id} className="border-b border-slate-100">
                <td className="px-2 py-2 font-medium text-slate-900">{key.name}</td>
                <td className="px-2 py-2 font-mono text-xs text-slate-700">{key.keyPrefix}</td>
                <td className="px-2 py-2 text-slate-700">{key.scopes.join(", ")}</td>
                <td className="px-2 py-2">
                  <StatusChip value={key.status} />
                </td>
                <td className="px-2 py-2 text-slate-600">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                </td>
                <td className="px-2 py-2">
                  {key.status !== "REVOKED" ? (
                    <form action={revokeActionWithTracking}>
                      <input type="hidden" name="apiKeyId" value={key.id} />
                      <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
                        Revoke
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-500">Revoked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
