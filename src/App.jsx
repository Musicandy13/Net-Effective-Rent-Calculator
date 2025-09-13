import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ReferenceLine,
  Cell,
} from "recharts";
import { toPng } from "html-to-image";

/* ---- Steuerung für Legendenposition ---- */
const BASE_H = 20;
const BASE_B = 10;
const FIT_EXTRA = -27;
/* --------------------------------------- */

/* Fixe Y-Position für die Top-Labels im Waterfall */
const WF_TOP_LABEL_Y = 62;

/* ---------- Utils ---------- */
const clamp = (n, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : 0);
const safe = (n) => (Number.isFinite(n) ? n : 0);
const P = (v) => {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  const hasDot = s.includes("."), c = (s.match(/,/g) || []).length;
  s = !hasDot && c === 1 ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const F = (n, d = 2) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(Number.isFinite(n) ? n : 0);
const FCUR = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
  });
const FCUR0 = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/* ---------- Helpers ---------- */
function Money({ value }) {
  const cls =
    value < 0 ? "text-red-600 font-medium" : "text-gray-900 font-medium";
  return <span className={cls}>{FCUR(value)}</span>;
}
function Delta({ base, val }) {
  const pct = base > 0 ? ((val - base) / base) * 100 : 0;
  const up = pct > 0,
    down = pct < 0,
    sign = pct > 0 ? "+" : "";
  return (
    <span
      className={`${
        down ? "text-red-600" : up ? "text-green-600" : "text-gray-500"
      } font-medium ml-2`}
    >
      {down ? "▼" : up ? "▲" : "■"} {sign}
      {F(pct, 2)}%
    </span>
  );
}

/* ---------- Input-Feld ---------- */
function NumericField({
  label,
  value,
  onChange,
  format = "2dec",
  step = 1,
  min = 0,
  readOnly = false,
  onCommit,
  suffix,
}) {
  const [focus, setFocus] = useState(false);
  const num = P(value);
  const show = focus
    ? value
    : format === "int"
    ? F(num, 0)
    : format === "1dec"
    ? F(num, 1)
    : F(num, 2);
  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <div className="relative">
        <input
          type={focus ? "number" : "text"}
          inputMode={focus ? "decimal" : "text"}
          value={show}
          min={min}
          step={step}
          readOnly={readOnly && !focus}
          onFocus={() => setFocus(true)}
          onBlur={(e) => {
            setFocus(false);
            const n = clamp(P(e.target.value), min);
            onChange(String(n));
            onCommit?.(n);
          }}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^\d.,-]/g, ""))
          }
          className={`mt-1 block w-full border rounded-md p-2 pr-16 ${
            readOnly ? "bg-gray-100 text-gray-600" : ""
          }`}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

/* ---------- Chart Labels ---------- */
const PercentLabel = ({ x, y, width, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2;
  const fill = value < 0 ? "#dc2626" : "#16a34a";
  const sign = value > 0 ? "+" : "";
  return (
    <text
      x={cx}
      y={y - 18}
      textAnchor="middle"
      fill={fill}
      fontSize={12}
      fontWeight="700"
    >
      {sign}
      {F(value, 2)}%
    </text>
  );
};
const BarNumberLabel = ({ x, y, width, height, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2,
    cy = y + height / 2;
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#ffffff"
      fontSize={12}
      fontWeight="800"
    >
      {F(value, 2)}
    </text>
  );
};
const VerticalMoneyLabel0 = ({ x, y, width, height, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2,
    cy = y + height / 2;
  return (
    <text
      x={cx}
      y={cy}
      transform={`rotate(-90, ${cx}, ${cy})`}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#ffffff"
      fontSize={16}
      fontWeight="800"
    >
      {FCUR0(value)}
    </text>
  );
};

/* ---------- Waterfall: Labels oben fix ---------- */
const makeWFLabelTop = (data, fixedY) => (props) => {
  const { x = 0, width = 0, index, value, payload } = props || {};
  const d = Array.isArray(data) && Number.isInteger(index) ? data[index] : {};
  const cx = x + width / 2;
  const raw = Number.isFinite(d?.delta)
    ? d.delta
    : Number.isFinite(payload?.delta)
    ? payload.delta
    : Number.isFinite(value)
    ? value
    : 0;
  const v = Math.round(raw * 100) / 100;
  const abs = Math.abs(v);
  if (d?.isTotal) {
    const pos = v >= 0;
    return (
      <text
        x={cx}
        y={fixedY}
        textAnchor="middle"
        fill={pos ? "#16a34a" : "#dc2626"}
        fontSize={12}
        fontWeight="800"
      >
        {pos ? "" : "−"}
        {F(Math.abs(v), 2)}
      </text>
    );
  }
  if (abs < 0.005) return null;
  return (
    <text
      x={cx}
      y={fixedY}
      textAnchor="middle"
      fill="#dc2626"
      fontSize={12}
      fontWeight="800"
    >
      −{F(abs, 2)}
    </text>
  );
};

/* ---------- Charts ---------- */
function BarsChart({ data, isExporting }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        key="bars"
        data={data}
        barCategoryGap={18}
        barGap={4}
        margin={{ top: 28, right: 6, bottom: Math.max(0, BASE_B), left: 6 }}
      >
        <XAxis
          dataKey="name"
          height={Math.max(0, BASE_H)}
          tick={{ fontSize: 12, fontWeight: 700 }}
        />
        <YAxis hide />
        <Tooltip
          formatter={(v, n) =>
            n === "sqm" ? `${F(v, 2)} €/sqm` : `${F(v, 2)}%`
          }
        />
        <ReferenceLine y={0} />
        <Bar dataKey="sqm" barSize={36} isAnimationActive={!isExporting}>
          <LabelList dataKey="pct" content={<PercentLabel />} />
          <LabelList dataKey="sqm" content={<BarNumberLabel />} />
          {data.map((e, i) => (
            <Cell
              key={i}
              fill={e.color}
              stroke={e.name === "Final" ? "#dc2626" : undefined}
              strokeWidth={e.name === "Final" ? 2 : undefined}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function WaterfallChart({ data, isExporting }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        key="waterfall"
        data={data}
        barCategoryGap={8}
        barGap={6}
        margin={{ top: 56, right: 12, bottom: Math.max(0, BASE_B), left: 12 }}
      >
        <XAxis
          dataKey="name"
          interval={0}
          height={Math.max(0, BASE_H)}
          tick={{ fontSize: 12, fontWeight: 700 }}
        />
        <YAxis hide domain={["dataMin - 2", "dataMax + 8"]} />
        <Tooltip
          formatter={(val, _n, ctx) => {
            const p = ctx?.payload || {};
            if (p.isTotal) return [`${F(safe(p.delta), 2)} €/sqm`, "Rent"];
            return [`−${F(Math.abs(safe(p.delta)), 2)} €/sqm`, "Δ"];
          }}
        />
        <ReferenceLine y={0} />
        <Bar dataKey="base" stackId="wf" fill="rgba(0,0,0,0)" />
        <Bar
          dataKey="delta"
          stackId="wf"
          barSize={44}
          isAnimationActive={!isExporting}
        >
          <LabelList dataKey="delta" content={makeWFLabelTop(data, WF_TOP_LABEL_Y)} />
          {data.map((d, i) => (
            <Cell key={i} fill={d.isTotal ? "#16a34a" : "#dc2626"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [f, setF] = useState({
    tenant: "",
    nla: "1000",
    addon: "5.00",
    rent: "15.00",
    duration: "60",
    rf: "5.0",
    agent: "2.0",
    fitMode: "perNLA",
    fitPerNLA: "300.00",
    fitPerGLA: "",
    fitTot: "300000.00",
    unforeseen: "0",
  });
  const S = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState("bars");

  /* parsed + derived values ... (hier bleibt der Code identisch wie in deiner letzten Version) */

  /* ---- Export Project HTML ---- */
  const exportProjectHTML = () => {
    const tenantName = f.tenant.trim() || "ner-project";
    const filename = `${tenantName.replace(/\s+/g, "_")}.html`;
    const params = new URLSearchParams(f).toString();
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>NER Project - ${tenantName}</title>
<meta http-equiv="refresh" content="0; url=${window.location.origin}?${params}">
</head><body>
<p>Loading project <b>${tenantName}</b> ...</p>
<script>window.location.href="${window.location.origin}?${params}";</script>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---- Restliche UI wie in deiner funktionierenden Version ---- */
  return (
    <div> 
      {/* Inputs left, Ergebnisse right, Export-Buttons unten rechts */}
      {/* Export-Buttons: */}
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={() => {/* Export Results PNG */}} className="px-3 py-1.5 rounded border">Export Results PNG</button>
        <button onClick={() => {/* Export Full PNG */}} className="px-3 py-1.5 rounded border">Export Full PNG</button>
        <button onClick={exportProjectHTML} className="px-3 py-1.5 rounded border">Export Project HTML</button>
      </div>
    </div>
  );
}
