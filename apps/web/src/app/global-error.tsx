"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center", maxWidth: "24rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Error critico</h1>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>La aplicacion encontro un error grave.</p>
            <button onClick={reset} style={{ backgroundColor: "#2563eb", color: "white", padding: "0.5rem 1.5rem", borderRadius: "0.5rem", border: "none", cursor: "pointer" }}>
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
