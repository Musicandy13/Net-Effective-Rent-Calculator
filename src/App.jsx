
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

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-gray-700">NLA (sqm)</span>
          <input type="number" value={nla} onChange={e => setNla(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Add-On (%)</span>
          <input type="number" value={addon} onChange={e => setAddon(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input type="text" readOnly value={gla.toFixed(2)} className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600" />
        </label>
        <label className="block">
          <span className="text-gray-700">Headline Rent €/sqm</span>
          <input type="number" value={rent} onChange={e => setRent(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Lease Term (months)</span>
          <input type="number" value={duration} onChange={e => setDuration(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Rent-Free (months)</span>
          <input type="number" value={rf} onChange={e => setRf(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>

        <label className="block">
          <span className="text-gray-700">Fit-Out €/sqm (NLA)</span>
          <input type="number" value={fitOut} onChange={e => setFitOut(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
        <label className="block">
          <span className="text-gray-700">Agent Fees (months)</span>
          <input type="number" value={agentFeeMonths} onChange={e => setAgentFeeMonths(+e.target.value)} className="mt-1 block w-full border rounded-md p-2" />
        </label>
      </div>

      <div className="pt-4 space-y-2">
        <p><strong>Headline Rent:</strong> {rent.toFixed(2)} €/sqm</p>
        <p>1️⃣ Net Effective Rent incl. Rent Frees: <b>{ner1.toFixed(2)} €/sqm</b></p>
        <p>2️⃣ incl. Fit-Outs: <b>{ner2.toFixed(2)} €/sqm</b></p>
        <p>3️⃣ incl. Fit-Outs & Agent Fees: <b>{ner3.toFixed(2)} €/sqm</b></p>
      </div>
    </div>
  );
}
