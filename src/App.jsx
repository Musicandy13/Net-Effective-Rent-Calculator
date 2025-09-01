import { useEffect, useMemo, useState, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import { toPng } from "html-to-image";

/* ---------- utils ---------- */
const clamp = (n, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : 0);
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
    maximumFractionDigits: 0, // Fit-Out besser ohne Kommastellen
  });

/* ---------- delta badge ---------- */
function Delta({ base, val }) {
  const pct = base > 0 ? ((val - base) / base) * 100 : 0;
  const rounded = Math.abs(pct) < 0.005 ? 0 : pct;
  const down = rounded < 0;
  return (
    <span className={`${down ? "text-red-600" : "text-green-600"} font-medium ml-2`}>
      {down ? "▼" : "▲"} {F(Math.abs(rounded), 2)}%
    </span>
  );
}

/* ---------- numeric input ---------- */
function NumericField({ label, value, onChange, format = "2dec", step = 1, min = 0, readOnly = false, suffix }) {
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
const VerticalMoneyLabel = ({ x, y, value }) => (
  <text x={x + 20} y={y + 10} fill="white" fontWeight="bold" transform={`rotate(-90, ${x + 20}, ${y + 10})`}>
    {FCUR(value)}
  </text>
);
const BarNumberLabel = ({ x, y, width, height, value }) => (
  <text x={x + width / 2} y={y + height / 2} fill="white" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
    {F(value, 2)}
  </text>
);
const PercentLabel = ({ x, width, value }) => (
  <text x={x + width / 2} y={20} fill="red" fontWeight="bold" textAnchor="middle">
    {F(value, 2)}%
  </text>
);

/* ---------- app ---------- */
export default function App() {
  const [f, setF] = useState({
    tenant: "",
    nla: "1000",
    addon: "5.00",
    rent: "15.00",
    duration: "60",
    rf: "7.0",
    agent: "2.0",
    fitMode: "perNLA",
    fitPerNLA: "150.00",
    fitPerGLA: "",
    fitTot: "150000.00",
    unforeseen: "0",
  });
  const [isExporting, setIsExporting] = useState(false);
  const S = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const nla = clamp(P(f.nla));
  const addon = clamp(P(f.addon));
  const rent = clamp(P(f.rent));
  const duration = Math.max(0, Math.floor(P(f.duration)));
  const rf = clamp(P(f.rf));
  const agent = clamp(P(f.agent));
  const unforeseen = clamp(P(f.unforeseen));
  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const months = Math.max(0, duration - rf);
  const gross = rent * gla * months;

  const perNLA = clamp(P(f.fitPerNLA));
  const perGLA = clamp(P(f.fitPerGLA));
  const tot = clamp(P(f.fitTot));

  useEffect(() => {
    const nNLA = clamp(P(f.fitPerNLA));
    const nGLA = clamp(P(f.fitPerGLA));
    const nTot = clamp(P(f.fitTot));
    if (f.fitMode === "perNLA") {
      const t = nNLA * nla;
      const g = gla > 0 ? t / gla : 0;
      S("fitTot")(String(t));
      S("fitPerGLA")(String(g));
    } else if (f.fitMode === "perGLA") {
      const t = nGLA * gla;
      const n = nla > 0 ? t / nla : 0;
      S("fitTot")(String(t));
      S("fitPerNLA")(String(n));
    } else {
      const n = nla > 0 ? nTot / nla : 0;
      const g = gla > 0 ? nTot / gla : 0;
      S("fitPerNLA")(String(n));
      S("fitPerGLA")(String(g));
    }
  }, [f.fitMode, f.nla, f.addon, f.fitPerNLA, f.fitPerGLA, f.fitTot]);

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

  // Farben
  const FIT_OUT_COLOR = "#c2410c";
  const NER_COLORS = ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"];
  const chartFitOutData = [{ name: "Fit-Outs", eur: totalFit }];
  const nerBars = [
    { label: "Headline", val: rent },
    { label: "NER 1", val: ner1 },
    { label: "NER 2", val: ner2 },
    { label: "NER 3", val: ner3 },
    { label: "Final", val: ner4 },
  ].map((d, i) => ({
    name: d.label,
    sqm: d.val,
    pct: rent > 0 ? ((d.val - rent) / rent) * 100 : 0,
    color: i === 0 ? "darkgreen" : NER_COLORS[i - 1],
  }));

  const resultsContentRef = useRef(null);

  const exportResultsPNG = async () => {
    if (!resultsContentRef.current) return;
    try {
      setIsExporting(true);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const node = resultsContentRef.current;
      const rect = node.getBoundingClientRect();
      const pad = 24;
      const w = Math.ceil(rect.width) + pad * 2;
      const h = Math.ceil(rect.height) + pad * 2;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        width: w,
        height: h,
        canvasWidth: w,
        canvasHeight: h,
        style: { padding: `${pad}px`, margin: "0", overflow: "visible", boxShadow: "none", borderRadius: "0" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "ner-results.png";
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-6"> {/* GANZER Hintergrund weiß */}
      <div className="p-6 max-w-6xl mx-auto bg-[#F3FCC4] rounded-xl shadow-md"> {/* Innen Box Lemongras */}
        <h2 className="text-2xl font-bold mb-4 text-center">Net Effective Rent Calculator</h2>
        <input
          type="text"
          placeholder="Tenant"
          value={f.tenant}
          onChange={(e) => S("tenant")(e.target.value)}
          className="block mx-auto mb-4 border rounded-md p-2 w-64 text-center"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <NumericField label="NLA (sqm)" value={f.nla} onChange={S("nla")} />
              <NumericField label="Add-On (%)" value={f.addon} onChange={S("addon")} />
              <label className="block">
                <span className="text-gray-700">GLA (sqm)</span>
                <input readOnly value={F(gla, 2)} className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600" />
              </label>
              <NumericField label="Headline Rent €/sqm" value={f.rent} onChange={S("rent")} />
              <NumericField label="Lease Term (months)" value={f.duration} onChange={S("duration")} format="int" />
              <NumericField label="Rent-Free (months)" value={f.rf} onChange={S("rf")} />
            </div>
            {/* Fit-Out block */}
            <div className="border rounded-md p-3 bg-white">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <span className="text-gray-700 font-medium">Fit-Out Input:</span>
                <label><input type="radio" checked={f.fitMode === "perNLA"} onChange={() => S("fitMode")("perNLA")} /> €/sqm (NLA)</label>
                <label><input type="radio" checked={f.fitMode === "perGLA"} onChange={() => S("fitMode")("perGLA")} /> €/sqm (GLA)</label>
                <label><input type="radio" checked={f.fitMode === "total"} onChange={() => S("fitMode")("total")} /> Total (€)</label>
              </div>
              <NumericField label="Fit-Out €/sqm (NLA)" value={f.fitPerNLA} onChange={S("fitPerNLA")} readOnly={f.fitMode !== "perNLA"} suffix="€/sqm" />
              <NumericField label="Fit-Out €/sqm (GLA)" value={f.fitPerGLA} onChange={S("fitPerGLA")} readOnly={f.fitMode !== "perGLA"} suffix="€/sqm" />
              <NumericField label="Fit-Out Total (€)" value={f.fitTot} onChange={S("fitTot")} readOnly={f.fitMode !== "total"} suffix="€" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumericField label="Agent Fees (months)" value={f.agent} onChange={S("agent")} />
              <NumericField label="Unforeseen Costs (lump sum €)" value={f.unforeseen} onChange={S("unforeseen")} suffix="€" />
            </div>
          </div>
          {/* RIGHT Results */}
          <div className="md:sticky md:top-6 h-fit" ref={resultsContentRef}>
            <div className="rounded-lg border p-4 space-y-2 bg-white">
              {f.tenant && <p className="font-bold text-lg underline mb-2">Tenant: {f.tenant}</p>}
              <p><strong>Headline Rent:</strong> {F(rent, 2)} €/sqm</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2 mt-1">
                <div>Total Headline Rent</div><div className="text-right">{FCUR(totalHeadline)}</div>
                <div>Total Rent Frees</div><div className="text-right text-red-600">-{FCUR(totalRentFrees)}</div>
                <div>Total Agent Fees</div><div className="text-right text-red-600">-{FCUR(totalAgentFees)}</div>
                <div>Unforeseen Costs</div><div className="text-right text-red-600">-{FCUR(totalUnforeseen)}</div>
              </div>
              <p className="text-sm text-red-500 font-semibold">Total Fit Out Costs: {FCUR(totalFit)}</p>
              <p>1️⃣ NER incl. Rent Frees: <b>{F(ner1, 2)} €/sqm</b><Delta base={rent} val={ner1} /></p>
              <p>2️⃣ incl. Rent Frees & Fit-Outs: <b>{F(ner2, 2)} €/sqm</b><Delta base={rent} val={ner2} /></p>
              <p>3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{F(ner3, 2)} €/sqm</b><Delta base={rent} val={ner3} /></p>
              {/* Charts row */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="h-60 border rounded p-2 col-span-1">
                  <div className="text-sm font-bold text-center mb-1">Total Fit-Outs</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartFitOutData}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip formatter={(v) => FCUR(v)} />
                      <Bar dataKey="eur" fill={FIT_OUT_COLOR} barSize={50} isAnimationActive={!isExporting}>
                        <LabelList content={<VerticalMoneyLabel />} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-60 border rounded p-2 col-span-2">
                  <div className="text-sm font-bold text-center mb-1">NER vs Headline (€/sqm)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nerBars}>
                      <XAxis dataKey="name" />
                      <YAxis hide />
                      <Tooltip formatter={(v, n) => (n === "sqm" ? `${F(v, 2)} €/sqm` : `${F(v, 2)}%`)} />
                      <Bar dataKey="sqm" barSize={40} isAnimationActive={!isExporting}>
                        <LabelList dataKey="sqm" content={<BarNumberLabel />} />
                        <LabelList dataKey="pct" content={<PercentLabel />} />
                        {nerBars.map((entry, index) => (
                          <Cell key={index} fill={entry.color} stroke={entry.name === "Final" ? "#dc2626" : undefined} strokeWidth={entry.name === "Final" ? 2 : undefined} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="border-t pt-2 mt-6">
                4️⃣ <b>Final NER</b> (incl. all above + Unforeseen): <b>{F(ner4, 2)} €/sqm</b>
                <Delta base={rent} val={ner4} />
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={exportResultsPNG} className="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm">
            Export Results PNG
          </button>
        </div>
      </div>
    </div>
  );
}
