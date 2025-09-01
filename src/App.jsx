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
  });
const FCUR0 = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/* Geldwert mit Farbe je nach Vorzeichen */
function Money({ value }) {
  const cls = value < 0 ? "text-red-600 font-medium" : "text-gray-900 font-medium";
  return <span className={cls}>{FCUR(value)}</span>;
}

/* ---------- Delta-Badge (rot wenn unter Headline) ---------- */
function Delta({ base, val }) {
  const pct = base > 0 ? ((val - base) / base) * 100 : 0;
  const up = pct > 0;
  const down = pct < 0;
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={`${down ? "text-red-600" : up ? "text-green-600" : "text-gray-500"} font-medium ml-2`}>
      {down ? "▼" : up ? "▲" : "■"} {sign}{F(pct, 2)}%
    </span>
  );
}

/* ---------- Numeric Input ---------- */
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

/* ---------- Custom Chart Labels ---------- */
// Prozentlabel: exakt über dem Balken, mittig ausgerichtet
const PercentLabel = ({ x, y, width, value }) => {
  if (value == null) return null;
  const cx = x + width / 2;
  const fill = value < 0 ? "#dc2626" : "#16a34a";
  const sign = value > 0 ? "+" : "";
  return (
    <text x={cx} y={y - 6} textAnchor="middle" fill={fill} fontSize={12} fontWeight="700">
      {sign}{F(value, 2)}%
    </text>
  );
};
// Zahlen im NER-Balken: horizontal & vertikal zentriert, fett
const BarNumberLabel = ({ x, y, width, height, value }) => {
  if (value == null) return null;
  const cx = x + width / 2;
  const cy = y + height / 2;
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
// Fit-Outs: vertikal (90° gedreht), ohne Nachkommastellen, mittig im Balken
const VerticalMoneyLabel0 = ({ x, y, width, height, value }) => {
  if (value == null) return null;
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <text
      x={cx}
      y={cy}
      transform={`rotate(-90, ${cx}, ${cy})`}
      textAnchor="middle"
      fill="#ffffff"
      fontSize={16}
      fontWeight="800"
    >
      {FCUR0(value)}
    </text>
  );
};

/* ---------- App ---------- */
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
  const S = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  // parsed
  const nla = clamp(P(f.nla));
  const addon = clamp(P(f.addon));
  const rent = clamp(P(f.rent));
  const duration = Math.max(0, Math.floor(P(f.duration)));
  const rf = clamp(P(f.rf));
  const agent = clamp(P(f.agent));
  const unforeseen = clamp(P(f.unforeseen));

  // derived
  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const months = Math.max(0, duration - rf);
  const gross = rent * gla * months;

  const perNLA = clamp(P(f.fitPerNLA));
  const perGLA = clamp(P(f.fitPerGLA));
  const tot = clamp(P(f.fitTot));

  // Sync Fit-Out Eingaben
  useEffect(() => {
    const nNLA = clamp(P(f.fitPerNLA));
    const nGLA = clamp(P(f.fitPerGLA));
    const nTot = clamp(P(f.fitTot));
    if (f.fitMode === "perNLA") {
      const t = nNLA * nla;
      const g = gla > 0 ? t / gla : 0;
      if (Math.abs(t - nTot) > 1e-9) S("fitTot")(String(t));
      if (Math.abs(g - nGLA) > 1e-9) S("fitPerGLA")(String(g));
    } else if (f.fitMode === "perGLA") {
      const t = nGLA * gla;
      const n = nla > 0 ? t / nla : 0;
      if (Math.abs(t - nTot) > 1e-9) S("fitTot")(String(t));
      if (Math.abs(n - nNLA) > 1e-9) S("fitPerNLA")(String(n));
    } else {
      const n = nla > 0 ? nTot / nla : 0;
      const g = gla > 0 ? nTot / gla : 0;
      if (Math.abs(n - nNLA) > 1e-9) S("fitPerNLA")(String(n));
      if (Math.abs(g - nGLA) > 1e-9) S("fitPerGLA")(String(g));
    }
  }, [f.fitMode, f.nla, f.addon, f.fitPerNLA, f.fitPerGLA, f.fitTot]);

  const totalFit =
    f.fitMode === "perNLA" ? perNLA * nla : f.fitMode === "perGLA" ? perGLA * gla : tot;

  const agentFees = agent * rent * gla; // EUR
  const denom = Math.max(1e-9, duration * gla);

  // NERs
  const ner1 = gross / denom;
  const ner2 = (gross - totalFit) / denom;
  const ner3 = (gross - totalFit - agentFees) / denom;
  const ner4 = (gross - totalFit - agentFees - unforeseen) / denom;

  // Absolute Totals (EUR)
  const totalHeadline = rent * gla * duration;
  const totalRentFrees = rent * gla * rf;
  const totalAgentFees = agentFees;
  const totalUnforeseen = unforeseen;

  // Farben
  const FIT_OUT_COLOR = "#c2410c";   // Orange
  const HEADLINE_COLOR = "#065f46";  // Dunkelgrün
  const NER_COLORS = ["#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"]; // Blautöne

  // Chart-Daten
  const chartFitOutData = [{ name: "Fit-Outs", eur: totalFit }];
  const nerBars = [
    { label: "Headline", val: rent, pct: null, color: HEADLINE_COLOR },
    { label: "NER 1", val: ner1, pct: rent > 0 ? ((ner1 - rent) / rent) * 100 : null, color: NER_COLORS[0] },
    { label: "NER 2", val: ner2, pct: rent > 0 ? ((ner2 - rent) / rent) * 100 : null, color: NER_COLORS[1] },
    { label: "NER 3", val: ner3, pct: rent > 0 ? ((ner3 - rent) / rent) * 100 : null, color: NER_COLORS[2] },
    { label: "Final",   val: ner4, pct: rent > 0 ? ((ner4 - rent) / rent) * 100 : null, color: NER_COLORS[3] },
  ].map(d => ({ name: d.label, sqm: d.val, pct: d.pct, color: d.color }));

  // PNG export (nur Card-Inhalt, der Button bleibt draußen)
  const resultsCardRef = useRef(null); // gesamte Card
  const resultsContentRef = useRef(null); // NUR Inhalt
  const downloadPNG = async () => {
    if (!resultsContentRef.current) return;
    try {
      const dataUrl = await toPng(resultsContentRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "ner-results.png";
      a.click();
    } catch (e) {
      console.error("PNG export failed", e);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md">
      {/* Titel zentriert */}
      <h2 className="text-2xl font-bold mb-2 text-center">Net Effective Rent Calculator</h2>

      {/* EIN Tenant-Feld unter dem Titel */}
      <div className="mb-4 flex justify-center">
        <div className="w-full md:w-1/2">
          <label className="block text-center">
            <span className="text-gray-700">Tenant</span>
            <input
              type="text"
              value={f.tenant}
              onChange={(e) => S("tenant")(e.target.value)}
              placeholder="Tenant"
              className="mt-1 block w-full border rounded-md p-2 text-center"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <NumericField label="NLA (sqm)" value={f.nla} onChange={S("nla")} />
            <NumericField label="Add-On (%)" value={f.addon} onChange={S("addon")} />
            <label className="block">
              <span className="text-gray-700">GLA (sqm)</span>
              <input
                readOnly
                value={F(gla, 2)}
                className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
              />
            </label>
            <NumericField label="Headline Rent €/sqm" value={f.rent} onChange={S("rent")} />
            <NumericField label="Lease Term (months)" value={f.duration} onChange={S("duration")} format="int" />
            <NumericField label="Rent-Free (months)" value={f.rf} onChange={S("rf")} />
          </div>

          {/* Fit-Out block */}
          <div className="border rounded-md p-3">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <span className="text-gray-700 font-medium">Fit-Out Input:</span>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={f.fitMode === "perNLA"} onChange={() => S("fitMode")("perNLA")} />
                <span>€/sqm (NLA)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={f.fitMode === "perGLA"} onChange={() => S("fitMode")("perGLA")} />
                <span>€/sqm (GLA)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={f.fitMode === "total"} onChange={() => S("fitMode")("total")} />
                <span>Total (€)</span>
              </label>
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

        {/* RIGHT: Results */}
        <div className="md:sticky md:top-6 h-fit">
          <div ref={resultsCardRef} className="rounded-lg border p-4 space-y-2 bg-white">
            {/* Export-Button – NICHT Teil des Exports */}
            <div className="flex justify-end">
              <button
                onClick={downloadPNG}
                className="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm"
              >
                Export PNG
              </button>
            </div>

            {/* Export-Inhalt */}
            <div ref={resultsContentRef}>
              {/* Tenant groß & fett (nur Text, kein 2. Feld) */}
              {f.tenant.trim() && (
                <div className="mb-1">
                  <div className="text-xl font-bold">{f.tenant.trim()}</div>
                </div>
              )}

              <p className="mb-1">
                <strong className="text-lg">Headline Rent:</strong> <strong>{F(rent, 2)} €/sqm</strong>
              </p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                <div>Total Headline Rent</div>
                <div className="text-right"><Money value={ totalHeadline } /></div>

                <div>Total Rent Frees</div>
                <div className="text-right"><Money value={ -totalRentFrees } /></div>

                <div>Total Agent Fees</div>
                <div className="text-right"><Money value={ -totalAgentFees } /></div>

                <div>Unforeseen Costs</div>
                <div className="text-right"><Money value={ -totalUnforeseen } /></div>
              </div>

              {/* Total Fit Outs */}
              <p className="text-sm font-semibold text-red-500 mb-1">
                Total Fit Out Costs: {FCUR(totalFit)}
              </p>

              {/* NER 1–3 */}
              <p>1️⃣ NER incl. Rent Frees: <b>{F(ner1, 2)} €/sqm</b><Delta base={rent} val={ner1} /></p>
              <p>2️⃣ incl. Rent Frees & Fit-Outs: <b>{F(ner2, 2)} €/sqm</b><Delta base={rent} val={ner2} /></p>
              <p>3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{F(ner3, 2)} €/sqm</b><Delta base={rent} val={ner3} /></p>

              {/* Charts */}
              <div className="mt-4 grid grid-cols-3 gap-6">
                {/* Fit-Outs – Balken mit vertikalem Label */}
                <div className="h-60 border rounded p-2 col-span-1">
                  <div className="text-sm font-bold text-center mb-1">Total Fit-Outs</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartFitOutData}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip formatter={(v) => FCUR0(v)} />
                      <ReferenceLine y={0} />
                      <Bar dataKey="eur" fill={FIT_OUT_COLOR} barSize={40}>
                        <LabelList content={<VerticalMoneyLabel0 />} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* NER + Headline */}
                <div className="h-60 border rounded p-2 col-span-2">
                  <div className="text-sm font-bold text-center mb-1">NER vs Headline (€/sqm)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nerBars} barCategoryGap={18} barGap={4}>
                      <XAxis dataKey="name" />
                      <YAxis hide />
                      <Tooltip formatter={(v, n) => (n === "sqm" ? `${F(v, 2)} €/sqm` : `${F(v, 2)}%`)} />
                      <ReferenceLine y={0} />
                      <Bar dataKey="sqm" barSize={36}>
                        <LabelList dataKey="sqm" content={<BarNumberLabel />} />
                        <LabelList dataKey="pct" content={<PercentLabel />} />
                        {nerBars.map((e, i) => (
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
                </div>
              </div>

              {/* Final NER */}
              <p className="border-t pt-2 mt-10">
                4️⃣ <b>Final NER</b> (incl. all above + Unforeseen): <b>{F(ner4, 2)} €/sqm</b>
                <Delta base={rent} val={ner4} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
