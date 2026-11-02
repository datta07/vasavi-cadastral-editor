import React, { useState, useRef, useEffect } from 'react';

export default function SearchDropdown({ features, onSelectPlot }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? features.filter(f => {
        const p = f.properties || {};
        return (
          String(p.fid || '').toLowerCase().includes(trimmed) ||
          String(p.owner_name || '').toLowerCase().includes(trimmed) ||
          String(p.reg_doc_no || '').toLowerCase().includes(trimmed) ||
          String(p.surveyor_notes || '').toLowerCase().includes(trimmed)
        );
      }).slice(0, 10)
    : [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (fid) => {
    onSelectPlot(fid);
    setIsOpen(false);
  };

  return (
    <div className="search-box" ref={containerRef}>
      <input
        type="text"
        placeholder="🔍 Find plot FID / Owner..."
        value={query}
        onFocus={() => trimmed && setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
            e.target.blur();
          } else if (e.key === 'Enter' && matches.length > 0) {
            handleSelect(matches[0].properties?.fid);
          }
        }}
      />

      {isOpen && trimmed && (
        <div className="search-results">
          {matches.length === 0 ? (
            <div className="search-empty">No matching plots found</div>
          ) : (
            matches.map(f => {
              const p = f.properties || {};
              return (
                <div
                  key={p.fid}
                  className="search-item"
                  onClick={() => handleSelect(p.fid)}
                >
                  <span className="search-fid">[{p.fid || 'N/A'}]</span>
                  <span className="search-owner">{p.owner_name || 'Unassigned'}</span>
                  {p.reg_doc_no && (
                    <span className="search-doc">• {p.reg_doc_no}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
