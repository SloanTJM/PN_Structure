import { useState, useRef } from 'react';

export default function NumberInput({ value, onChange, min, max, step = 1, prefix, suffix }) {
  const [raw, setRaw] = useState(String(value));
  const focused = useRef(false);
  const display = focused.current ? raw : String(value);
  return (
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-navy-400 text-sm pointer-events-none">{prefix}</span>}
      <input type="number" value={display}
        onFocus={() => { focused.current = true; setRaw(String(value)); }}
        onBlur={() => { focused.current = false; if (raw === '' || isNaN(Number(raw))) { setRaw(String(value)); } }}
        onChange={(e) => { setRaw(e.target.value); if (e.target.value !== '' && !isNaN(Number(e.target.value))) onChange(Number(e.target.value)); }}
        min={min} max={max} step={step}
        className={`w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`} />
      {suffix && <span className="absolute right-3 text-navy-400 text-sm pointer-events-none">{suffix}</span>}
    </div>
  );
}
