import { useId } from "react";

/** Martha Motors double-M monogram (same mark as app/icon.svg). */
export function Monogram({ className = "size-7" }: { className?: string }) {
  const gid = `volt-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="10 10 44 44" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2ee6a6" />
          <stop offset="1" stopColor="#4c8dff" />
        </linearGradient>
      </defs>
      <path
        d="M14.5 38 L20.5 14.5 L32 29.5 L43.5 14.5 L49.5 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M21 50 L25.5 35.5 L32 43.5 L38.5 35.5 L43 50"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="3.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
