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
const FCUR0 = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

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

/* ---------- Input-Feld ---------- */
function NumericField({ label, value, onChange, format = "2dec", step = 1, min = 0, readOnly = false, suffix }) {
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

/* ---------- Chart Labels ---------- */
const BarNumberLabel = ({ x, y, width, height, value }) => {
  if (!Number.isFinite(value)) return null;
  const cx = x + width / 2, cy = y + height / 2;
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
    <text x={cx} y={cy} transform={`rotate(-90, ${cx}, ${cy})`} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize={16} fontWeight="800">
      {FCUR0(value)}
    </text>
  );
};

/* ---------- Charts ---------- */
function BarsChart({ data, isExporting }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 28, right: 6, bottom: 10, left: 6 }}>
        <XAxis dataKey="name" height={20} tick={{ fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip formatter={(v, n) => (n === "sqm" ? `${F(v, 2)} €/sqm` : `${F(v, 2)}%`)} />
        <ReferenceLine y={0} />
        <Bar dataKey="sqm" barSize={36} isAnimationActive={!isExporting}>
          <LabelList dataKey="sqm" content={<BarNumberLabel />} />
          {data.map((e, i) => (
            <Cell key={i} fill={e.color} stroke={e.name === "Final" ? "#dc2626" : undefined} strokeWidth={e.name === "Final" ? 2 : undefined} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [f, setF] = useState({
    tenant: "Tenant",
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

  const nla = clamp(P(f.nla));
  const addon = clamp(P(f.addon));
  const rent = clamp(P(f.rent));
  const duration = Math.max(0, Math.floor(P(f.duration)));
  const rf = clamp(P(f.rf));
  const agent = clamp(P(f.agent));
  const unforeseen = clamp(P(f.unforeseen));
  const gla = nla * (1 + addon / 100);

  const months = Math.max(0, duration - rf);
  const gross = rent * gla * months;

  const perNLA = clamp(P(f.fitPerNLA));
  const perGLA = clamp(P(f.fitPerGLA));
  const tot = clamp(P(f.fitTot));
  const totalFit = f.fitMode === "perNLA" ? perNLA * nla : f.fitMode === "perGLA" ? perGLA * gla : tot;

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

  const NER_COLORS = ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"];
  const nerBars = [
    { name: "Headline", sqm: rent, pct: null, color: "#065f46" },
    { name: "NER 1", sqm: ner1, pct: null, color: NER_COLORS[0] },
    { name: "NER 2", sqm: ner2, pct: null, color: NER_COLORS[1] },
    { name: "NER 3", sqm: ner3, pct: null, color: NER_COLORS[2] },
    { name: "Final", sqm: ner4, pct: null, color: NER_COLORS[3] },
  ];

  /* Export PNG */
  const pageRef = useRef(null);
  const resultsContentRef = useRef(null);
  const exportNode = async (node, filename) => {
    if (!node) return;
    try {
      setIsExporting(true);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 3, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (e) {
      console.error("PNG export failed", e);
    } finally {
      setIsExporting(false);
    }
  };
  const exportResultsPNG = () => exportNode(resultsContentRef.current, "ner-results.png");
  const exportFullPNG = () => exportNode(pageRef.current, "ner-full.png");

  /* Export Project as HTML */
  const exportProjectHTML = () => {
    const name = prompt("Bitte Dateiname eingeben:", f.tenant || "ner-project");
    if (!name) return;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>NER Project - ${f.tenant}</title>
    <script>
      window.NER_PROJECT = ${JSON.stringify(f)};
      window.onload = function() {
        // Weiterleitung auf deine App mit Query-Parametern
        const data = encodeURIComponent(JSON.stringify(window.NER_PROJECT));
        window.location.href = "https://net-effective-rent-calculator.vercel.app/?data=" + data;
      }
    </script>
  </head>
  <body>
    <p>Loading project <b>${f.tenant}</b>...</p>
  </body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.html`;
    a.click();
  };

  return (
    <div style={{ backgroundColor: "#005CA9" }}>
      <div ref={pageRef} className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md">
        <h2 className="text-3xl font-bold mb-2 text-center" style={{ color: "#005CA9" }}>
          Net Effective Rent (NER) Calculator
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Inputs */}
          <div className="space-y-4">
            <NumericField label="NLA (sqm)" value={f.nla} onChange={S("nla")} />
            <NumericField label="Add-On (%)" value={f.addon} onChange={S("addon")} />
            <NumericField label="Headline Rent €/sqm" value={f.rent} onChange={S("rent")} />
            <NumericField label="Lease Term (months)" value={f.duration} onChange={S("duration")} />
            <NumericField label="Rent-Free (months)" value={f.rf} onChange={S("rf")} />
            <NumericField label="Agent Fees (months)" value={f.agent} onChange={S("agent")} />
            <NumericField label="Unforeseen Costs (€)" value={f.unforeseen} onChange={S("unforeseen")} />
          </div>

          {/* RIGHT: Results */}
          <div className="md:sticky md:top-6 h-fit">
            <div className="rounded-lg border p-4 space-y-2 bg-white">
              <div ref={resultsContentRef}>
                <div className="font-bold">Headline Rent: {F(rent, 2)} €/sqm</div>
                <div>Total Headline Rent: <Money value={totalHeadline} /></div>
                <div>Total Rent Frees: <Money value={-totalRentFrees} /></div>
                <div>Total Agent Fees: <Money value={-totalAgentFees} /></div>
                <div>Unforeseen Costs: <Money value={-totalUnforeseen} /></div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={exportResultsPNG} className="px-3 py-1.5 border rounded">Export Results PNG</button>
                <button onClick={exportFullPNG} className="px-3 py-1.5 border rounded">Export Full PNG</button>
                <button onClick={exportProjectHTML} className="px-3 py-1.5 border rounded">Export Project HTML</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
