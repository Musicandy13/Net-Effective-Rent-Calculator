import { useEffect, useMemo, useState } from "react";

/* ---------- utils ---------- */
const clamp = (n, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : 0);
const P = (v) => {
  // tolerant parse: "1 234,56" → 1234.56
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

/* ---------- delta badge (red when NER < headline) ---------- */
function Delta({ base, val }) {
  const pct = base > 0 ? ((val - base) / base) * 100 : 0;
  const rounded = Math.abs(pct) < 0.005 ? 0 : pct;
  const up = rounded > 0;
  const down = rounded < 0;
  return (
    <span
      className={`${
        down ? "text-red-600" : up ? "text-green-600" : "text-gray-500"
      } font-medium ml-2`}
      title={`${rounded.toFixed(2)}%`}
    >
      {down ? "▼" : up ? "▲" : "■"} {F(Math.abs(rounded), 2)}%
    </span>
  );
}

/* ---------- numeric input ---------- */
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

/* ---------- app ---------- */
export default function App() {
  const [f, setF] = useState({
    nla: "1000",
    addon: "5.00",
    rent: "15.00",
    duration: "60",
    rf: "7.0",
    agent: "2.0",

    // Fit-out
    fitMode: "perNLA", // "perNLA" | "perGLA" | "total"
    fitPerNLA: "150.00",
    fitPerGLA: "",
    fitTot: "150000.00",

    // Extra
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

  // fit-out fields (parsed)
  const perNLA = clamp(P(f.fitPerNLA));
  const perGLA = clamp(P(f.fitPerGLA));
  const tot = clamp(P(f.fitTot));

  /* ----- keep three fit-out inputs synchronized in BOTH directions ----- */
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
      // total €
      const n = nla > 0 ? nTot / nla : 0;
      const g = gla > 0 ? nTot / gla : 0;
      if (Math.abs(n - nNLA) > 1e-9) S("fitPerNLA")(String(n));
      if (Math.abs(g - nGLA) > 1e-9) S("fitPerGLA")(String(g));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.fitMode, f.nla, f.addon, f.fitPerNLA, f.fitPerGLA, f.fitTot]);

  const totalFit =
    f.fitMode === "perNLA" ? perNLA * nla : f.fitMode === "perGLA" ? perGLA * gla : tot;

  const agentFees = agent * rent * gla;
  const denom = Math.max(1e-9, duration * gla);

  const ner1 = gross / denom; // Rent frees only
  const ner2 = (gross - totalFit) / denom;
  const ner3 = (gross - totalFit - agentFees) / denom;
  const ner4 = (gross - totalFit - agentFees - unforeseen) / denom; // Final NER

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>

      <div className="grid grid-cols-2 gap-4">
        <NumericField label="NLA (sqm)" value={f.nla} onChange={S("nla")} format="2dec" step={1} />
        <NumericField label="Add-On (%)" value={f.addon} onChange={S("addon")} format="2dec" step={0.5} />
        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input
            readOnly
            value={F(gla, 2)}
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </label>
        <NumericField
          label="Headline Rent €/sqm"
          value={f.rent}
          onChange={S("rent")}
          format="2dec"
          step={0.5}
        />
        <NumericField
          label="Lease Term (months)"
          value={f.duration}
          onChange={S("duration")}
          format="int"
          step={1}
        />
        <NumericField
          label="Rent-Free (months)"
          value={f.rf}
          onChange={S("rf")}
          format="1dec"
          step={0.5}
        />
      </div>

      {/* Fit-Out block */}
      <div className="border rounded-md p-3">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-gray-700 font-medium">Fit-Out Input:</span>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={f.fitMode === "perNLA"}
              onChange={() => S("fitMode")("perNLA")}
            />{" "}
            <span>€/sqm (NLA)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={f.fitMode === "perGLA"}
              onChange={() => S("fitMode")("perGLA")}
            />{" "}
            <span>€/sqm (GLA)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={f.fitMode === "total"}
              onChange={() => S("fitMode")("total")}
            />{" "}
            <span>Total (€)</span>
          </label>
        </div>

        <NumericField
          label="Fit-Out €/sqm (NLA)"
          value={f.fitPerNLA}
          onChange={(v) => {
            S("fitPerNLA")(v);
            if (f.fitMode === "perNLA") {
              const t = P(v) * nla;
              S("fitTot")(String(t));
              S("fitPerGLA")(String(gla > 0 ? t / gla : 0));
            }
          }}
          readOnly={f.fitMode !== "perNLA"}
          format="2dec"
          step={1}
          suffix="€/sqm"
        />
        <NumericField
          label="Fit-Out €/sqm (GLA)"
          value={f.fitPerGLA}
          onChange={(v) => {
            S("fitPerGLA")(v);
            if (f.fitMode === "perGLA") {
              const t = P(v) * gla;
              S("fitTot")(String(t));
              S("fitPerNLA")(String(nla > 0 ? t / nla : 0));
            }
          }}
          readOnly={f.fitMode !== "perGLA"}
          format="2dec"
          step={1}
          suffix="€/sqm"
        />
        <NumericField
          label="Fit-Out Total (€)"
          value={f.fitTot}
          onChange={(v) => {
            S("fitTot")(v);
            if (f.fitMode === "total") {
              const t = P(v);
              S("fitPerNLA")(String(nla > 0 ? t / nla : 0));
              S("fitPerGLA")(String(gla > 0 ? t / gla : 0));
            }
          }}
          readOnly={f.fitMode !== "total"}
          format="2dec"
          step={100}
          suffix="€"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <NumericField
          label="Agent Fees (months)"
          value={f.agent}
          onChange={S("agent")}
          format="1dec"
          step={0.5}
        />
        <NumericField
          label="Unforeseen Costs (lump sum €)"
          value={f.unforeseen}
          onChange={S("unforeseen")}
          format="2dec"
          step={100}
          suffix="€"
        />
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {FCUR(totalFit)}
        </p>
        <p>
          <strong>Headline Rent:</strong> {F(rent, 2)} €/sqm
        </p>

        <p>
          1️⃣ NER incl. Rent Frees: <b>{F(ner1, 2)} €/sqm</b>
          <Delta base={rent} val={ner1} />
        </p>
        <p>
          2️⃣ incl. Rent Frees & Fit-Outs: <b>{F(ner2, 2)} €/sqm</b>
          <Delta base={rent} val={ner2} />
        </p>
        <p>
          3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{F(ner3, 2)} €/sqm</b>
          <Delta base={rent} val={ner3} />
        </p>
        <p className="border-t pt-2">
          4️⃣ <b>Final NER</b> (incl. all above + Unforeseen):{" "}
          <b>{F(ner4, 2)} €/sqm</b>
          <Delta base={rent} val={ner4} />
        </p>
      </div>
    </div>
  );
}
