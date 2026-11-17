import type { CSSProperties } from "react";
import type { EntryTag } from "@/types/buildlog";

interface StageSVGProps {
  tag: EntryTag;
  size?: number;
}

const stageColors: Record<EntryTag, string> = {
  Idea: "#3b82f6",
  Prototype: "#8b5cf6",
  Failure: "#ef4444",
  Breakthrough: "#22c55e",
  Final: "#f59e0b",
};

const svgClass = "rounded-lg border border-[#1f1f23] bg-zinc-900";

export function StageSVG({ tag, size = 160 }: StageSVGProps) {
  const color = stageColors[tag] ?? "#71717a";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 160 160",
    className: svgClass,
    role: "img",
    "aria-label": `${tag} stage illustration`,
  } as const;
  const labelStyle: CSSProperties = { fontFamily: "monospace" };

  if (tag === "Failure") {
    return (
      <svg {...common}>
        <rect x="30" y="50" width="100" height="60" rx="4" fill="none" stroke={color} strokeWidth="2" />
        <line x1="40" y1="70" x2="70" y2="70" stroke={color} strokeWidth="2" />
        <line x1="90" y1="70" x2="120" y2="70" stroke={color} strokeWidth="2" />
        <circle cx="80" cy="90" r="8" fill="none" stroke={color} strokeWidth="2" />
        <line x1="50" y1="40" x2="110" y2="120" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <text x="80" y="145" textAnchor="middle" fill={color} fontSize="11" style={labelStyle}>FAILURE</text>
      </svg>
    );
  }

  if (tag === "Breakthrough") {
    return (
      <svg {...common}>
        <path d="M40 100 L70 70 L90 90 L120 50" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="105,50 120,50 120,65" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="110" r="18" fill="none" stroke={color} strokeWidth="2" />
        <text x="80" y="145" textAnchor="middle" fill={color} fontSize="11" style={labelStyle}>BREAKTHROUGH</text>
      </svg>
    );
  }

  if (tag === "Idea") {
    return (
      <svg {...common}>
        <circle cx="80" cy="70" r="28" fill="none" stroke={color} strokeWidth="2" />
        <line x1="80" y1="98" x2="80" y2="115" stroke={color} strokeWidth="2" />
        <line x1="65" y1="115" x2="95" y2="115" stroke={color} strokeWidth="2" />
        <path d="M70 55 Q80 40 90 55" fill="none" stroke={color} strokeWidth="1.5" />
        <text x="80" y="145" textAnchor="middle" fill={color} fontSize="11" style={labelStyle}>IDEA</text>
      </svg>
    );
  }

  if (tag === "Final") {
    return (
      <svg {...common}>
        <rect x="40" y="40" width="80" height="70" rx="6" fill="none" stroke={color} strokeWidth="2" />
        <path d="M55 70 L70 85 L105 55" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="80" y="145" textAnchor="middle" fill={color} fontSize="11" style={labelStyle}>FINAL SPEC</text>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="35" y="45" width="90" height="55" rx="4" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="55" cy="72" r="8" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="105" cy="72" r="8" fill="none" stroke={color} strokeWidth="2" />
      <line x1="63" y1="72" x2="97" y2="72" stroke={color} strokeWidth="2" />
      <text x="80" y="145" textAnchor="middle" fill={color} fontSize="11" style={labelStyle}>PROTOTYPE</text>
    </svg>
  );
}

const tagClasses: Record<EntryTag, string> = {
  Idea: "bg-blue-500",
  Prototype: "bg-violet-500",
  Failure: "bg-red-500",
  Breakthrough: "bg-green-500",
  Final: "bg-amber-500",
};

export function TagBadge({ tag }: { tag: EntryTag }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${tagClasses[tag] ?? "bg-zinc-600"}`}>
      {tag}
    </span>
  );
}

export function SpecPills({ specs }: { specs?: string[] | null }) {
  if (!specs?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {specs.map((spec, index) => (
        <span key={`${spec}-${index}`} className="mono rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
          {spec}
        </span>
      ))}
    </div>
  );
}
