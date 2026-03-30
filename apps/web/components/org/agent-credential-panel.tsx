"use client";

import { useActionState } from "react";
import {
  issueAgentCredentialAction,
  revokeAgentCredentialAction,
  rotateAgentCredentialAction,
  type AgentCredentialActionState,
} from "@/app/app/organizations/actions";

const initialState: AgentCredentialActionState = { ok: false };

type CredentialRow = {
  id: string;
  keyId: string;
  credentialType: string;
  algorithm: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

export function AgentCredentialPanel({
  agentId,
  credentials,
  canManage,
}: {
  agentId: string;
  credentials: CredentialRow[];
  canManage: boolean;
}) {
  const [issueState, issueAction, issuePending] = useActionState(issueAgentCredentialAction, initialState);
  const [rotateState, rotateAction, rotatePending] = useActionState(rotateAgentCredentialAction, initialState);

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Generate credential/token</h3>
          <form action={issueAction} className="mt-3 grid gap-2 md:grid-cols-3">
            <input type="hidden" name="agentId" value={agentId} />
            <select name="credentialType" defaultValue="API_KEY" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="API_KEY">API_KEY</option>
              <option value="JWT_SIGNING_KEY">JWT_SIGNING_KEY</option>
              <option value="OAUTH_CLIENT">OAUTH_CLIENT</option>
            </select>
            <input
              name="expiresInDays"
              type="number"
              min={1}
              max={730}
              defaultValue={90}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={issuePending}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {issuePending ? "Generating..." : "Generate credential"}
            </button>
          </form>
          {issueState.message ? (
            <p className={`mt-2 text-xs ${issueState.ok ? "text-emerald-700" : "text-rose-700"}`}>{issueState.message}</p>
          ) : null}
          {issueState.secret ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p className="text-xs font-semibold text-amber-700">Secret (shown once)</p>
              <p className="mt-1 font-mono text-xs text-slate-800">{issueState.secret}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Rotate active credentials</h3>
          <form action={rotateAction} className="mt-3">
            <input type="hidden" name="agentId" value={agentId} />
            <button
              type="submit"
              disabled={rotatePending}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-60"
            >
              {rotatePending ? "Rotating..." : "Rotate now"}
            </button>
          </form>
          {rotateState.message ? (
            <p className={`mt-2 text-xs ${rotateState.ok ? "text-emerald-700" : "text-rose-700"}`}>{rotateState.message}</p>
          ) : null}
          {rotateState.secret ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
              <p className="text-xs font-semibold text-amber-700">New secret (shown once)</p>
              <p className="mt-1 font-mono text-xs text-slate-800">{rotateState.secret}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Credential history</h3>
        <div className="mt-3 space-y-2">
          {credentials.length === 0 ? (
            <p className="text-sm text-slate-500">No credentials created yet.</p>
          ) : (
            credentials.map((credential) => (
              <div key={credential.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-mono text-xs text-slate-700">{credential.keyId}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {credential.credentialType} · {credential.algorithm}
                </p>
                <p className="text-xs text-slate-500">
                  Created {new Date(credential.createdAt).toLocaleString()}
                  {credential.expiresAt ? ` · Expires ${new Date(credential.expiresAt).toLocaleString()}` : ""}
                  {credential.revokedAt ? ` · Revoked ${new Date(credential.revokedAt).toLocaleString()}` : ""}
                </p>
                {canManage && !credential.revokedAt ? (
                  <form action={revokeAgentCredentialAction} className="mt-2">
                    <input type="hidden" name="agentId" value={agentId} />
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <button type="submit" className="text-xs font-medium text-rose-700 hover:text-rose-800">
                      Revoke credential
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
