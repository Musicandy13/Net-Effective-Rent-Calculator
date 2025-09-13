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
  const up = pct > 0, down = pct < 0, sign = pct > 0 ? "+" : "";
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

  // 👇 Fix: beim Öffnen gespeicherte Daten aus URL ?data=... laden
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("data");
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        setF((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Invalid data param", e);
      }
    }
  }, []);

  /* parsed values */
  const nla = clamp(P(f.nla));
  const addon = clamp(P(f.addon));
  const rent = clamp(P(f.rent));
  const duration = Math.max(0, Math.floor(P(f.duration)));
  const rf = clamp(P(f.rf));
  const agent = clamp(P(f.agent));
  const unforeseen = clamp(P(f.unforeseen));

  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const gross = rent * gla * (duration - rf);
  const agentFees = agent * rent * gla;
  const denom = Math.max(1e-9, duration * gla);

  const totalFit =
    f.fitMode === "perNLA"
      ? P(f.fitPerNLA) * nla
      : f.fitMode === "perGLA"
      ? P(f.fitPerGLA) * gla
      : P(f.fitTot);

  const ner1 = gross / denom;
  const ner2 = (gross - totalFit) / denom;
  const ner3 = (gross - totalFit - agentFees) / denom;
  const ner4 = (gross - totalFit - agentFees - unforeseen) / denom;

  const totalHeadline = rent * gla * duration;
  const totalRentFrees = rent * gla * rf;

  /* ---------- Export Project as HTML ---------- */
  const exportProjectHTML = () => {
    const dataStr = encodeURIComponent(JSON.stringify(f));
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>NER Project</title></head>
<body>
<script>window.location.href = "${window.location.origin}?data=${dataStr}";</script>
</body>
</html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${f.tenant?.trim() || "project"}.html`;
    a.click();
  };

  return (
    <div style={{ backgroundColor: "#005CA9" }}>
      <div className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md">
        <h2 className="text-3xl font-bold mb-2 text-center text-blue-900">
          Net Effective Rent (NER) Calculator
        </h2>

        {/* Tenant */}
        <div className="mb-4 flex justify-center">
          <div className="w-full md:w-1/2">
            <input
              type="text"
              value={f.tenant}
              onChange={(e) => S("tenant")(e.target.value)}
              placeholder="Tenant"
              className="mt-1 block w-full border rounded-md p-2 text-center"
            />
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
              <NumericField label="Lease Term (months)" value={f.duration} onChange={S("duration")} />
              <NumericField label="Rent-Free (months)" value={f.rf} onChange={S("rf")} />
              <NumericField label="Agent Fees (months)" value={f.agent} onChange={S("agent")} />
              <NumericField label="Unforeseen Costs (€)" value={f.unforeseen} onChange={S("unforeseen")} />
            </div>
          </div>

          {/* RIGHT: Results */}
          <div className="rounded-lg border p-4 space-y-2 bg-white">
            {f.tenant && (
              <div className="mb-3">
                <span className="text-xl font-bold">
                  Tenant: <u>{f.tenant}</u>
                </span>
              </div>
            )}
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
                <Money value={-agentFees} />
              </div>
              <div>Unforeseen Costs</div>
              <div className="text-right">
                <Money value={-unforeseen} />
              </div>
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="mt-3 rounded-2xl ring-2 ring-sky-500 bg-sky-50 px-5 py-3 flex items-center justify-between shadow-md">
                <div className="text-sky-700 font-extrabold text-base">🏁 Final NER</div>
                <div className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {F(ner4, 2)} €/sqm
                </div>
                <div className="ml-4 text-sm">
                  <Delta base={rent} val={ner4} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={exportProjectHTML}
            className="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm"
          >
            Export Project HTML
          </button>
        </div>
      </div>
    </div>
  );
}
