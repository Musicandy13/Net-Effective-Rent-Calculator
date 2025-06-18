import { useState } from 'react';

export default function NERCalculator() {
  const [nla, setNla] = useState(1000.0);
  const [addon, setAddon] = useState(5.0);
  const [rent, setRent] = useState(13.0);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7.0);
  const [fitOut, setFitOut] = useState(150.0);
  const [agentFeeMonths, setAgentFeeMonths] = useState(4.0);

  const gla = nla * (1 + addon / 100);
  const rentFreeMonths = duration - rf;
  const grossRent = rent * gla * rentFreeMonths;
  const totalFitOut = fitOut * nla;
  const agentFees = agentFeeMonths * rent * gla;

  const ner1 = grossRent / (duration * gla);
  const ner2 = (grossRent - totalFitOut) / (duration * gla);
  const ner3 = (grossRent - totalFitOut - agentFees) / (duration * gla);

  const format = (value) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatPercent = (value) => `${Math.abs(value).toFixed(2)}%`;

  const reduction = (ner) => ((1 - ner / rent) * 100);

  const handleInput = (setter, step) => (e) => {
    const raw = e.target.value.replace(/,/g, '');
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) setter(parsed);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input type="number" step="0.5" value={format(nla)} onChange={handleInput(setNla, 0.5)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input type="number" step="0.1" value={format(addon)} onChange={handleInput(setAddon, 0.1)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>

        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input type="text" readOnly value={format(gla)} className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600 text-right" />
        </label>
        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input type="number" step="0.25" value={format(rent)} onChange={handleInput(setRent, 0.25)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input type="number" step="1" value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input type="number" step="0.5" value={format(rf)} onChange={handleInput(setRf, 0.5)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>

        <label className="block">
          <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
          <input type="number" step="5" value={format(fitOut)} onChange={handleInput(setFitOut, 5)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>
        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input type="number" step="0.5" value={format(agentFeeMonths)} onChange={handleInput(setAgentFeeMonths, 0.5)} className="mt-1 block w-full border rounded-md p-2 text-right" />
        </label>
      </div>

      <div className="pt-4 space-y-2 text-left">
        <p className="text-red-600 font-semibold text-lg">Total Fit Out Costs: {format(totalFitOut)} €</p>
        <p><strong>Headline Rent:</strong> {format(rent)} €/sqm</p>

        <p>1️⃣ NER incl. Rent Frees: <b>{format(ner1)} €/sqm</b> <span className={reduction(ner1) > 0 ? 'text-red-600' : ''}>({formatPercent(reduction(ner1))} ↓)</span></p>
        <p>2️⃣ incl. Rent Frees & Fit-Outs: <b>{format(ner2)} €/sqm</b> <span className={reduction(ner2) > 0 ? 'text-red-600' : ''}>({formatPercent(reduction(ner2))} ↓)</span></p>
        <p>3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{format(ner3)} €/sqm</b> <span className={reduction(ner3) > 0 ? 'text-red-600' : ''}>({formatPercent(reduction(ner3))} ↓)</span></p>
      </div>
    </div>
  );
}
