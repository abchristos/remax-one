/**
 * Route protection: everything except the login page, the auth endpoints,
 * the health check and static assets requires a valid session. Unauthenticated
 * visitors are redirected to /login (configured in authOptions.pages).
 */
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico|logo.svg).*)",
  ],
};
