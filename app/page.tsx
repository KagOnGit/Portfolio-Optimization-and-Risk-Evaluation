// app/page.tsx
"use client";

import { useMemo, useState } from "react";

// tiny ui primitives (you have these)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// use components that actually exist in your repo
import KpiCard from "@/components/KpiCard";
import EquityChart from "@/components/EquityChart";

// icons
import {
  BarChart3,
  ChevronDown,
  Globe,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Wallet,
} from "lucide-react";

/* =========================================================================
   Market Mood Index (MMI) – Tickertape-inspired interactive gauge
   ========================================================================= */

type MoodZone = {
  label: "Extreme Fear" | "Fear" | "Greed" | "Extreme Greed";
  range: [number, number];          // inclusive
  color: string;                    // arc color
  description: string;              // tooltip text (static/safe)
  anchor: "left" | "right";         // tooltip side hint
};

const ZONES: MoodZone[] = [
  {
    label: "Extreme Fear",
    range: [0, 30],
    color: "#22c55e",
    description:
      "Extreme fear (&lt;30) suggests a good time to open fresh positions, as markets are likely to be oversold and might turn upwards.",
    anchor: "left",
  },
  {
    label: "Fear",
    range: [30, 50],
    color: "#86efac",
    description:
      "Fear zone suggests investors are cautious. The action to take depends on the MMI trajectory and macro backdrop.",
    anchor: "left",
  },
  {
    label: "Greed",
    range: [50, 70],
    color: "#f59e0b",
    description:
      "Greed zone suggests investors are chasing risk. Consider tighter risk management and watch for momentum slowdowns.",
    anchor: "right",
  },
  {
    label: "Extreme Greed",
    range: [70, 100],
    color: "#ef4444",
    description:
      "Extreme greed (&gt;70) suggests avoiding new risk as markets are overbought and likely to mean-revert.",
    anchor: "right",
  },
];

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Convert degrees to SVG coordinates (center 150,150)
function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return [150 + r * Math.cos(rad), 150 + r * Math.sin(rad)];
}

function arcPath(a0: number, a1: number, r: number) {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

function MoodGauge({
  score = 55,
  updatedText = "Updated 1 day ago",
}: {
  score?: number;
  updatedText?: string;
}) {
  const [hovered, setHovered] = useState<MoodZone | null>(null);
  const s = clampScore(score);
  const angle = -120 + (240 * s) / 100; // -120..120
  const active = useMemo(
    () => ZONES.find((z) => s >= z.range[0] && s <= z.range[1]) || ZONES[1],
    [s]
  );

  const segAngles = [
    { a0: -120, a1: -60, zone: ZONES[0] },
    { a0: -60, a1: 0, zone: ZONES[1] },
    { a0: 0, a1: 60, zone: ZONES[2] },
    { a0: 60, a1: 120, zone: ZONES[3] },
  ] as const;

  return (
    <Card className="relative overflow-hidden bg-background/50 p-4 backdrop-blur">
      <div className="mb-2 text-sm font-semibold">Market Mood Index</div>

      <div className="relative mx-auto" style={{ width: 300, height: 180 }}>
        <svg width="300" height="180" viewBox="0 0 300 180">
          {/* base arc */}
          <path
            d={arcPath(-120, 120, 120)}
            stroke="#2a2a2a"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />

          {/* colored segments */}
          {segAngles.map((seg, i) => (
            <path
              key={i}
              d={arcPath(seg.a0, seg.a1, 120)}
              stroke={seg.zone.color}
              strokeWidth={hovered?.label === seg.zone.label ? 16 : 14}
              fill="none"
              strokeLinecap="round"
              className="cursor-pointer transition-[stroke-width] duration-150"
              onMouseEnter={() => setHovered(seg.zone)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* ticks every 30° */}
          {[...Array(9)].map((_, i) => {
            const a = -120 + i * 30;
            const [x0, y0] = polar(a, 104);
            const [x1, y1] = polar(a, 116);
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#333" strokeWidth="2" />;
          })}

          {/* needle */}
          <g transform={`rotate(${angle} 150 150)`}>
            <line x1="150" y1="150" x2="255" y2="150" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="150" cy="150" r="5" fill="#e5e7eb" />
          </g>

          {/* score */}
          <text
            x="150"
            y="165"
            textAnchor="middle"
            className="fill-emerald-300"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            {s}
          </text>
        </svg>

        {/* tooltip */}
        {hovered ? (
          <div
            className={`absolute top-8 ${
              hovered.anchor === "left" ? "left-2" : "right-2"
            } max-w-[220px] rounded-md border border-neutral-800 bg-neutral-900/95 p-3 text-xs text-neutral-200 shadow-lg`}
          >
            <div className="mb-1 font-medium" style={{ color: hovered.color }}>
              {hovered.label}
            </div>
            <div
              className="text-neutral-300"
              // static copy only; no user HTML
              dangerouslySetInnerHTML={{ __html: hovered.description }}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Zone: <span style={{ color: active.color }}>{active.label}</span>
        </span>
        <span>{updatedText}</span>
      </div>
    </Card>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function Page() {
  // Replace with your computed MMI score when wired up
  const moodScore = 55;

  // Simple demo data for EquityChart so the page renders without API
  const demoDates = Array.from({ length: 30 }, (_, i) => `2024-01-${String(i + 1).padStart(2, "0")}`);
  const demoValues = demoDates.map((_, i) => 100 + Math.sin(i / 4) * 10 + i * 0.4);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="border-r bg-background/50 backdrop-blur">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Wallet className="h-6 w-6" />
            <span className="font-bold">Vaultify</span>
          </div>
          <div className="px-4 py-4">
            <Input placeholder="Search" className="bg-background/50" />
          </div>
          <nav className="space-y-2 px-2">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics &amp; Income
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Globe className="h-4 w-4" />
              Market
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Funding
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Wallet className="h-4 w-4" />
              Yield Vaults
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LifeBuoy className="h-4 w-4" />
              Support
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </nav>
        </aside>

        {/* Main */}
        <main className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Overview</h1>
              <div className="text-sm text-muted-foreground">Aug 13, 2023 - Aug 18, 2023</div>
            </div>
            <Button variant="outline" className="gap-2">
              Ethereum Network
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* KPI row — uses your KpiCard component */}
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard label="Your Balance" value="$74,892" />
            <KpiCard label="Your Deposits" value="$54,892" />
            <KpiCard label="Accrued Yield" value="$20,892" />
          </div>

          {/* General stats + Mood Gauge */}
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2 bg-background/50 p-6 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">General Statistics</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">Today</Button>
                  <Button size="sm" variant="ghost">Last week</Button>
                  <Button size="sm" variant="ghost">Last month</Button>
                  <Button size="sm" variant="ghost">Last 6 month</Button>
                  <Button size="sm" variant="ghost">Year</Button>
                </div>
              </div>

              {/* Your EquityChart component */}
              <EquityChart title="Portfolio Equity Curve" values={demoValues} dates={demoDates} />
            </Card>

            {/* Tickertape-like MMI Card */}
            <MoodGauge score={moodScore} />
          </div>
        </main>
      </div>
    </div>
  );
}