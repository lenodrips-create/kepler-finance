"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const C = {
  pos: "#1E6B4F",
  neg: "#A8362A",
  ink: "#1A1A17",
  muted: "#6A6860",
  rule: "#E8E5DD",
  paper: "#F5F3EE",
};

const tick = { fontFamily: "var(--mono)", fontSize: 11, fill: C.muted };

interface TrendChartProps {
  labels: string[];
  values: number[];
  /** Formats values for the readout/tooltip, e.g. dollars. */
  format: (v: number) => string;
  /** Formats y-axis ticks. */
  axisFormat: (v: number) => string;
  /** Accessible description, e.g. "AAPL monthly share price". */
  label: string;
  height?: number;
}

/** Area chart with a keyboard/pointer readout below (Recharts). */
export function TrendChart({ labels, values, format, axisFormat, label, height = 260 }: TrendChartProps) {
  const data = labels.map((l, i) => ({ l, v: values[i] }));
  const last = data.length - 1;
  const [active, setActive] = React.useState<number>(last);
  React.useEffect(() => setActive(last), [last, values]);
  const i = Math.min(active, last);
  const prev = i > 0 ? ((values[i] - values[i - 1]) / values[i - 1]) * 100 : null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || max * 0.05;

  return (
    <figure className="m-0">
      <div role="img" aria-label={`${label}, ${labels[0]} to ${labels[last]}. Latest ${format(values[last])}.`}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
            onMouseMove={(s) => typeof s?.activeTooltipIndex === "number" && setActive(s.activeTooltipIndex)}
            onMouseLeave={() => setActive(last)}
          >
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.pos} stopOpacity={0.18} />
                <stop offset="100%" stopColor={C.pos} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.rule} vertical={false} />
            <XAxis dataKey="l" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={axisFormat}
              domain={[Math.max(0, min - pad), max + pad]}
              tickCount={5}
            />
            <Tooltip cursor={{ stroke: C.muted, strokeDasharray: "2 3" }} content={() => null} />
            <Area
              type="linear"
              dataKey="v"
              stroke={C.pos}
              strokeWidth={2}
              fill="url(#trendFill)"
              isAnimationActive={false}
              activeDot={{ r: 4, fill: C.paper, stroke: C.pos, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="readout" aria-live="polite">
        {labels[i]} &nbsp;<b>{format(values[i])}</b>
        {prev !== null && (
          <>
            {" "}
            &nbsp;<span className={prev >= 0 ? "pos" : "neg"}>{(prev >= 0 ? "+" : "−") + Math.abs(prev).toFixed(1)}%</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

/** Tiny decorative trend line (Recharts). */
export function Sparkline({ values, width = 70, height = 20 }: { values: number[]; width?: number; height?: number }) {
  const up = values[values.length - 1] >= values[0];
  return (
    <span aria-hidden="true" className="inline-block align-middle">
      <LineChart width={width} height={height} data={values.map((v) => ({ v }))} margin={{ top: 2, right: 1, bottom: 2, left: 1 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="linear" dataKey="v" stroke={up ? C.pos : C.neg} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </span>
  );
}

export const signed = (c: number) => (
  <span className={c >= 0 ? "pos" : "neg"}>{(c >= 0 ? "+" : "−") + Math.abs(c).toFixed(1)}%</span>
);
