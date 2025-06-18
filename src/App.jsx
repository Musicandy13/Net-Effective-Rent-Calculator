import { useState } from 'react';

export default function NERCalculator() {
  const [nla, setNla] = useState(1000.00);
  const [addon, setAddon] = useState(5.00);
  const [rent, setRent] = useState(13.00);
  const [duration, setDuration] = useState(84);
  const [rf, setRf] = useState(7.0);
  const [fitOut, setFitOut] = useState(150.00);
  const [agentFeeMonths, setAgentFeeMonths] = useState(4.0);

  const gla = nla * (1 + addon / 100);
  const rentFreeMonths = duration - rf;
  const grossRent = rent * gla * rentFreeMonths;
  const totalFitOut = fitOut * nla;
  const agentFees = agentFeeMonths * rent * gla;

  const ner1 = grossRent / (duration * gla);
  const ner2 = (grossRent - totalFitOut) / (duration * gla);
  const ner3 = (grossRent - totalFitOut - agentFees) / (duration * gla);

  const format = (val, minDigits = 2) =>
    val.toLocaleString('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: minDigits
    });

  const percentChange = (ner) => ((1 - ner / rent) * 100);

  const getColor = (val) =>
    val > 0 ? 'text-red-600' : val < 0 ? 'text-green-600' : 'text-black';

  const formattedNla = format(nla);
  const formattedAddon = format(addon);
  const formattedRent = format(rent);
  const formattedGla = format(gla);
  const formattedFitOut = format(fitOut);
  const formattedTotalFitOut = format(totalFitOut, 2);

  const handleStepChange = (setter, step) => (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) setter(val);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input type="number" step="0.5" value={nla} onChange={handleStepChange(setNla, 0.5)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input type="number" step="0.1" value={addon} onChange={handleStepChange(setAddon, 0.1)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input type="text" readOnly value={formattedGla} className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600" />
        </label>
        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input type="number" step="0.25" value={rent} onChange={handleStepChange(setRent, 0.25)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input type="number" step="1" value={duration} onChange={handleStepChange(setDuration, 1)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input type="number" step="0.5" value={rf} onChange={handleStepChange(setRf, 0.5)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
          <input type="number" step="5" value={fitOut} onChange={handleStepChange(setFitOut, 5)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input type="number" step="0.5" value={agentFeeMonths} onChange={handleStepChange(setAgentFeeMonths, 0.5)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
      </div>

      <div className="pt-4 space-y-2">
        <p className="text-red-600 font-bold text-base">Total Fit Out Costs: {formattedTotalFitOut} €</p>
        <p><strong>Headline Rent:</strong> {formattedRent} €/sqm</p>
        <p>1️⃣ NER incl. Rent Frees: <b>{format(ner1)} €/sqm</b> (<span className={getColor(percentChange(ner1))}>{percentChange(ner1).toFixed(2)}% ↓</span>)</p>
        <p>2️⃣ incl. Rent Frees & Fit-Outs: <b>{format(ner2)} €/sqm</b> (<span className={getColor(percentChange(ner2))}>{percentChange(ner2).toFixed(2)}% ↓</span>)</p>
        <p>3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{format(ner3)} €/sqm</b> (<span className={getColor(percentChange(ner3))}>{percentChange(ner3).toFixed(2)}% ↓</span>)</p>
      </div>
    </div>
  );
}
