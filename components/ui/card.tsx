import * as React from "react";

export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur ${className}`}
      {...props}
    />
  );
}