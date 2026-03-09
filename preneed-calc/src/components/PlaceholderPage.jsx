export default function PlaceholderPage({ title, description }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-100 mb-6">
          <svg className="w-8 h-8 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-navy-800 mb-2">{title}</h2>
        <p className="text-navy-500 text-sm max-w-md mx-auto">{description || 'This section is coming soon. Check back for updates.'}</p>
        <div className="mt-8 inline-flex items-center gap-2 text-xs text-navy-400 bg-navy-100 rounded-full px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
