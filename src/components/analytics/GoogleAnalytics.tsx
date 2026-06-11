"use client";

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// GA4 Enhanced Measurement (enabled on the web stream) already tracks
// page_view on initial load and on App Router soft navigations via the
// History API, so we don't send page_view manually — doing both would
// double-count. We just load gtag with the default config.
//
// lazyOnload: gtag is 160KB+ and the single biggest script on the page;
// loading it on browser idle keeps it out of the LCP/TBT window. GA still
// records the page_view because Enhanced Measurement fires on gtag init.
export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
