import { useState } from 'react';

export default function NERCalculator() {
  const [nla, setNla] = useState(1000);
  const [addon, setAddon] = useState(5);
  const [rent, setRent] = useState(13);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7);
  const [fitOut, setFitOut] = useState(150);
  const [agentFeeMonths, setAgentFeeMonths] = useState(4);

  const formatNumber = (value, decimals = 2) => value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  const gla = nla * (1 + addon / 100);
  const rentFreeMonths = duration - rf;
  const grossRent = rent * gla * rentFreeMonths;
  const totalFitOut = fitOut * nla;
  const agentFees = agentFeeMonths * rent * gla;

  const ner1 = grossRent / (duration * gla);
  const ner2 = (grossRent - totalFitOut) / (duration * gla);
  const ner3 = (grossRent - totalFitOut - agentFees) / (duration * gla);

  const reduction = (ner => {
    const diff = rent - ner;
    const percent = (diff / rent) * 100;
    return {
      value: percent.toFixed(2),
      color: percent === 0 ? 'text-black' : 'text-red-600',
    };
  });

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input min={0} type="number" value={nla} onChange={e => setNla(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input min={0} step="0.01" type="number" value={addon} onChange={e => setAddon(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input type="text" readOnly value={formatNumber(gla)} className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600" />
        </label>
        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input min={0} step="0.01" type="number" value={rent} onChange={e => setRent(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input min={0} type="number" value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input min={0} step="0.1" type="number" value={rf} onChange={e => setRf(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
          <input min={0} step="0.01" type="number" value={fitOut} onChange={e => setFitOut(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input min={0} step="0.1" type="number" value={agentFeeMonths} onChange={e => setAgentFeeMonths(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-red-500 font-semibold">Total Fit Out Costs: {formatNumber(totalFitOut)} €</p>
        <p><strong>Headline Rent:</strong> {formatNumber(rent)} €/sqm</p>

        <p>
          1️⃣ NER incl. Rent Frees: <b>{formatNumber(ner1)} €/sqm</b>{' '}
          <span className={`${reduction(ner1).color}`}>({reduction(ner1).value}% ↓)</span>
        </p>
        <p>
          2️⃣ incl. Rent Frees & Fit-Outs: <b>{formatNumber(ner2)} €/sqm</b>{' '}
          <span className={`${reduction(ner2).color}`}>({reduction(ner2).value}% ↓)</span>
        </p>
        <p>
          3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{formatNumber(ner3)} €/sqm</b>{' '}
          <span className={`${reduction(ner3).color}`}>({reduction(ner3).value}% ↓)</span>
        </p>
      </div>
    </div>
  );
}
