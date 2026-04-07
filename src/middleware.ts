import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/prisijungti", req.url));
    }

    // Provider routes
    if (path.startsWith("/tiek%C4%97jas") && token?.role !== "PROVIDER") {
      return NextResponse.redirect(new URL("/prisijungti", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // These paths require auth
        if (path.startsWith("/admin") || path.startsWith("/tiek%C4%97jas") || path.startsWith("/paskyra")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/tiek%C4%97jas/:path*", "/paskyra/:path*"],
};
