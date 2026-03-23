type SignalResponse = {
  selection: string;
  edge_pct: number;
  ev: number;
};

const BASE_URL = "https://shark-odds-1.onrender.com";

export const dynamic = "force-dynamic";

async function getDemoSignal(): Promise<SignalResponse> {
  const response = await fetch(`${BASE_URL}/api/signals/demo`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load live signal.");
  }

  return response.json();
}

function statCard(label: string, value: string) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 20,
        padding: "20px 22px",
        boxShadow: "0 18px 45px rgba(0, 0, 0, 0.22)",
        backdropFilter: "blur(10px)"
      }}
    >
      <div
        style={{
          marginBottom: 10,
          color: "#8ccfe8",
          fontSize: 13,
          letterSpacing: "0.14em",
          textTransform: "uppercase"
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#ffffff",
          fontSize: 28,
          fontWeight: 700
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function HomePage() {
  let signal: SignalResponse | null = null;
  let loadError = "";

  try {
    signal = await getDemoSignal();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load live signal.";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 1080,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          alignItems: "stretch"
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.07)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 28,
            padding: 32,
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
            backdropFilter: "blur(14px)"
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(28, 194, 255, 0.14)",
              border: "1px solid rgba(28, 194, 255, 0.24)",
              color: "#9fe7ff",
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Live Demo Signal
          </div>

          <h1
            style={{
              margin: "18px 0 14px",
              fontSize: "clamp(2.3rem, 5vw, 4.5rem)",
              lineHeight: 1,
              letterSpacing: "-0.04em"
            }}
          >
            Shark Odds
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 540,
              color: "#c8e6f2",
              fontSize: 18,
              lineHeight: 1.7
            }}
          >
            Clean betting signals from your live backend, surfaced in a homepage
            that feels like a real product instead of a raw API test.
          </p>

          <div
            style={{
              marginTop: 28,
              padding: 24,
              borderRadius: 24,
              background: "linear-gradient(135deg, #0e2433, #13384e)",
              border: "1px solid rgba(159, 231, 255, 0.16)"
            }}
          >
            <div
              style={{
                marginBottom: 10,
                color: "#7ccfe7",
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase"
              }}
            >
              Current Pick
            </div>
            <div
              style={{
                color: "#ffffff",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                fontWeight: 800
              }}
            >
              {signal ? signal.selection : "Backend waking up..."}
            </div>
            {loadError ? (
              <p
                style={{
                  margin: "12px 0 0",
                  color: "#ffd6b0",
                  lineHeight: 1.6
                }}
              >
                {loadError} Render apps sometimes need a few seconds to wake up.
              </p>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 18
          }}
        >
          {statCard("Edge", signal ? `${signal.edge_pct.toFixed(2)}%` : "--")}
          {statCard(
            "Expected Value",
            signal ? `${(signal.ev * 100).toFixed(2)}%` : "--"
          )}

          <div
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 20,
              padding: "20px 22px",
              color: "#c7e5f1",
              lineHeight: 1.7
            }}
          >
            This page fetches live data from:
            <div
              style={{
                marginTop: 10,
                color: "#ffffff",
                fontWeight: 600,
                wordBreak: "break-word"
              }}
            >
              {BASE_URL}/api/signals/demo
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
