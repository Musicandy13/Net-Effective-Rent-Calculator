import { useState } from 'react';
import InputField from './InputField';

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
        <InputField label="NLA (m²)" value={nla} onChange={setNla} />
        <InputField label="Markup (%)" value={markup} onChange={setMarkup} />
        <InputField label="GLA (m²)" value={gla.toFixed(2)} readOnly />
        <InputField label="Headline Rent €/m²" value={headlineRent} onChange={setHeadlineRent} />
        <InputField label="Lease Term (months)" value={leaseTerm} onChange={setLeaseTerm} />
        <InputField label="Rent-Free (months)" value={rentFree} onChange={setRentFree} />
        <InputField label="Fit-Out €/m² NLA" value={fitOut} onChange={setFitOut} />
        <InputField label="Agent Fee (months)" value={agentFee} onChange={setAgentFee} />
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
