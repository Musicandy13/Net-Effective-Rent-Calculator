import { useState } from 'react';

export default function NERCalculator() {
  const [nla, setNla] = useState(1000);
  const [addon, setAddon] = useState(5);
  const [rent, setRent] = useState(13);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7);
  const [fitOut, setFitOut] = useState(150);
  const [agentFeeMonths, setAgentFeeMonths] = useState(4);

  const gla = nla * (1 + addon / 100);
  const rentFreeMonths = duration - rf;
  const grossRent = rent * gla * rentFreeMonths;
  const totalFitOut = fitOut * nla;
  const agentFees = agentFeeMonths * rent * gla;

  const ner1 = grossRent / (duration * gla);
  const ner2 = (grossRent - totalFitOut) / (duration * gla);
  const ner3 = (grossRent - totalFitOut - agentFees) / (duration * gla);

  const formatNumber = (num, fractionDigits = 2) =>
    num.toLocaleString('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

  const percentDiff = (ner) => {
    const diff = ((ner - rent) / rent) * 100;
    const formatted = `${diff.toFixed(2)}% ↓`;
    const style = diff === 0 ? 'text-black' : 'text-red-600';
    return <span className={style}>({formatted})</span>;
  };

  const handleChange = (setter) => (e) => {
    const value = parseFloat(e.target.value.replace(',', '.'));
    if (!isNaN(value)) setter(value);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span>NLA (sqm)</span>
          <input type="number" step="0.5" value={nla} onChange={handleChange(setNla)} className="w-full p-2 border rounded" />
        </label>
        <label>
          <span>Add-On (%)</span>
          <input type="number" step="0.1" value={addon} onChange={handleChange(setAddon)} className="w-full p-2 border rounded" />
        </label>
        <label>
          <span>GLA (sqm)</span>
          <input type="text" readOnly value={formatNumber(gla)} className="w-full p-2 border rounded bg-gray-100 text-gray-600" />
        </label>
        <label>
          <span>Headline Rent €/sqm</span>
          <input type="number" step="0.25" value={rent} onChange={handleChange(setRent)} className="w-full p-2 border rounded" />
        </label>
        <label>
          <span>Lease Term (months)</span>
          <input type="number" step="1" value={duration} onChange={handleChange(setDuration)} className="w-full p-2 border rounded" />
        </label>
        <label>
          <span>Rent-Free (months)</span>
          <input type="number" step="0.5" value={rf} onChange={handleChange(setRf)} className="w-full p-2 border rounded" />
        </label>
        <label>
          <span>Fit-Out €/sqm (NLA)</span>
          <input type="number" step="5" value={fitOut} onChange={handleChange(setFitOut)} className="w-full p-2 border rounded" />
        </label>
        <label>
          <span>Agent Fees (months)</span>
          <input type="number" step="0.5" value={agentFeeMonths} onChange={handleChange(setAgentFeeMonths)} className="w-full p-2 border rounded" />
        </label>
      </div>

      <div className="pt-4 space-y-2">
        <p className="text-red-600 font-semibold text-lg">
          Total Fit Out Costs: {formatNumber(totalFitOut)} €
        </p>
        <p><strong>Headline Rent:</strong> {formatNumber(rent)} €/sqm</p>
        <p>🔁 NER incl. Rent Frees: <strong>{formatNumber(ner1)} €/sqm</strong> {percentDiff(ner1)}</p>
        <p>🔂 incl. Rent Frees & Fit-Outs: <strong>{formatNumber(ner2)} €/sqm</strong> {percentDiff(ner2)}</p>
        <p>🔃 incl. Rent Frees, Fit-Outs & Agent Fees: <strong>{formatNumber(ner3)} €/sqm</strong> {percentDiff(ner3)}</p>
      </div>
    </div>
  );
}
