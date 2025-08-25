import { useEffect, useMemo, useState } from "react";

/* ---------------- Helpers ---------------- */
// Accepts: "160.56", "160,56", "16,056.78", "16.056,78"
const parseFlexible = (v) => {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  const hasDot = s.includes(".");
  const commaCount = (s.match(/,/g) || []).length;

  if (!hasDot && commaCount === 1) {
    // Single comma, no dot -> treat comma as decimal separator
    s = s.replace(",", ".");
  } else {
    // Otherwise commas are thousands separators -> drop them
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const clampNN = (n) => (n >= 0 ? n : 0);
const fmtFixed = (n, decimals) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
const fmtEUR = (n) =>
  (n ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(n - Math.trunc(n)) < 1e-9 ? 0 : 2,
  });

/* ---------- Reusable numeric field ---------- */
function NumericField({
  label,
  valueStr,
  setValueStr,
  step = 1,
  min = 0,
  readOnly = false,
  format = "2dec", // 'int' | '2dec' | '1dec-trim'
  inputMode = "decimal",
  className = "",
  onCommit, // optional callback with parsed number when user blurs
}) {
  const [focused, setFocused] = useState(false);
  const valNum = clampNN(parseFlexible(valueStr));

  const displayStr = focused
    ? valueStr
    : format === "2dec"
    ? fmtFixed(valNum, 2)
    : format === "1dec-trim"
    ? (() => {
        const isInt = Math.abs(valNum - Math.round(valNum)) < 1e-9;
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: isInt ? 0 : 1,
          maximumFractionDigits: isInt ? 0 : 1,
        }).format(valNum);
      })()
    : fmtFixed(valNum, 0);

  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <input
        type={focused ? "number" : "text"}
        inputMode={focused ? inputMode : "text"}
        value={displayStr}
        min={min}
        step={step}
        readOnly={readOnly && !focused}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          const n = clampNN(parseFlexible(e.target.value));
          setValueStr(String(n)); // keep exactly what user meant (supports , or .)
          onCommit?.(n);
        }}
        onChange={(e) => {
          // allow digits, dot, comma and minus (minus ignored due to min=0)
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setValueStr(raw);
        }}
        className={`mt-1 block w-full border rounded-md p-2 ${
          readOnly ? "bg-gray-100 text-gray-600" : ""
        } ${className}`}
      />
    </label>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  // raw strings
  const [nlaStr, setNlaStr] = useState("1000");
  const [addonStr, setAddonStr] = useState("22.00");      // 2 decimals, step 1
  const [rentStr, setRentStr] = useState("225.56");       // 2 decimals, step 1
  const [durationStr, setDurationStr] = useState("84");   // integer
  const [rfStr, setRfStr] = useState("7");                // integer display (can type decimals if you want)
  const [agentFeeMonthsStr, setAgentFeeMonthsStr] = useState("4"); // integer display

  // Fit-Out mode + fields (as strings)
  const [fitOutMode, setFitOutMode] = useState("perSqm"); // 'perSqm' | 'total'
  const [fitOutPerSqmStr, setFitOutPerSqmStr] = useState("150.00");     // 2-dec UI
  const [fitOutTotalStr, setFitOutTotalStr] = useState("150000.00");    // 2-dec UI

  // parsed
  const nla = clampNN(parseFlexible(nlaStr));
  const addon = clampNN(parseFlexible(addonStr));
  const rent = clampNN(parseFlexible(rentStr));
  const duration = clampNN(parseFlexible(durationStr));
  const rf = clampNN(parseFlexible(rfStr));
  const agentFeeMonths = clampNN(parseFlexible(agentFeeMonthsStr));
  const fitOutPerSqm = clampNN(parseFlexible(fitOutPerSqmStr));
  const fitOutTotalManual = clampNN(parseFlexible(fitOutTotalStr));

  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const rentMonthsCharged = Math.max(0, duration - rf);
  const grossRent = rent * gla * rentMonthsCharged;

  // keep €/sqm & total synced with NLA and mode
  useEffect(() => {
    if (fitOutMode === "perSqm") {
      setFitOutTotalStr(String(fitOutPerSqm * nla));
    } else {
      setFitOutPerSqmStr(String(nla > 0 ? fitOutTotalManual / nla : 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nla, fitOutMode]);

  const totalFitOut =
    fitOutMode === "total" ? fitOutTotalManual : fitOutPerSqm * nla;
  const agentFees = agentFeeMonths * rent * gla;

  const denom = Math.max(1e-9, duration * gla);
  const ner1 = grossRent / denom;
  const ner2 = (grossRent - totalFitOut) / denom;
  const ner3 = (grossRent - totalFitOut - agentFees) / denom;

  const reduction = (ner) => {
    const diff = rent - ner;
    const percent = rent > 0 ? (diff / rent) * 100 : 0;
    return { value: percent.toFixed(2), color: percent === 0 ? "text-black" : "text-red-600" };
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>

      <div className="grid grid-cols-2 gap-4">
        <NumericField
          label="NLA (sqm)"
          valueStr={nlaStr}
          setValueStr={setNlaStr}
          step={1}
          min={0}
          inputMode="numeric"
          format="int"
        />

        {/* Add-On now identical to Rent: 2 decimals, step 1 */}
        <NumericField
          label="Add-On (%)"
          valueStr={addonStr}
          setValueStr={setAddonStr}
          step={1}
          min={0}
          format="2dec"
        />

        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={fmtFixed(gla, 2)}
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </label>

        <NumericField
          label="Headline Rent €/sqm"
          valueStr={rentStr}
          setValueStr={setRentStr}
          step={1}
          min={0}
          format="2dec"
        />

        <NumericField
          label="Lease Term (months)"
          valueStr={durationStr}
          setValueStr={setDurationStr}
          step={1}
          min={0}
          inputMode="numeric"
          format="int"
        />

        <NumericField
          label="Rent-Free (months)"
          valueStr={rfStr}
          setValueStr={setRfStr}
          step={1}
          min={0}
          format="int"
        />
      </div>

      {/* -------- FIT-OUTS (both like Rent: 2 decimals, step 1) -------- */}
      <div className="border rounded-md p-3">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-gray-700 font-medium">Fit-Out Input:</span>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="fitout-mode"
              checked={fitOutMode === "perSqm"}
              onChange={() => setFitOutMode("perSqm")}
            />
            <span>€/sqm (NLA)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="fitout-mode"
              checked={fitOutMode === "total"}
              onChange={() => setFitOutMode("total")}
            />
            <span>Total (€)</span>
          </label>
        </div>

        {/* €/sqm — 2 decimals, step 1, supports , or . as decimal */}
        <NumericField
          label="Fit-Out €/sqm (NLA)"
          valueStr={fitOutPerSqmStr}
          setValueStr={(s) => {
            setFitOutPerSqmStr(s);
            if (fitOutMode === "perSqm") {
              // live sync total while typing
              const val = clampNN(parseFlexible(s));
              setFitOutTotalStr(String(val * clampNN(parseFlexible(nlaStr))));
            }
          }}
          step={1}
          min={0}
          format="2dec"
          onCommit={(n) => {
            if (fitOutMode === "perSqm") {
              setFitOutTotalStr(String(n * clampNN(parseFlexible(nlaStr))));
            }
          }}
          className={fitOutMode === "total" ? "bg-gray-100 text-gray-600" : ""}
          readOnly={fitOutMode === "total"}
        />

        {/* Total (€) — 2 decimals, step 1 */}
        <NumericField
          label="Fit-Out Total (€)"
          valueStr={fitOutTotalStr}
          setValueStr={(s) => {
            setFitOutTotalStr(s);
            if (fitOutMode === "total") {
              const n = clampNN(parseFlexible(s));
              const nla = clampNN(parseFlexible(nlaStr));
              setFitOutPerSqmStr(String(nla > 0 ? n / nla : 0));
            }
          }}
          step={1}
          min={0}
          format="2dec"
          onCommit={(n) => {
            if (fitOutMode === "total") {
              const nla = clampNN(parseFlexible(nlaStr));
              setFitOutPerSqmStr(String(nla > 0 ? n / nla : 0));
            }
          }}
          className={fitOutMode === "perSqm" ? "bg-gray-100 text-gray-600" : ""}
          readOnly={fitOutMode === "perSqm"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <NumericField
          label="Agent Fees (months)"
          valueStr={agentFeeMonthsStr}
          setValueStr={setAgentFeeMonthsStr}
          step={1}
          min={0}
          format="int"
        />
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {fmtEUR(totalFitOut)}
        </p>
        <p>
          <strong>Headline Rent:</strong> {fmtFixed(rent, 2)} €/sqm
        </p>
        <p>
          1️⃣ NER incl. Rent Frees: <b>{ner1.toFixed(2)} €/sqm</b>{" "}
          <span className={reduction(ner1).color}>({reduction(ner1).value}% ↓)</span>
        </p>
        <p>
          2️⃣ incl. Rent Frees &amp; Fit-Outs: <b>{ner2.toFixed(2)} €/sqm</b>{" "}
          <span className={reduction(ner2).color}>({reduction(ner2).value}% ↓)</span>
        </p>
        <p>
          3️⃣ incl. Rent Frees, Fit-Outs &amp; Agent Fees: <b>{ner3.toFixed(2)} €/sqm</b>{" "}
          <span className={reduction(ner3).color}>({reduction(ner3).value}% ↓)</span>
        </p>
      </div>
    </div>
  );
}
