import { Card } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16">
      <Card>
        <h1 className="text-3xl font-semibold tracking-tight">About Internet Passport</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Internet Passport is a universal trust layer for modern internet surfaces. We verify users,
          organizations, content, and AI actions while preserving privacy and accountability.
        </p>
      </Card>
    </main>
  );
}
