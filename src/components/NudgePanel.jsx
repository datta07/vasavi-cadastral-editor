import React, { useState } from 'react';

export default function NudgePanel({
  isOpen,
  offsetN,
  offsetE,
  onNudge,
  onResetNudge,
  onBakeOffset,
  onResetLayout,
  onUndo,
  canUndo
}) {
  const [stepSize, setStepSize] = useState(1.0);

  if (!isOpen) return null;

  const formatOffset = () => {
    const nDir = offsetN >= 0 ? 'N' : 'S';
    const eDir = offsetE >= 0 ? 'E' : 'W';
    return `Offset: ${nDir} ${Math.abs(offsetN).toFixed(1)}m, ${eDir} ${Math.abs(offsetE).toFixed(1)}m`;
  };

  return (
    <div className="nudge-panel">
      <h4>Nudge GeoJSON Alignment</h4>
      <div className="step-selector">
        Step size:
        <select
          value={stepSize}
          onChange={(e) => setStepSize(parseFloat(e.target.value))}
        >
          <option value={0.5}>0.5 m</option>
          <option value={1.0}>1.0 m</option>
          <option value={2.0}>2.0 m</option>
          <option value={5.0}>5.0 m</option>
        </select>
      </div>

      <div className="nudge-grid">
        <div></div>
        <button className="nudge-btn" onClick={() => onNudge(0, 1, stepSize)} title="Nudge North">▲</button>
        <div></div>

        <button className="nudge-btn" onClick={() => onNudge(-1, 0, stepSize)} title="Nudge West">◄</button>
        <button className="nudge-btn" onClick={onResetNudge} title="Reset Nudge Offset to Zero">●</button>
        <button className="nudge-btn" onClick={() => onNudge(1, 0, stepSize)} title="Nudge East">►</button>

        <div></div>
        <button className="nudge-btn" onClick={() => onNudge(0, -1, stepSize)} title="Nudge South">▼</button>
        <div></div>
      </div>

      <div className="offset-text">{formatOffset()}</div>

      <button
        className="btn btn-history"
        style={{ width: '100%', fontSize: '11px', padding: '5px 0', marginBottom: '6px' }}
        onClick={onUndo}
        disabled={!canUndo}
      >
        ↶ Undo Last Nudge
      </button>

      <button
        className="btn"
        style={{ width: '100%', fontSize: '11px', padding: '5px 0', marginBottom: '6px' }}
        onClick={onBakeOffset}
      >
        Bake Offset into GeoJSON
      </button>

      <button
        className="btn btn-danger"
        style={{ width: '100%', fontSize: '11px', padding: '5px 0' }}
        onClick={onResetLayout}
      >
        Reset to Default Layout
      </button>
    </div>
  );
}
