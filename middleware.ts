import { NextRequest, NextResponse } from "next/server";

const OFF_TRACK_EXACT = new Set([
  "/api/ai/trade-signal",
]);

const OFF_TRACK_PAGE_PREFIXES = [
  "/terminal",
  "/agents",
  "/airdrop",
  "/calendar",
  "/defi",
  "/futures",
  "/messages",
  "/multisig",
  "/payments",
  "/portfolio",
  "/privacy",
  "/referral",
  "/tools",
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isOffTrackPage = OFF_TRACK_PAGE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  const isOffTrackApi = OFF_TRACK_EXACT.has(path) || /^\/api\/tokens\/[^/]+\/vesting$/.test(path);

  if (isOffTrackPage || isOffTrackApi) {
    return NextResponse.json(
      {
        error: "Off-track surface disabled for Bags hackathon demo",
        focus: ["Bags API", "Social Finance", "Fee Sharing / Creator Reputation"],
      },
      { status: 404 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/terminal/:path*",
    "/agents/:path*",
    "/airdrop/:path*",
    "/calendar/:path*",
    "/defi/:path*",
    "/futures/:path*",
    "/messages/:path*",
    "/multisig/:path*",
    "/payments/:path*",
    "/portfolio/:path*",
    "/privacy/:path*",
    "/referral/:path*",
    "/tools/:path*",
  ],
};
