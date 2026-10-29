"use client";

// Replaces the root layout when it crashes, so it can't rely on globals.css or
// the design tokens — plain inline styles only.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="lt">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff",
          color: "#111827",
          textAlign: "center",
          padding: "0 16px",
        }}
      >
        <main>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Kažkas nepavyko</h1>
          <p style={{ marginTop: 8, color: "#6b7280" }}>
            Atsiprašome, svetainėje įvyko netikėta klaida. Apie ją jau pranešta.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                border: 0,
                borderRadius: 12,
                background: "#2563eb",
                color: "#fff",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Bandyti dar kartą
            </button>
            {/* Full reload on purpose: the client router is what just crashed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ padding: "12px 24px", fontSize: 14, color: "#2563eb" }}>
              Į pradžią
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
