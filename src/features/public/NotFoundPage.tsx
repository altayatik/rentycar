import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
      <Card className="relative w-full overflow-hidden px-6 py-12 sm:px-10">
        <span className="ghost-num -right-6 -top-10 text-[12rem]" style={{ color: "var(--terracotta)" }}>
          404
        </span>
        <span
          className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--terracotta-tint)", color: "var(--terracotta)" }}
        >
          <Compass className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="h1 relative mt-5">Off the map</h1>
        <p className="muted relative mx-auto mt-3 max-w-sm">
          This page isn&apos;t in the atlas. It may have moved, or never existed at all.
        </p>
        <Link to="/" className="btn btn-primary btn-lg btn-sheen relative mt-7">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the map
        </Link>
      </Card>
    </div>
  );
}
