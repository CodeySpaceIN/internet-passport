import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/dashboard", "/admin", "/onboarding"];
const adminRoutes = ["/admin"];
const authRoutes = ["/sign-in", "/sign-up", "/login", "/signup"];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminPath(pathname: string) {
  return adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthPath(pathname: string) {
  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret:
      process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? "dev-only",
  });

  const pathname = request.nextUrl.pathname;
  const isAuthenticated = Boolean(token?.userId);
  const roles = Array.isArray(token?.roles) ? token.roles : [];
  const onboardingRequired = Boolean(token?.onboardingRequired);

  if (!isAuthenticated && isProtectedPath(pathname)) {
    const signInUrl = new URL("/login", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthenticated && isAuthPath(pathname)) {
    return NextResponse.redirect(
      new URL(onboardingRequired ? "/onboarding" : "/dashboard", request.url),
    );
  }

  if (
    isAuthenticated &&
    onboardingRequired &&
    pathname !== "/onboarding" &&
    !pathname.startsWith("/api/auth")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isAuthenticated && isAdminPath(pathname)) {
    const canAccessAdmin = roles.includes("super_admin") || roles.includes("trust_admin");
    if (!canAccessAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-ip-app", "internet-passport-web");
  response.headers.set("x-ip-pathname", pathname);
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/onboarding/complete).*)"],
};
