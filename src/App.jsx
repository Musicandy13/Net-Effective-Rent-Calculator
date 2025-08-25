import { useEffect, useMemo, useState } from "react";

const P = (v) => {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  const hasDot = s.includes("."), c = (s.match(/,/g) || []).length;
  s = !hasDot && c === 1 ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = parseFloat(s); return Number.isFinite(n) && n >= 0 ? n : 0;
};
const F = (n, d) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: d, maximumFractionDigits: d,
}).format(Number.isFinite(n) ? n : 0);

function NumericField({ label, value, onChange, format="2dec", step=1, min=0, readOnly=false, onCommit }) {
  const [focus, setFocus] = useState(false);
  const num = P(value);
  const show = focus ? value : F(num, format==="int"?0:format==="1dec"?1:2);
  return (
    <label className="block">
      <span className="text-gray-700">{label}</span>
      <input
        type={focus ? "number" : "text"}
        inputMode={focus ? "decimal" : "text"}
        value={show}
        min={min} step={step} readOnly={readOnly && !focus}
        onFocus={() => setFocus(true)}
        onBlur={e => { setFocus(false); const n=P(e.target.value); onChange(String(n)); onCommit?.(n); }}
        onChange={e => onChange(e.target.value.replace(/[^\d.,-]/g,""))}
        className={`mt-1 block w-full border rounded-md p-2 ${readOnly?"bg-gray-100 text-gray-600":""}`}
      />
    </label>
  );
}

export default function App() {
  const [f, setF] = useState({
    nla:"1000", addon:"22.00", rent:"225.56", duration:"84", rf:"7", agent:"4",
    fitMode:"perSqm", fitPer:"150.00", fitTot:"150000.00",
  });
  const S = (k) => (v) => setF(s => ({ ...s, [k]: v }));
  const nla=P(f.nla), addon=P(f.addon), rent=P(f.rent), duration=P(f.duration),
        rf=P(f.rf), agent=P(f.agent), fitPer=P(f.fitPer), fitTot=P(f.fitTot);

  const gla = useMemo(() => nla * (1 + addon/100), [nla, addon]);
  const months = Math.max(0, duration - rf);
  const gross = rent * gla * months;

  useEffect(() => {
    if (f.fitMode === "perSqm") S("fitTot")(String(fitPer * nla));
    else S("fitPer")(String(nla > 0 ? fitTot / nla : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.fitMode, f.nla]);

  const totalFit = f.fitMode === "total" ? fitTot : fitPer * nla;
  const agentFees = agent * rent * gla;
  const denom = Math.max(1e-9, duration * gla);
  const ner1 = gross/denom, ner2 = (gross-totalFit)/denom, ner3 = (gross-totalFit-agentFees)/denom;

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold">Net Effective Rent Calculator</h2>

      <div className="grid grid-cols-2 gap-4">
        <NumericField label="NLA (sqm)" value={f.nla} onChange={S("nla")} format="2dec" step={1}/>
        <NumericField label="Add-On (%)" value={f.addon} onChange={S("addon")} format="2dec" step={1}/>
        <label className="block">
          <span className="text-gray-700">GLA (sqm)</span>
          <input readOnly value={F(gla,2)} className="mt-1 block w-full border rounded-md p-2 bg-gray-100 text-gray-600"/>
        </label>
        <NumericField label="Headline Rent €/sqm" value={f.rent} onChange={S("rent")} format="2dec" step={1}/>
        <NumericField label="Lease Term (months)" value={f.duration} onChange={S("duration")} format="int" step={1}/>
        <NumericField label="Rent-Free (months)" value={f.rf} onChange={S("rf")} format="1dec" step={1}/>
      </div>

      <div className="border rounded-md p-3">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-gray-700 font-medium">Fit-Out Input:</span>
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={f.fitMode==="perSqm"} onChange={()=>S("fitMode")("perSqm")}/> <span>€/sqm (NLA)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={f.fitMode==="total"} onChange={()=>S("fitMode")("total")}/> <span>Total (€)</span>
          </label>
        </div>

        <NumericField
          label="Fit-Out €/sqm (NLA)" value={f.fitPer} onChange={(v)=>{ S("fitPer")(v); if(f.fitMode==="perSqm") S("fitTot")(String(P(v)*nla)); }}
          format="2dec" step={1} readOnly={f.fitMode==="total"}
        />
        <NumericField
          label="Fit-Out Total (€)" value={f.fitTot} onChange={(v)=>{ S("fitTot")(v); if(f.fitMode==="total"){ const n=P(v); S("fitPer")(String(nla>0?n/nla:0)); }}}
          format="2dec" step={1} readOnly={f.fitMode==="perSqm"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <NumericField label="Agent Fees (months)" value={f.agent} onChange={S("agent")} format="1dec" step={1}/>
      </div>

      <div className="pt-6 space-y-2 text-left">
        <p className="text-sm text-red-500 font-semibold">
          Total Fit Out Costs: {(totalFit).toLocaleString("en-US",{style:"currency",currency:"EUR"})}
        </p>
        <p><strong>Headline Rent:</strong> {F(rent,2)} €/sqm</p>
        <p>1️⃣ NER incl. Rent Frees: <b>{F(ner1,2)} €/sqm</b></p>
        <p>2️⃣ incl. Rent Frees & Fit-Outs: <b>{F(ner2,2)} €/sqm</b></p>
        <p>3️⃣ incl. Rent Frees, Fit-Outs & Agent Fees: <b>{F(ner3,2)} €/sqm</b></p>
      </div>
    </div>
  );
}
