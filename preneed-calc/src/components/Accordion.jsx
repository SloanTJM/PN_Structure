import { useState } from 'react';
import Chevron from './Chevron';

export default function Accordion({ title, subtitle, color, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-navy-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-navy-50 transition-colors">
        <div className="flex items-center gap-3">
          {color && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
          <div>
            <span className="font-semibold text-navy-800 text-sm">{title}</span>
            {subtitle && <span className="ml-2 text-xs text-navy-500">{subtitle}</span>}
          </div>
        </div>
        <Chevron open={open} />
      </button>
      {open && <div className="border-t border-navy-200">{children}</div>}
    </div>
  );
}
