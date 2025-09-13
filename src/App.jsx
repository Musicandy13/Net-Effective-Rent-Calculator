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
  step = 1,
  min = 0,
  readOnly = false,
  suffix,
}) {
  const [focus, setFocus] = useState(false);
  const num = P(value);
  const show = focus ? value : F(num, 2);
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
          }}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^\d.,-]/g, ""))
          }
          className={`mt-1 block w-full border rounded-md p-2 ${
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

/* ---------- Charts ---------- */
function BarsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        barCategoryGap={18}
        margin={{ top: 28, right: 6, bottom: 20, left: 6 }}
      >
        <XAxis dataKey="name" height={20} tick={{ fontSize: 12 }} />
        <YAxis hide />
        <Tooltip formatter={(v) => `${F(v, 2)} €/sqm`} />
        <ReferenceLine y={0} />
        <Bar dataKey="sqm" barSize={36}>
          <LabelList dataKey="sqm" position="center" />
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
    fitPerNLA: "300.00",
    unforeseen: "0",
  });
  const S = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  /* parsed values */
  const nla = clamp(P(f.nla));
  const addon = clamp(P(f.addon));
  const rent = clamp(P(f.rent));
  const duration = Math.max(0, Math.floor(P(f.duration)));
  const rf = clamp(P(f.rf));
  const agent = clamp(P(f.agent));
  const unforeseen = clamp(P(f.unforeseen));

  /* derived values */
  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const months = Math.max(0, duration - rf);
  const gross = rent * gla * months;

  const totalFit = clamp(P(f.fitPerNLA)) * nla;
  const agentFees = agent * rent * gla;
  const denom = Math.max(1e-9, duration * gla);

  const ner1 = gross / denom;
  const ner2 = (gross - totalFit) / denom;
  const ner3 = (gross - totalFit - agentFees) / denom;
  const ner4 = (gross - totalFit - agentFees - unforeseen) / denom;

  const totalHeadline = rent * gla * duration;
  const totalRentFrees = rent * gla * rf;
  const totalAgentFees = agentFees;
  const totalUnforeseen = unforeseen;

  /* Charts */
  const nerBars = [
    { name: "Headline", sqm: rent, color: "#065f46" },
    { name: "NER 1", sqm: ner1, color: "#2563eb" },
    { name: "NER 2", sqm: ner2, color: "#3b82f6" },
    { name: "NER 3", sqm: ner3, color: "#60a5fa" },
    { name: "Final", sqm: ner4, color: "#0ea5e9" },
  ];

  /* Export PNG with filename prompt */
  const pageRef = useRef(null);
  const resultsContentRef = useRef(null);

  const exportNode = async (node, defaultName) => {
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });

      const baseName = f.tenant?.trim() || defaultName;
      const name =
        prompt("Bitte Dateiname eingeben:", baseName) || baseName;

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${name}.png`;
      a.click();
    } catch (e) {
      console.error("PNG export failed", e);
    }
  };

  const exportResultsPNG = () =>
    exportNode(resultsContentRef.current, "ner-results");
  const exportFullPNG = () =>
    exportNode(pageRef.current, "ner-full");

  /* Export Project as HTML */
  const exportProjectHTML = () => {
    const params = new URLSearchParams(f).toString();
    const html = `<html><head><meta http-equiv="refresh" content="0; url=?${params}"></head><body></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    const filename = (f.tenant?.trim() || "ner-project") + ".html";
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  /* ---------- UI ---------- */
  return (
    <div
      ref={pageRef}
      className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md"
    >
      <h2 className="text-3xl font-bold mb-4 text-center text-blue-800">
        Net Effective Rent (NER) Calculator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <NumericField label="NLA (sqm)" value={f.nla} onChange={S("nla")} />
          <NumericField
            label="Add-On (%)"
            value={f.addon}
            onChange={S("addon")}
          />
          <NumericField
            label="Headline Rent €/sqm"
            value={f.rent}
            onChange={S("rent")}
          />
          <NumericField
            label="Lease Term (months)"
            value={f.duration}
            onChange={S("duration")}
          />
          <NumericField
            label="Rent-Free (months)"
            value={f.rf}
            onChange={S("rf")}
          />
          <NumericField
            label="Agent Fees (months)"
            value={f.agent}
            onChange={S("agent")}
          />
          <NumericField
            label="Unforeseen Costs (€)"
            value={f.unforeseen}
            onChange={S("unforeseen")}
          />
        </div>

        {/* Results */}
        <div className="rounded-lg border p-4 space-y-2 bg-white">
          <div ref={resultsContentRef}>
            <div className="mt-1 rounded-xl ring-2 ring-blue-300 bg-blue-50 px-4 py-2 flex items-center justify-between shadow-sm mb-3">
              <div className="font-bold text-lg">Headline Rent</div>
              <div className="text-lg font-extrabold tracking-tight text-gray-900">
                {F(rent, 2)} €/sqm
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
              <div>Total Headline Rent</div>
              <div className="text-right">
                <Money value={totalHeadline} />
              </div>
              <div>Total Rent Frees</div>
              <div className="text-right">
                <Money value={-totalRentFrees} />
              </div>
              <div>Total Agent Fees</div>
              <div className="text-right">
                <Money value={-totalAgentFees} />
              </div>
              <div>Unforeseen Costs</div>
              <div className="text-right">
                <Money value={-totalUnforeseen} />
              </div>
            </div>

            {/* Charts */}
            <div className="h-64">
              <BarsChart data={nerBars} />
            </div>

            {/* Final NER */}
            <div className="mt-4 border-t pt-3">
              <div className="mt-3 rounded-2xl ring-2 ring-sky-500 bg-sky-50 px-5 py-3 flex items-center justify-between shadow-md">
                <div className="text-sky-700 font-extrabold text-base">
                  🏁 Final NER
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {F(ner4, 2)} €/sqm
                </div>
                <div className="ml-4 text-sm">
                  <Delta base={rent} val={ner4} />
                </div>
              </div>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={exportResultsPNG}
              className="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm"
            >
              Export Results PNG
            </button>
            <button
              onClick={exportFullPNG}
              className="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm"
            >
              Export Full PNG
            </button>
            <button
              onClick={exportProjectHTML}
              className="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm"
            >
              Export Project HTML
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
