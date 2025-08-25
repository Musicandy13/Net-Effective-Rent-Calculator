// src/App.jsx
import { useState, useMemo, useEffect } from 'react';

/* ---------- Helpers ---------- */

// robust number parse (accepts "220,000.50")
const parseInput = (v) => {
  const clean = String(v ?? '').replace(/,/g, '').trim();
  const n = parseFloat(clean);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// format for input fields (English separators, always 2 decimals)
const fmtInput = (n) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

// € formatter for displays
const fmtEUR = (n) =>
  (n ?? 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(n - Math.trunc(n)) < 1e-9 ? 0 : 2,
  });

// safe non-negative
const nn = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0);

/* ---------- App ---------- */

export default function NERCalculator() {
  const [nla, setNla] = useState(1000);
  const [addon, setAddon] = useState(5);
  const [rent, setRent] = useState(13);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7);

  // Fit-Out mode & values
  const [fitOutMode, setFitOutMode] = useState('perSqm'); // 'perSqm' | 'total'
  const [fitOutPerSqm, setFitOutPerSqm] = useState(150); // €/sqm
  const [fitOutTotalManual, setFitOutTotalManual] = useState(150 * 1000); // €

  const [agentFeeMonths, setAgentFeeMonths] = useState(4);

  const gla = useMemo(() => nn(nla) * (1 + nn(addon) / 100), [nla, addon]);

  const rentMonthsCharged = Math.max(0, nn(duration) - nn(rf));
  const grossRent = nn(rent) * gla * rentMonthsCharged;

  // keep €/sqm and Total in sync when NLA or mode changes
  useEffect(() => {
    if (fitOutMode === 'perSqm') {
      setFitOutTotalManual(nn(fitOutPerSqm) * nn(nla));
    } else {
      const perSqm = nn(nla) > 0 ? nn(fitOutTotalManual) / nn(nla) : 0;
      setFitOutPerSqm(perSqm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nla, fitOutMode]);

  // Total fit-out used in calculations
  const totalFitOut =
    fitOutMode === 'total'
      ? nn(fitOutTotalManual)
      : nn(fitOutPerSqm) * nn(nla);

  const agentFees = nn(agentFeeMonths) * nn(rent) * gla;

  const denom = Math.max(1e-9, nn(duration) * gla);
  const ner1 = grossRent / denom;
  const ner2 = (grossRent - totalFitOut) / denom;
  const ner3 = (grossRent - totalFitOut - agentFees) / denom;

  const reduction = (ner) => {
    const r = nn(rent);
    const diff = r - ner;
    const percent = r > 0 ? (diff / r) * 100 : 0;
    return {
      value: percent.toFixed(2),
      color: percent === 0 ? 'text-black' : 'text-red-600',
    };
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input
            type="number"
            min={0}
            value={nla}
            onChange={(e) => setNla(nn(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input
            type="number"
            min={0}
            value={addon}
            onChange={(e) => setAddon(nn(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={gla.toFixed(2)}
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input
            type="number"
            min={0}
            value={rent}
            onChange={(e) => setRent(nn(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(nn(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input
            type="number"
            min={0}
            value={rf}
            onChange={(e) => setRf(nn(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* ---- FIT-OUT SECTION ---- */}
        <div className="col-span-2 border rounded-md p-3">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-gray-700 font-medium">Fit-Out Input:</span>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="fitout-mode"
                checked={fitOutMode === 'perSqm'}
                onChange={() => setFitOutMode('perSqm')}
              />
              <span>€/sqm (NLA)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="fitout-mode"
                checked={fitOutMode === 'total'}
                onChange={() => setFitOutMode('total')}
              />
              <span>Total (€)</span>
            </label>
          </div>

          {/* €/sqm input (formatted) */}
          <label className="block mb-2">
            <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
            <input
              type="text"
              value={fmtInput(fitOutPerSqm)}
              onChange={(e) => {
                const val = parseInput(e.target.value);
                setFitOutPerSqm(val);
                if (fitOutMode === 'perSqm') setFitOutTotalManual(val * nn(nla));
              }}
              readOnly={fitOutMode === 'total'}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === 'total' ? 'bg-gray-100 text-gray-600' : ''
              }`}
            />
          </label>

          {/* Total input (formatted) */}
          <label className="block">
            <span className="text-gray-700">Fit-Out Total (€)</span>
            <input
              type="text"
              value={fmtInput(fitOutTotalManual)}
              onChange={(e) => {
                const val = parseInput(e.target.value);
                setFitOutTotalManual(val);
                if (fitOutMode === 'total') {
                  const per = nn(nla) > 0 ? val / nn(nla) : 0;
                  setFitOutPerSqm(per);
                }
              }}
              readOnly={fitOutMode === 'perSqm'}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === 'perSqm' ? 'bg-gray-100 text-gray-600' : ''
              }`}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input
            type="number"
            min={0}
            value={agentFeeMonths}
            onChange={(e) => setAgentFeeMonths(nn(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {fmtEUR(totalFitOut)}
        </p>
        <p>
          <strong>Headline Rent:</strong> {nn(rent).toFixed(2)} €/sqm
        </p>
        <p>
          1️⃣ NER incl. Rent Frees: <b>{ner1.toFixed(2)} €/sqm</b>{' '}
          <span className={reduction(ner1).color}>({reduction(ner1).value}% ↓)</span>
        </p>
        <p>
          2️⃣ incl. Rent Frees &amp; Fit-Outs: <b>{ner2.toFixed(2)} €/sqm</b>{' '}
          <span className={reduction(ner2).color}>({reduction(ner2).value}% ↓)</span>
        </p>
        <p>
          3️⃣ incl. Rent Frees, Fit-Outs &amp; Agent Fees:{' '}
          <b>{ner3.toFixed(2)} €/sqm</b>{' '}
          <span className={reduction(ner3).color}>({reduction(ner3).value}% ↓)</span>
        </p>
      </div>
    </div>
  );
}
