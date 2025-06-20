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

  const reduction = (ner => {
    const diff = rent - ner;
    const percent = (diff / rent) * 100;
    return {
      value: percent.toFixed(2),
      color: percent === 0 ? 'text-black' : 'text-red-600',
    };
  });

  return (
    <div className="px-4 py-6 max-w-screen-md mx-auto bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-center">Net Effective Rent Calculator</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "NLA (sqm)", value: nla, set: setNla },
          { label: "Add-On (%)", value: addon, set: setAddon },
          { label: "Headline Rent €/sqm", value: rent, set: setRent },
          { label: "Lease Term (months)", value: duration, set: setDuration },
          { label: "Rent-Free (months)", value: rf, set: setRf },
          { label: "Fit-Out €/sqm (NLA)", value: fitOut, set: setFitOut },
          { label: "Agent Fees (months)", value: agentFeeMonths, set: setAgentFeeMonths },
        ].map((field, idx) => (
          <label key={idx} className="block">
            <span className="text-gray-700 text-sm">{field.label}</span>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              value={field.value}
              onChange={e => field.set(+e.target.value)}
              className="mt-1 block w-full border rounded-md p-3 text-base"
            />
          </label>
        ))}

        <label className="block">
          <span className="text-gray-700 text-sm">GLA (sqm)</span>
          <input
            type="text"
            readOnly
            value={gla.toFixed(2)}
            className="mt-1 block w-full border rounded-md p-3 bg-gray-100 text-gray-600"
          />
        </label>
      </div>

      <div className="pt-4 space-y-3 text-left text-sm sm:text-base">
        <p className="text-red-500 font-semibold">🔧 Total Fit Out Costs: {totalFitOut.toLocaleString()} €</p>
        <p><strong>Headline Rent:</strong> {rent.toFixed(2)} €/sqm</p>

        <p>
          1️⃣ NER inkl. Rent Free: <b>{ner1.toFixed(2)} €/sqm</b>{' '}
          <span className={`${reduction(ner1).color}`}>({reduction(ner1).value}% ↓)</span>
        </p>
        <p>
          2️⃣ inkl. Rent Free & Fit-Out: <b>{ner2.toFixed(2)} €/sqm</b>{' '}
          <span className={`${reduction(ner2).color}`}>({reduction(ner2).value}% ↓)</span>
        </p>
        <p>
          3️⃣ inkl. Rent Free, Fit-Out & Agent Fees: <b>{ner3.toFixed(2)} €/sqm</b>{' '}
          <span className={`${reduction(ner3).color}`}>({reduction(ner3).value}% ↓)</span>
        </p>
      </div>
    </div>
  );
}
