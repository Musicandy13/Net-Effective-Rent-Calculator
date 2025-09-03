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

/* ---- NUR DIESE 3 ZAHLEN ANPASSEN, um die Legenden zu verschieben ---- */
const BASE_H = 20; // X-Achsenhöhe (Bars & Waterfall)
const BASE_B = 10; // bottom margin (Bars & Waterfall)
const FIT_EXTRA = -27; // Fit-Outs zusätzlich tiefer als Bars/Waterfall (0 = gleiche Linie)
/* --------------------------------------------------------------------- */

/* Fixe Y-Position für die Top-Labels im Waterfall (Pixel ab Plot-Top) */
const WF_TOP_LABEL_Y = 48;

/* ---------- utils ---------- */
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

/* ---------- helpers ---------- */
function Money({ value }) {
  const cls = value < 0 ? "text-red-600 font-medium" : "text-gray-900 font-medium";
  return <span className={cls}>{FCUR(value)}</span>;
}
function Delta({ base, val }) {
  const pct = base > 0 ? ((val - base) / base) * 100 : 0;
  const up = pct > 0, down = pct < 0, sign = pct > 0 ? "+" : "";
  return (
    <span className={`${down ? "text-red-600" : up ? "text-green-600" : "text-gray-500"} font-medium ml-2`}>
      {down ? "▼" : up ? "▲" : "■"} {sign}{F(pct, 2)}%
    </span>
  );
}

/* ---------- inputs ---------- */
function NumericField({
  label, value, onChange, format = "2dec", step = 1, min = 0,
  readOnly = false, onCommit, suffix,
}) {
  const [focus, setFocus] = useState(false);
  const num = P(value);
  const show = focus ? value : format === "int" ? F(num, 0) : format === "1dec" ? F(num, 1) : F(num, 2);
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
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))}
          className={`mt-1 block w-full border rounded-md p-2 pr-16 ${readOnly ? "bg-gray-100 text-gray-600" : ""}`}
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

/* ---------- chart labels ---------- */
const PercentLabel = ({ x, y, width, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2;
  const fill = value < 0 ? "#dc2626" : "#16a34a";
  const sign = value > 0 ? "+" : "";
  return (
    <text x={cx} y={y - 18} textAnchor="middle" fill={fill} fontSize={12} fontWeight="700">
      {sign}{F(value, 2)}%
    </text>
  );
};
const BarNumberLabel = ({ x, y, width, height, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={12} fontWeight="800">
      {F(value, 2)}
    </text>
  );
};
const VerticalMoneyLabel0 = ({ x, y, width, height, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2, cy = y + height / 2;
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

/* ---------- Waterfall: Labels immer oben in einer Linie ---------- */
const makeWFLabelTop = (data, fixedY) => (props) => {
  const { x = 0, width = 0, index, value, payload } = props || {};
  const d = Array.isArray(data) && Number.isInteger(index) ? data[index] : {};
  const cx = x + width / 2;

  const raw = Number.isFinite(d?.delta) ? d.delta
            : Number.isFinite(payload?.delta) ? payload.delta
            : Number.isFinite(value) ? value
            : 0;
  const v = Math.round(raw * 100) / 100;
  const abs = Math.abs(v);

  if (d?.isTotal) {
    const pos = v >= 0;
    return (
      <text x={cx} y={fixedY} textAnchor="middle" fill={pos ? "#16a34a" : "#dc2626"} fontSize={12} fontWeight="800">
        {pos ? "" : "−"}{F(Math.abs(v), 2)}
      </text>
    );
  }
  if (abs < 0.005) return null;
  return (
    <text x={cx} y={fixedY} textAnchor="middle" fill="#dc2626" fontSize={12} fontWeight="800">
      −{F(abs, 2)}
    </text>
  );
};

/* ---------- Chart components ---------- */
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
        <XAxis dataKey="name" height={Math.max(0, BASE_H)} tick={{ fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip formatter={(v, n) => (n === "sqm" ? `${F(v, 2)} €/sqm` : `${F(v, 2)}%`)} />
        <ReferenceLine y={0} />
        <Bar dataKey="sqm" barSize={36} isAnimationActive={!isExporting}>
          <LabelList dataKey="pct" content={<PercentLabel />} />
          <LabelList dataKey="sqm" content={<BarNumberLabel />} />
          {data.map((e, i) => (
            <Cell key={i} fill={e.color} stroke={e.name === "Final" ? "#dc2626" : undefined} strokeWidth={e.name === "Final" ? 2 : undefined} />
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
        <XAxis dataKey="name" interval={0} height={Math.max(0, BASE_H)} tick={{ fontSize: 12, fontWeight: 700 }} />
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
        <Bar dataKey="delta" stackId="wf" barSize={44} isAnimationActive={!isExporting}>
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

  /* parsed + derived Werte ... (gekürzt für Übersicht) */

  // (==> Belasse deine Berechnungen ner1–ner4, wfData, etc. unverändert)

  /* ---------- UI ---------- */
  return (
    <div style={{ backgroundColor: "#005CA9" }}>
      <div ref={pageRef} className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md">
        <h2 className="text-3xl font-bold mb-2 text-center" style={{ color: "#005CA9" }}>
          Net Effective Rent (NER) Calculator
        </h2>

        {/* Headline Rent Banner */}
        <div className="mt-4">
          <div className="rounded-lg ring-1 ring-sky-300 bg-sky-50 px-4 py-2 flex items-center justify-between">
            <div className="text-sky-700 font-bold text-sm">🏢 Headline Rent</div>
            <div className="text-lg font-bold text-gray-900">{F(rent, 2)} €/sqm</div>
          </div>
        </div>

        {/* ... Rest deines Codes (Inputs, Charts, Export, Final NER Banner) ... */}

        {/* Final NER Banner */}
        <div className="mt-6">
          <div className="rounded-2xl ring-2 ring-sky-500 bg-sky-50 px-5 py-3 flex items-center justify-between shadow-sm">
            <div className="text-sky-700 font-extrabold text-base">🏁 Final NER</div>
            <div className="text-2xl font-extrabold tracking-tight text-gray-900">{F(ner4, 2)} €/sqm</div>
            <div className="ml-4 text-sm"><Delta base={rent} val={ner4} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
