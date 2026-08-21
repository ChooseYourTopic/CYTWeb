import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hostname routing across the ChooseYourTopic subdomains (nginx forwards the real
 * Host via `proxy_set_header Host $host`):
 *   - admin.chooseyourtopic.com  → the support/admin PORTAL. Its home is /admin;
 *     that page gates on a staff (admin/support) license and bounces a non-staff
 *     visitor to /signin, so standard-license users can't sit in the portal.
 *   - app.chooseyourtopic.com + the bare domain → the standard USER app (default).
 *
 * api.chooseyourtopic.com is API-only (served by nginx → the API stack), never this
 * front, so it isn't handled here.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();

  // The admin subdomain lands support agents in the portal by default.
  if (host.startsWith("admin.") && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

// Only the site root needs host-based routing; deeper paths resolve normally.
export const config = { matcher: ["/"] };
