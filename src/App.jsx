// src/App.jsx
import { useState, useMemo } from 'react';

/** Kleiner Helfer: robustes Zahl-Parsing (kein NaN) */
const toNum = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** €-Format (ohne Dezimalstellen bei ganzen Beträgen) */
const fmtEUR = (n) =>
  (n ?? 0).toLocaleString(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: Math.abs(n - Math.trunc(n)) < 1e-9 ? 0 : 2,
  });

export default function NERCalculator() {
  const [nla, setNla] = useState(1000);
  const [addon, setAddon] = useState(5);
  const [rent, setRent] = useState(13);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7);

  // --- Fit-Out Eingabemodus: 'perSqm' | 'total' (nur JS, kein TS)
  const [fitOutMode, setFitOutMode] = useState('perSqm');
  const [fitOutPerSqm, setFitOutPerSqm] = useState(150); // €/sqm (NLA)
  const [fitOutTotalManual, setFitOutTotalManual] = useState(150 * 1000); // €

  const [agentFeeMonths, setAgentFeeMonths] = useState(4);

  const gla = useMemo(() => toNum(nla) * (1 + toNum(addon) / 100), [nla, addon]);

  const rentMonthsCharged = Math.max(0, toNum(duration) - toNum(rf)); // zahlende Monate
  const grossRent = toNum(rent) * gla * rentMonthsCharged;

  // Gesamte Fit-Out-Kosten je nach Modus
  const totalFitOut =
    fitOutMode === 'total'
      ? toNum(fitOutTotalManual)
      : toNum(fitOutPerSqm) * Math.max(0, toNum(nla));

  // Abgeleitete Anzeigen (nur Anzeige, keine Quelle)
  const derivedPerSqm = Math.max(0, toNum(nla)) > 0 ? totalFitOut / toNum(nla) : 0;
  const derivedTotal = toNum(fitOutPerSqm) * Math.max(0, toNum(nla));

  const agentFees = toNum(agentFeeMonths) * toNum(rent) * gla;

  const denom = Math.max(1e-9, toNum(duration) * gla); // Schutz gegen 0
  const ner1 = grossRent / denom;
  const ner2 = (grossRent - totalFitOut) / denom;
  const ner3 = (grossRent - totalFitOut - agentFees) / denom;

  const reduction = (ner) => {
    const r = toNum(rent);
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
            min={0}
            type="number"
            value={nla}
            onChange={(e) => setNla(toNum(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input
            min={0}
            type="number"
            value={addon}
            onChange={(e) => setAddon(toNum(e.target.value))}
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
            onChange={(e) => setRent(toNum(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input
            min={0}
            type="number"
            value={duration}
            onChange={(e) => setDuration(toNum(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input
            min={0}
            type="number"
            value={rf}
            onChange={(e) => setRf(toNum(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>

        {/* FIT-OUT MODUS */}
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

          {/* €/sqm – immer editierbar; Quelle nur wenn Modus = perSqm */}
          <label className="block mb-2">
            <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
            <input
              min={0}
              type="number"
              value={fitOutPerSqm}
              onChange={(e) => setFitOutPerSqm(toNum(e.target.value))}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode === 'total' ? 'bg-gray-50' : ''
              }`}
            />
            {fitOutMode === 'total' && (
              <span className="text-xs text-gray-500">
                (derzeit abgeleitet: {derivedPerSqm.toFixed(2)} €/sqm)
              </span>
            )}
          </label>

          {/* Total – nur im total-Modus editierbar */}
          <label className="block">
            <span className="text-gray-700">Fit-Out Total (€)</span>
            <input
              min={0}
              type="number"
              value={fitOutMode === 'total' ? fitOutTotalManual : derivedTotal}
              onChange={(e) => setFitOutTotalManual(toNum(e.target.value))}
              readOnly={fitOutMode !== 'total'}
              className={`mt-1 block w-full border rounded-md p-2 ${
                fitOutMode !== 'total' ? 'bg-gray-100 text-gray-600' : ''
              }`}
            />
            {fitOutMode !== 'total' && (
              <span className="text-xs text-gray-500">(auto = €/sqm × NLA)</span>
            )}
          </label>
        </div>

        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input
            min={0}
            type="number"
            value={agentFeeMonths}
            onChange={(e) => setAgentFeeMonths(toNum(e.target.value))}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {fmtEUR(totalFitOut)}
        </p>
        <p>
          <strong>Headline Rent:</strong> {toNum(rent).toFixed(2)} €/sqm
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
