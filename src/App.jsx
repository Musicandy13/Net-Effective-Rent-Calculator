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

  const formatNumber = (num) =>
    num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleNumericInput = (setter) => (e) => {
    const val = e.target.value.replace(',', '.');
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setter(parsed);
    } else if (val === '') {
      setter(0);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input
            type="number"
            value={nla}
            onChange={handleNumericInput(setNla)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input
            type="number"
            value={addon}
            onChange={handleNumericInput(setAddon)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={formatNumber(gla)}
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input
            type="number"
            value={rent}
            onChange={handleNumericInput(setRent)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input
            type="number"
            value={duration}
            onChange={handleNumericInput(setDuration)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input
            type="number"
            value={rf}
            onChange={handleNumericInput(setRf)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
          <input
            type="number"
            value={fitOut}
            onChange={handleNumericInput(setFitOut)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input
            type="number"
            value={agentFeeMonths}
            onChange={handleNumericInput(setAgentFeeMonths)}
            className="mt-1 block w-full border rounded-md p-2"
          />
        </label>
      </div>

      <div className="pt-4 space-y-2">
        <p><strong>Headline Rent:</strong> {formatNumber(rent)} €/sqm</p>
        <p>1️⃣ Net Effective Rent (NER) incl. Rent Frees: <b>{formatNumber(ner1)} €/sqm</b></p>
        <p>2️⃣ NER incl. Rent Frees & Fit-Outs: <b>{formatNumber(ner2)} €/sqm</b></p>
        <p>3️⃣ NER incl. Rent Frees, Fit-Outs & Agent Fees: <b>{formatNumber(ner3)} €/sqm</b></p>
      </div>
    </div>
  );
}
