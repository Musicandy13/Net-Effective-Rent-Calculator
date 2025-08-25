import { useEffect, useMemo, useState } from "react";

/* ---------------- Helpers ---------------- */
const parseInput = (v) => {
  const clean = String(v ?? "").replace(/,/g, "").trim();
  const n = parseFloat(clean);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const fmt2 = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0);
const fmtInt = (n) => String(Math.max(0, Math.round(Number(n) || 0)));
const fmtEUR = (n) =>
  (n ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(n - Math.trunc(n)) < 1e-9 ? 0 : 2,
  });
const nn = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0);

/* ---------------- App ---------------- */
export default function NERCalculator() {
  // all inputs as RAW STRINGS (no formatting while typing)
  const [nlaStr, setNlaStr] = useState("1000");
  const [addonStr, setAddonStr] = useState("5");
  const [rentStr, setRentStr] = useState("13");
  const [durationStr, setDurationStr] = useState("84");
  const [rfStr, setRfStr] = useState("7");
  const [agentFeeMonthsStr, setAgentFeeMonthsStr] = useState("4");

  // fit-out input mode & raw strings
  const [fitOutMode, setFitOutMode] = useState("perSqm"); // 'perSqm' | 'total'
  const [fitOutPerSqmStr, setFitOutPerSqmStr] = useState(fmt2(150));
  const [fitOutTotalStr, setFitOutTotalStr] = useState(fmt2(150 * 1000));
  const [focusField, setFocusField] = useState(null); // 'perSqm' | 'total' | null

  // parsed numbers for calculations
  const nla = parseInput(nlaStr);
  const addon = parseInput(addonStr);
  const rent = parseInput(rentStr);
  const duration = parseInput(durationStr);
  const rf = parseInput(rfStr);
  const agentFeeMonths = parseInput(agentFeeMonthsStr);
  const fitOutPerSqm = parseInput(fitOutPerSqmStr);
  const fitOutTotalManual = parseInput(fitOutTotalStr);

  const gla = useMemo(() => nla * (1 + addon / 100), [nla, addon]);
  const rentMonthsCharged = Math.max(0, duration - rf);
  const grossRent = rent * gla * rentMonthsCharged;

  // keep €/sqm & Total in sync when NLA or mode changes (but never overwrite the focused input)
  useEffect(() => {
    if (fitOutMode === "perSqm") {
      if (focusField !== "perSqm") setFitOutTotalStr(fmt2(fitOutPerSqm * nla));
    } else {
      if (focusField !== "total")
        setFitOutPerSqmStr(fmt2(nla > 0 ? fitOutTotalManual / nla : 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nla, fitOutMode]);

  const totalFitOut =
    fitOutMode === "total" ? nn(fitOutTotalManual) : nn(fitOutPerSqm) * nn(nla);
  const agentFees = nn(agentFeeMonths) * nn(rent) * gla;

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
        {/* NLA */}
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input
            type="text"
            inputMode="numeric"
            value={nlaStr}
            onChange={(e) => setNlaStr(e.target.value.replace(/[^\d.,]/g, ""))}
            onBlur={() => setNlaStr(fmtInt(nla))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* Add-On */}
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input
            type="text"
            inputMode="decimal"
            value={addonStr}
            onChange={(e) => setAddonStr(e.target.value.replace(/[^\d.,]/g, ""))}
            onBlur={() => setAddonStr(fmt2(addon))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* GLA */}
        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={gla.toFixed(2)}
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </label>

        {/* Headline Rent */}
        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input
            type="text"
            inputMode="decimal"
            value={rentStr}
            onChange={(e) => setRentStr(e.target.value.replace(/[^\d.,]/g, ""))}
            onBlur={() => setRentStr(fmt2(rent))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* Lease Term */}
        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input
            type="text"
            inputMode="numeric"
            value={durationStr}
            onChange={(e) => setDurationStr(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => setDurationStr(fmtInt(duration))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* Rent-Free */}
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input
            type="text"
            inputMode="numeric"
            value={rfStr}
            onChange={(e) => setRfStr(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => setRfStr(fmtInt(rf))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

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

          {/* €/sqm */}
          <label className="block mb-2">
            <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
            <input
              type="text"
              inputMode="decimal"
              value={fitOutPerSqmStr}
              onFocus={() => setFocusField("perSqm")}
              onBlur={() => {
                setFocusField(null);
                setFitOutPerSqmStr(fmt2(parseInput(fitOutPerSqmStr)));
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,]/g, "");
                setFitOutPerSqmStr(raw);
                if (fitOutMode === "perSqm") setFitOutTotalStr(fmt2(parseInput(raw) * nla));
              }}
              readOnly={fitOutMode === "total"}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === "total" ? "bg-gray-100 text-gray-600" : ""
              }`}
            />
          </label>

          {/* Total (€) */}
          <label className="block">
            <span className="text-gray-700">Fit-Out Total (€)</span>
            <input
              type="text"
              inputMode="decimal"
              value={fitOutTotalStr}
              onFocus={() => setFocusField("total")}
              onBlur={() => {
                setFocusField(null);
                setFitOutTotalStr(fmt2(parseInput(fitOutTotalStr)));
              }}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,]/g, "");
                setFitOutTotalStr(raw);
                if (fitOutMode === "total") {
                  const val = parseInput(raw);
                  setFitOutPerSqmStr(fmt2(nla > 0 ? val / nla : 0));
                }
              }}
              readOnly={fitOutMode === "perSqm"}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === "perSqm" ? "bg-gray-100 text-gray-600" : ""
              }`}
            />
          </label>
        </div>

        {/* Agent Fees (months) */}
        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input
            type="text"
            inputMode="numeric"
            value={agentFeeMonthsStr}
            onChange={(e) => setAgentFeeMonthsStr(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => setAgentFeeMonthsStr(fmtInt(agentFeeMonths))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {fmtEUR(totalFitOut)}
        </p>
        <p>
          <strong>Headline Rent:</strong> {fmt2(rent)} €/sqm
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
