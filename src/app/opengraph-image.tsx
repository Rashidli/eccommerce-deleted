import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "E-COMMERCE - Discover Global Trends";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 180,
            height: 180,
            borderRadius: 40,
            background: "#7c3aed",
            marginBottom: 40,
            boxShadow: "0 25px 50px -12px rgba(124, 58, 237, 0.5)",
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            E
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          E-C<span style={{ color: "#7c3aed" }}>O</span>MMERCE
          <span style={{ color: "#7c3aed" }}>.</span>
        </div>
        <p
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.7)",
            marginTop: 20,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Discover Global Trends, All in One Place
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
