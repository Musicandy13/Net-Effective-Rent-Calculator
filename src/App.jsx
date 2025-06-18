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
    num.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: true,
    });

  const percentDiff = (ner) => {
    const diff = ((ner - rent) / rent) * 100;
    const formatted = `${diff.toFixed(2)}% ↓`;
    const style = diff === 0 ? 'text-black' : 'text-red-600';
    return <span className={style}>({formatted})</span>;
  };

  const handleChange = (setter) => (e) => {
    let value = e.target.value;
    value = value.replace(/\./g, '').replace(',', '.'); // 1.000,50 → 1000.50
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) setter(parsed);
  };

  const handleBlur = (value, setter) => () => {
    // Optionale Formatierung bei Verlassen des Felds
    setter(Number(parseFloat(value.toString())));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label>
          <span>NLA (sqm)</span>
          <input
            type="text"
            value={formatNumber(nla)}
            onChange={handleChange(setNla)}
            onBlur={handleBlur(nla, setNla)}
            className="w-full p-2 border rounded"
          />
        </label>
        <label>
          <span>Add-On (%)</span>
          <input
            type="text"
            value={formatNumber(addon)}
            onChange={handleChange(setAddon)}
            onBlur={handleBlur(addon, setAddon)}
            className="w-full p-2 border rounded"
          />
        </label>
        <label>
          <span>GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={formatNumber(gla)}
            className="w-full p-2 border rounded bg-gray-100 text-gray-600"
          />
        </label>
        <label>
          <span>Headline Rent €/sqm</span>
          <input
            type="text"
            value={formatNumber(rent)}
            onChange={handleChange(setRent)}
            onBlur={handleBlur(rent, setRent)}
            className="w-full p-2 border rounded"
          />
        </label>
        <label>
          <span>Lease Term (months)</span>
          <input
            type="text"
            value={formatNumber(duration)}
            onChange={handleChange(setDuration)}
            onBlur={handleBlur(duration, setDuration)}
            className="w-full p-2 border rounded"
          />
        </label>
        <label>
          <span>Rent-Free (months)</span>
          <input
            type="text"
            value={formatNumber(rf)}
            onChange={handleChange(setRf)}
            onBlur={handleBlur(rf, setRf)}
            className="w-full p-2 border rounded"
          />
        </label>
        <label>
          <span>Fit-Out €/sqm (NLA)</span>
          <input
            type="text"
            value={formatNumber(fitOut)}
            onChange={handleChange(setFitOut)}
            onBlur={handleBlur(fitOut, setFitOut)}
            className="w-full p-2 border rounded"
          />
        </label>
        <label>
          <span>Agent Fees (months)</span>
          <input
            type="text"
            value={formatNumber(agentFeeMonths)}
            onChange={handleChange(setAgentFeeMonths)}
            onBlur={handleBlur(agentFeeMonths, setAgentFeeMonths)}
            className="w-full p-2 border rounded"
          />
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
