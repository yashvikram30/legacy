import { TransparencyLookupSkeleton } from "@/components/Skeleton";

export default function LookupLoading() {
  return (
    <div
      className="landing-canvas"
      style={{
        minHeight: "calc(100vh - var(--header-height, 64px))",
        padding: "40px 24px 96px",
      }}
    >
      <div className="app-container">
        <div className="panel-instrument" style={{ background: "#000000", border: "1px solid rgba(255, 255, 255, 0.2)" }}>
          <TransparencyLookupSkeleton />
        </div>
      </div>
    </div>
  );
}
