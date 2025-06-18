import { useState } from 'react';

export default function App() {
  const [nla, setNla] = useState(1000);
  const [markup, setMarkup] = useState(5);
  const [headlineRent, setHeadlineRent] = useState(13);
  const [leaseTerm, setLeaseTerm] = useState(84);
  const [rentFree, setRentFree] = useState(7);
  const [fitOut, setFitOut] = useState(150);
  const [agentFee, setAgentFee] = useState(4);

  const gla = nla * (1 + markup / 100);

  const ner1 = ((headlineRent * (leaseTerm - rentFree)) / leaseTerm).toFixed(2);
  const ner2 = ((headlineRent * (leaseTerm - rentFree) * nla + fitOut * nla) / (leaseTerm * nla)).toFixed(2);
  const ner3 = ((headlineRent * (leaseTerm - rentFree) * nla + fitOut * nla + headlineRent * agentFee * nla) / (leaseTerm * nla)).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Net Effective Rent Calculator
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">NLA (m²)</label>
          <input
            type="number"
            value={nla}
            onChange={e => setNla(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Markup (%)</label>
          <input
            type="number"
            value={markup}
            onChange={e => setMarkup(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">GLA (m²)</label>
          <input
            type="number"
            value={gla.toFixed(2)}
            readOnly
            className="border rounded px-3 py-2 bg-gray-100 text-gray-500"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Headline Rent €/m²</label>
          <input
            type="number"
            value={headlineRent}
            onChange={e => setHeadlineRent(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Lease Term (months)</label>
          <input
            type="number"
            value={leaseTerm}
            onChange={e => setLeaseTerm(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Rent-Free (months)</label>
          <input
            type="number"
            value={rentFree}
            onChange={e => setRentFree(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Fit-Out €/m² NLA</label>
          <input
            type="number"
            value={fitOut}
            onChange={e => setFitOut(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Agent Fee (months)</label>
          <input
            type="number"
            value={agentFee}
            onChange={e => setAgentFee(Number(e.target.value))}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-8 space-y-2 text-center">
        <p>📌 <strong>Headline Rent:</strong> {headlineRent} €/m²</p>
        <p>① Net Effective Rent incl. Rent Frees: <strong>{ner1} €/m²</strong></p>
        <p>② incl. Rent Free & Fit-Outs: <strong>{ner2} €/m²</strong></p>
        <p>③ incl. Rent Free, Fit-Outs & Agent Fees: <strong>{ner3} €/m²</strong></p>
      </div>
    </div>
  );
}
