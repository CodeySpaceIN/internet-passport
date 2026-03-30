"use client";

type AnalyticsPayload = Record<string, unknown>;

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  const body = {
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  // Placeholder hook for production analytics sinks (PostHog/Segment/etc).
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics:event]", body);
  }
}
