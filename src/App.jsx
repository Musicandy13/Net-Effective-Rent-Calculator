import { useEffect, useMemo, useState } from "react";

/* ---------------- Helpers ---------------- */
const parseFlexible = (v) => {
  const clean = String(v ?? "").replace(/,/g, "").trim();
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};
const clampNN = (n) => (n >= 0 ? n : 0);
const fmtFixed = (n, decimals) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
// 1 decimal only if needed; otherwise integer
const fmt1Trim = (n) => {
  n = Number.isFinite(n) ? n : 0;
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: isInt ? 0 : 1,
    maximumFractionDigits: isInt ? 0 : 1,
  }).format(n);
};
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
  format = "int", // 'int' | '1dec-trim' | '2dec'
  inputMode = "decimal",
}) {
  const [focused, setFocused] = useState(false);
  const valNum = clampNN(parseFlexible(valueStr));

  const displayStr = focused
    ? valueStr
    : format === "2dec"
    ? fmtFixed(valNum, 2)
    : format === "1dec-trim"
    ? fmt1Trim(valNum)
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
          setValueStr(String(n)); // keep what user typed (decimals preserved)
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setValueStr(raw);
        }}
        className={`mt-1 block w-full border rounded-md p-2 ${
          readOnly ? "bg-gray-100 text-gray-600" : ""
        }`}
      />
    </label>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  // raw strings
  const [nlaStr, setNlaStr] = useState("1000");
  const [addonStr, setAddonStr] = useState("5");         // shows as integer by default
  const [rentStr, setRentStr] = useState("13.00");       // 2 decimals
  const [durationStr, setDurationStr] = useState("84");  // integer
  const [rfStr, setRfStr] = useState("7");               // 1-dec trim (8.5 stays 8.5)
  const [agentFeeMonthsStr, setAgentFeeMonthsStr] = useState("4"); // 1-dec trim

  // Fit-Out mode + fields
  const [fitOutMode, setFitOutMode] = useState("perSqm"); // 'perSqm' | 'total'
  const [fitOutPerSqmStr, setFitOutPerSqmStr] = useState("150");
  const [fitOutTotalStr, setFitOutTotalStr] = useState("150000");
  const [focusField, setFocusField] = useState(null); // 'perSqm' | 'total' | null

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

  // sync fit-outs with NLA & mode, but don't touch focused field
  useEffect(() => {
    if (fitOutMode === "perSqm") {
      if (focusField !== "perSqm") setFitOutTotalStr(String(fitOutPerSqm * nla));
    } else {
      if (focusField !== "total")
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
    return {
      value: percent.toFixed(2),
      color: percent === 0 ? "text-black" : "text-red-600",
    };
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

        <NumericField
          label="Add-On (%)"
          valueStr={addonStr}
          setValueStr={setAddonStr}
          step={1}
          min={0}
          format="int"
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
          format="2dec"     // keep two decimals like rent
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

        {/* Rent-Free: step 1.0, but if you type 8.5 it stays 8.5 */}
        <NumericField
          label="Rent-Free (months)"
          valueStr={rfStr}
          setValueStr={setRfStr}
          step={1}
          min={0}
          format="1dec-trim"
        />

        {/* -------- FIT-OUTS -------- */}
        <div className="col-span-2 border rounded-md p-3">
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

          {/* €/sqm — show 2 decimals when not focused (like rent) */}
          <label className="block mb-2">
            <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
            <input
              type="text"
              inputMode="decimal"
              value={
                focusField === "perSqm"
                  ? fitOutPerSqmStr
                  : fmtFixed(parseFlexible(fitOutPerSqmStr), 2)
              }
              onFocus={() => setFocusField("perSqm")}
              onBlur={(e) => {
                setFocusField(null);
                const n = clampNN(parseFlexible(e.target.value));
                setFitOutPerSqmStr(String(n));
                if (fitOutMode === "perSqm") setFitOutTotalStr(String(n * nla));
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,-]/g, "");
                setFitOutPerSqmStr(raw);
                if (fitOutMode === "perSqm") {
                  const val = clampNN(parseFlexible(raw));
                  setFitOutTotalStr(String(val * nla));
                }
              }}
              readOnly={fitOutMode === "total"}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === "total" ? "bg-gray-100 text-gray-600" : ""
              }`}
            />
          </label>

          {/* Total (€) — show 2 decimals when not focused (like rent) */}
          <label className="block">
            <span className="text-gray-700">Fit-Out Total (€)</span>
            <input
              type="text"
              inputMode="decimal"
              value={
                focusField === "total"
                  ? fitOutTotalStr
                  : fmtFixed(parseFlexible(fitOutTotalStr), 2)
              }
              onFocus={() => setFocusField("total")}
              onBlur={(e) => {
                setFocusField(null);
                const n = clampNN(parseFlexible(e.target.value));
                setFitOutTotalStr(String(n));
                if (fitOutMode === "total") {
                  setFitOutPerSqmStr(String(nla > 0 ? n / nla : 0));
                }
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,-]/g, "");
                setFitOutTotalStr(raw);
                if (fitOutMode === "total") {
                  const n = clampNN(parseFlexible(raw));
                  setFitOutPerSqmStr(String(nla > 0 ? n / nla : 0));
                }
              }}
              readOnly={fitOutMode === "perSqm"}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === "perSqm" ? "bg-gray-100 text-gray-600" : ""
              }`}
            />
          </label>
        </div>

        {/* Agent Fees: same behavior as Rent-Free */}
        <NumericField
          label="Agent Fees (months)"
          valueStr={agentFeeMonthsStr}
          setValueStr={setAgentFeeMonthsStr}
          step={1}
          min={0}
          format="1dec-trim"
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
