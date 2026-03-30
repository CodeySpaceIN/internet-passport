import { redirect } from "next/navigation";
import type { Route } from "next";

export default async function SignUpPage() {
  redirect("/signup" as Route);
}
