import { useState } from 'react';
import InputField from './InputField';

export default function App() {
  const [nla, setNla] = useState('1000');
  const [markup, setMarkup] = useState('5');
  const [headlineRent, setHeadlineRent] = useState('13');
  const [leaseTerm, setLeaseTerm] = useState('84');
  const [rentFree, setRentFree] = useState('7');
  const [fitOut, setFitOut] = useState('150');
  const [agentFee, setAgentFee] = useState('4');

  const parsedNla = parseFloat(nla) || 0;
  const parsedMarkup = parseFloat(markup) || 0;
  const parsedHeadlineRent = parseFloat(headlineRent) || 0;
  const parsedLeaseTerm = parseFloat(leaseTerm) || 1;
  const parsedRentFree = parseFloat(rentFree) || 0;
  const parsedFitOut = parseFloat(fitOut) || 0;
  const parsedAgentFee = parseFloat(agentFee) || 0;

  const gla = parsedNla * (1 + parsedMarkup / 100);

  const ner1 = ((parsedHeadlineRent * (parsedLeaseTerm - parsedRentFree)) / parsedLeaseTerm).toFixed(2);
  const ner2 = ((parsedHeadlineRent * (parsedLeaseTerm - parsedRentFree) * parsedNla + parsedFitOut * parsedNla) / (parsedLeaseTerm * parsedNla)).toFixed(2);
  const ner3 = ((parsedHeadlineRent * (parsedLeaseTerm - parsedRentFree) * parsedNla + parsedFitOut * parsedNla + parsedHeadlineRent * parsedAgentFee * parsedNla) / (parsedLeaseTerm * parsedNla)).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-24">
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

      <div className="mt-6 space-y-2 text-center">
        <p>📌 <strong>GLA:</strong> {gla.toFixed(2)} m²</p>
        <p>① Net Effective Rent incl. Rent Frees: <strong>{ner1} €/m²</strong></p>
        <p>② incl. Rent Free & Fit-Outs: <strong>{ner2} €/m²</strong></p>
        <p>③ incl. Rent Free, Fit-Outs & Agent Fees: <strong>{ner3} €/m²</strong></p>
      </div>
    </div>
  );
}
