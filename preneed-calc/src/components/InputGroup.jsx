export default function InputGroup({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-navy-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
