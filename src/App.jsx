import { useState } from 'react';

type FitOutMode = 'perSqm' | 'total';

export default function NERCalculator() {
  const [nla, setNla] = useState(1000);
  const [addon, setAddon] = useState(5);
  const [rent, setRent] = useState(13);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7);

  // --- NEW: fit-out input modes ---
  const [fitOutMode, setFitOutMode] = useState<FitOutMode>('perSqm');
  const [fitOutPerSqm, setFitOutPerSqm] = useState(150);  // €/sqm (NLA)
  const [fitOutTotal, setFitOutTotal] = useState(() => 150 * 1000); // €

  const [agentFeeMonths, setAgentFeeMonths] = useState(4);

  const gla = nla * (1 + addon / 100);
  const rentFreeMonths = duration - rf;
  const grossRent = rent * gla * rentFreeMonths;

  // choose which total fit-out to use
  const totalFitOut =
    fitOutMode === 'total' ? Math.max(0, fitOutTotal) : Math.max(0, fitOutPerSqm * nla);

  // keep the “other” view in sync for display
  const derivedPerSqm = nla > 0 ? totalFitOut / nla : 0;
  const derivedTotal = fitOutPerSqm * nla;

  const agentFees = agentFeeMonths * rent * gla;

  const ner1 = duration > 0 && gla > 0 ? grossRent / (duration * gla) : 0;
  const ner2 = duration > 0 && gla > 0 ? (grossRent - totalFitOut) / (duration * gla) : 0;
  const ner3 =
    duration > 0 && gla > 0 ? (grossRent - totalFitOut - agentFees) / (duration * gla) : 0;

  const reduction = (ner: number) => {
    const diff = rent - ner;
    const percent = rent > 0 ? (diff / rent) * 100 : 0;
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
            min={0}
            type="number"
            value={nla}
            onChange={(e) => setNla(Math.max(0, +e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input
            min={0}
            type="number"
            value={addon}
            onChange={(e) => setAddon(Math.max(0, +e.target.value))}
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
            min={0}
            type="number"
            value={rent}
            onChange={(e) => setRent(Math.max(0, +e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input
            min={0}
            type="number"
            value={duration}
            onChange={(e) => setDuration(Math.max(0, +e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input
            min={0}
            type="number"
            value={rf}
            onChange={(e) => setRf(Math.max(0, +e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* --- NEW: Fit-Out mode toggle --- */}
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

          {/* Per-sqm input (always editable, used when mode === 'perSqm') */}
          <label className="block mb-2">
            <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
            <input
              min={0}
              type="number"
              value={fitOutPerSqm}
              onChange={(e) => setFitOutPerSqm(Math.max(0, +e.target.value))}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === 'total' ? 'bg-gray-50' : ''
              }`}
            />
            {fitOutMode === 'total' && (
              <span className="text-xs text-gray-500">
                (derived now: {derivedPerSqm.toFixed(2)} €/sqm)
              </span>
            )}
          </label>

          {/* Total input (editable only in total mode) */}
          <label className="block">
            <span className="text-gray-700">Fit-Out Total (€)</span>
            <input
              min={0}
              type="number"
              value={fitOutMode === 'total' ? fitOutTotal : derivedTotal}
              onChange={(e) =>
                setFitOutTotal(Math.max(0, +e.target.value))
              }
              readOnly={fitOutMode !== 'total'}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode !== 'total' ? 'bg-gray-100 text-gray-600' : ''
              }`}
            />
            {fitOutMode !== 'total' && (
              <span className="text-xs text-gray-500">
                (auto = €/sqm × NLA)
              </span>
            )}
          </label>
        </div>

        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input
            min={0}
            type="number"
            value={agentFeeMonths}
            onChange={(e) => setAgentFeeMonths(Math.max(0, +e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {totalFitOut.toLocaleString()} €
        </p>
        <p>
          <strong>Headline Rent:</strong> {rent.toFixed(2)} €/sqm
        </p>

        <p>
          1️⃣ NER incl. Rent Frees: <b>{ner1.toFixed(2)} €/sqm</b>{' '}
          <span className={reduction(ner1).color}>
            ({reduction(ner1).value}% ↓)
          </span>
        </p>
        <p>
          2️⃣ incl. Rent Frees &amp; Fit-Outs: <b>{ner2.toFixed(2)} €/sqm</b>{' '}
          <span className={reduction(ner2).color}>
            ({reduction(ner2).value}% ↓)
          </span>
        </p>
        <p>
          3️⃣ incl. Rent Frees, Fit-Outs &amp; Agent Fees:{' '}
          <b>{ner3.toFixed(2)} €/sqm</b>{' '}
          <span className={reduction(ner3).color}>
            ({reduction(ner3).value}% ↓)
          </span>
        </p>
      </div>
    </div>
  );
}
