import { useEffect, useMemo, useState } from "react";

/* ---------- Format / Parse helpers ---------- */
const parseFlexible = (v) => {
  const clean = String(v ?? "").replace(/,/g, "").trim();
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};
const clampNonNegative = (n) => (n >= 0 ? n : 0);
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

/* ---------- Reusable numeric field ----------
   - Spinner arrows when focused (type="number")
   - Pretty formatting on blur (type="text")
   - Accepts . or , while typing
------------------------------------------------ */
function NumericField({
  label,
  valueStr,
  setValueStr,
  decimals = 0,
  step = 1,
  min = 0,
  readOnly = false,
  className = "",
  inputMode = "decimal",
}) {
  const [focused, setFocused] = useState(false);

  const displayStr = focused
    ? valueStr // raw while editing
    : fmtFixed(parseFlexible(valueStr), decimals); // pretty on blur

  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <input
        type={focused ? "number" : "text"}
        inputMode={focused ? "decimal" : "text"} // show numeric keypad on focus (mobile)
        value={displayStr}
        min={min}
        step={step}
        readOnly={readOnly && !focused}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          const n = clampNonNegative(parseFlexible(e.target.value));
          setValueStr(fmtFixed(n, decimals));
        }}
        onChange={(e) => {
          // Allow only digits, dot, comma, minus (minus ignored since min=0) and one dot/comma
          const raw = e.target.value.replace(/[^\d.,-]/g, "");
          setValueStr(raw);
        }}
        className={`mt-1 block w-full border rounded-md p-2 ${readOnly ? "bg-gray-100 text-gray-600" : ""} ${className}`}
      />
    </label>
  );
}

/* ---------- App ---------- */
export default function NERCalculator() {
  // Keep everything as strings for perfect caret control
  const [nlaStr, setNlaStr] = useState("1000");               // int (spinner)
  const [addonStr, setAddonStr] = useState("5.00");           // 2 decimals (spinner)
  const [rentStr, setRentStr] = useState("13.00");            // 2 decimals (spinner)
  const [durationStr, setDurationStr] = useState("84");       // int (spinner)
  const [rfStr, setRfStr] = useState("7.0");                  // 1 decimal (spinner)  <-- as requested
  const [agentFeeMonthsStr, setAgentFeeMonthsStr] = useState("4.0"); // 1 decimal (spinner)

  // Fit-out mode and fields (keep the nice bidirectional behavior)
  const [fitOutMode, setFitOutMode] = useState("perSqm"); // 'perSqm' | 'total'
  const [fitOutPerSqmStr, setFitOutPerSqmStr] = useState("150.00");
  const [fitOutTotalStr, setFitOutTotalStr] = useState("150000.00");
  const [focusField, setFocusField] = useState(null); // 'perSqm' | 'total' | null

  // Parsed numbers for calculations
  const nla = clampNonNegative(parseFlexible(nlaStr));
  const addon = clampNonNegative(parseFlexible(addonStr));
  const rent = clampNonNegative(parseFlexible(rentStr));
  const duration = clampNonNegative(parseFlexible(durationStr));
  const rf = clampNonNegative(parseFlexible(rfStr));
  const agentFeeMonths = clampNonNegative(parseFlexible(agentFeeMonthsStr));
  const fitOutPerSqm = clampNonNegative(parseFlexible(fitOutPerSqmStr));
  const fitOutTotalManual = clampNonNegative(parseFlexible(fitOutTotalStr));

  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const rentMonthsCharged = Math.max(0, duration - rf);
  const grossRent = rent * gla * rentMonthsCharged;

  // Sync Fit-Out fields when NLA or mode changes, but don't overwrite focused field
  useEffect(() => {
    if (fitOutMode === "perSqm") {
      if (focusField !== "perSqm") {
        const total = fitOutPerSqm * nla;
        setFitOutTotalStr(String(total)); // leave raw; components format on blur
      }
    } else {
      if (focusField !== "total") {
        const per = nla > 0 ? fitOutTotalManual / nla : 0;
        setFitOutPerSqmStr(String(per));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nla, fitOutMode]);

  const totalFitOut = fitOutMode === "total" ? fitOutTotalManual : fitOutPerSqm * nla;
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
        {/* NLA (integer with spinner) */}
        <NumericField
          label="NLA (sqm)"
          valueStr={nlaStr}
          setValueStr={setNlaStr}
          decimals={0}
          step={1}
          min={0}
          inputMode="numeric"
        />

        {/* Add-On % (2 decimals with spinner) */}
        <NumericField
          label="Add-On (%)"
          valueStr={addonStr}
          setValueStr={setAddonStr}
          decimals={2}
          step={0.1}
          min={0}
        />

        {/* GLA read-only */}
        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={fmtFixed(gla, 2)}
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </label>

        {/* Headline Rent (2 decimals with spinner) */}
        <NumericField
          label="Headline Rent €/sqm"
          valueStr={rentStr}
          setValueStr={setRentStr}
          decimals={2}
          step={0.1}
          min={0}
        />

        {/* Lease Term (integer with spinner) */}
        <NumericField
          label="Lease Term (months)"
          valueStr={durationStr}
          setValueStr={setDurationStr}
          decimals={0}
          step={1}
          min={0}
          inputMode="numeric"
        />

        {/* Rent-Free (1 decimal with spinner) */}
        <NumericField
          label="Rent-Free (months)"
          valueStr={rfStr}
          setValueStr={setRfStr}
          decimals={1}   // <-- one decimal month
          step={0.1}
          min={0}
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

          {/* €/sqm (2 decimals); we keep the special bidirectional logic */}
          <label className="block mb-2">
            <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
            <input
              type="text"
              inputMode="decimal"
              value={fmtFixed(parseFlexible(fitOutPerSqmStr), 2)}
              onFocus={() => setFocusField("perSqm")}
              onBlur={(e) => {
                setFocusField(null);
                setFitOutPerSqmStr(String(clampNonNegative(parseFlexible(e.target.value))));
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,-]/g, "");
                setFitOutPerSqmStr(raw);
                if (fitOutMode === "perSqm") {
                  const val = clampNonNegative(parseFlexible(raw));
                  setFitOutTotalStr(String(val * nla));
                }
              }}
              readOnly={fitOutMode === "total"}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === "total" ? "bg-gray-100 text-gray-600" : ""
              }`}
            />
          </label>

          {/* Total (€) (2 decimals) */}
          <label className="block">
            <span className="text-gray-700">Fit-Out Total (€)</span>
            <input
              type="text"
              inputMode="decimal"
              value={fmtFixed(parseFlexible(fitOutTotalStr), 2)}
              onFocus={() => setFocusField("total")}
              onBlur={(e) => {
                setFocusField(null);
                setFitOutTotalStr(String(clampNonNegative(parseFlexible(e.target.value))));
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,-]/g, "");
                setFitOutTotalStr(raw);
                if (fitOutMode === "total") {
                  const val = clampNonNegative(parseFlexible(raw));
                  const per = nla > 0 ? val / nla : 0;
                  setFitOutPerSqmStr(String(per));
                }
              }}
              readOnly={fitOutMode === "perSqm"}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === "perSqm" ? "bg-gray-100 text-gray-600" : ""
              }`}
            />
          </label>
        </div>

        {/* Agent Fees months (1 decimal with spinner) */}
        <NumericField
          label="Agent Fees (months)"
          valueStr={agentFeeMonthsStr}
          setValueStr={setAgentFeeMonthsStr}
          decimals={1}  // <-- one decimal month
          step={0.1}
          min={0}
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
