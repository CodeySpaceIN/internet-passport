import { redirect } from "next/navigation";
import type { Route } from "next";

export default async function SignInPage() {
  redirect("/login" as Route);
}
