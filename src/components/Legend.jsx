import React from 'react';

export default function Legend() {
  return (
    <div className="legend">
      <div className="legend-title">Map Legend</div>
      <div className="legend-item">
        <div className="color-box existing-plot"></div>
        <span>Existing Plots</span>
      </div>
      <div className="legend-item">
        <div className="color-box digitized-plot"></div>
        <span>Digitized / Custom Plots</span>
      </div>
      <div className="legend-item">
        <div className="color-box guide-line"></div>
        <span>Guide Line (Local Only)</span>
      </div>
    </div>
  );
}
