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

  {/* €/sqm — RAW while focused, formatted on blur */}
  <label className="block mb-2">
    <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
    <input
      type="text"
      inputMode="decimal"
      value={
        focusField === "perSqm"
          ? fitOutPerSqmStr                                    // ← raw while typing (no caret jump)
          : fmtFixed(parseFlexible(fitOutPerSqmStr), 2)        // ← pretty when not focused
      }
      onFocus={() => setFocusField("perSqm")}
      onBlur={(e) => {
        setFocusField(null);
        // lock in formatted value
        const n = clampNonNegative(parseFlexible(e.target.value));
        setFitOutPerSqmStr(String(n));
        // keep total in sync if this is the source of truth
        if (fitOutMode === "perSqm") setFitOutTotalStr(String(n * clampNonNegative(parseFlexible(nlaStr))));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,-]/g, "");
        setFitOutPerSqmStr(raw);
        if (fitOutMode === "perSqm") {
          const val = clampNonNegative(parseFlexible(raw));
          setFitOutTotalStr(String(val * clampNonNegative(parseFlexible(nlaStr))));
        }
      }}
      readOnly={fitOutMode === "total"}
      className={`mt-1 block w-full border rounded-md p-2 ${
        fitOutMode === "total" ? "bg-gray-100 text-gray-600" : ""
      }`}
    />
  </label>

  {/* Total (€) — RAW while focused, formatted on blur */}
  <label className="block">
    <span className="text-gray-700">Fit-Out Total (€)</span>
    <input
      type="text"
      inputMode="decimal"
      value={
        focusField === "total"
          ? fitOutTotalStr                                     // ← raw while typing (no caret jump)
          : fmtFixed(parseFlexible(fitOutTotalStr), 2)         // ← pretty when not focused
      }
      onFocus={() => setFocusField("total")}
      onBlur={(e) => {
        setFocusField(null);
        const n = clampNonNegative(parseFlexible(e.target.value));
        setFitOutTotalStr(String(n));
        if (fitOutMode === "total") {
          const nla = clampNonNegative(parseFlexible(nlaStr));
          setFitOutPerSqmStr(String(nla > 0 ? n / nla : 0));
        }
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,-]/g, "");
        setFitOutTotalStr(raw);
        if (fitOutMode === "total") {
          const n = clampNonNegative(parseFlexible(raw));
          const nla = clampNonNegative(parseFlexible(nlaStr));
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
