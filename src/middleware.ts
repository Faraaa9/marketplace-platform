import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

function isProviderPath(path: string) {
  return isCurrentProviderPath(path) || isLegacyProviderPath(path);
}

function isCurrentProviderPath(path: string) {
  return path.startsWith("/tiekejas");
}

function isLegacyProviderPath(path: string) {
  return path.startsWith("/tiekėjas") || path.startsWith("/tiek%C4%97jas");
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (isLegacyProviderPath(path)) {
      const url = req.nextUrl.clone();
      url.pathname = path.replace(/^\/tiek%C4%97jas|^\/tiekėjas/, "/tiekejas");
      return NextResponse.redirect(url);
    }

    // Admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/prisijungti", req.url));
    }

    // Provider routes — logged in but not provider → become provider page
    if (isProviderPath(path) && token?.role !== "PROVIDER") {
      if (token) {
        return NextResponse.redirect(new URL("/tapti-tiekeju", req.url));
      }
      return NextResponse.redirect(new URL("/prisijungti", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/admin") || path.startsWith("/paskyra")) {
          return !!token;
        }
        if (isCurrentProviderPath(path)) {
          return !!token;
        }
        if (isLegacyProviderPath(path)) return true;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/tiekejas/:path*", "/tiekėjas/:path*", "/tiek%C4%97jas/:path*", "/paskyra/:path*"],
};
