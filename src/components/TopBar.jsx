import React, { useRef } from 'react';
import { 
  Undo2, 
  Redo2, 
  Plus, 
  Ruler, 
  Pencil, 
  Eye, 
  EyeOff, 
  Trash2, 
  Download, 
  Upload,
  Compass 
} from 'lucide-react';
import SearchDropdown from './SearchDropdown';

export default function TopBar({
  plotCount,
  canUndo,
  canRedo,
  undoTooltip,
  redoTooltip,
  onUndo,
  onRedo,
  isAddingPlot,
  onToggleAddPlot,
  features,
  onSelectPlot,
  isNudgeOpen,
  onToggleNudge,
  isRulerActive,
  onToggleRuler,
  isFreehandActive,
  onToggleFreehand,
  guideLinesVisible,
  onToggleGuideLines,
  onClearGuideLines,
  onExport,
  onImport
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (onImport) onImport(parsed);
      } catch (err) {
        alert("Failed to parse file: Please ensure it is valid JSON / GeoJSON.");
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };
  return (
    <div className="top-bar">
      <h2>Vasavi Nagar Colony Cadastral Editor</h2>
      <span className="badge">Plots: {plotCount}</span>

      {/* Undo / Redo controls */}
      <div className="btn-group">
        <button
          id="btnUndo"
          className="btn btn-history"
          onClick={onUndo}
          disabled={!canUndo}
          title={undoTooltip}
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          id="btnRedo"
          className="btn btn-history"
          onClick={onRedo}
          disabled={!canRedo}
          title={redoTooltip}
        >
          <Redo2 size={14} /> Redo
        </button>
      </div>

      {/* Generic Plot Addition */}
      <button
        id="btnAddPlot"
        className={`btn ${isAddingPlot ? 'btn-active-draw' : 'btn-primary'}`}
        onClick={onToggleAddPlot}
        title="Draw new cadastral plot polygon"
      >
        <Plus size={15} />
        {isAddingPlot ? 'Drawing Plot... (Esc to cancel)' : 'Add Plot'}
      </button>

      {/* Plot Search / Locator */}
      <SearchDropdown
        features={features}
        onSelectPlot={onSelectPlot}
      />

      {/* Nudge / Georeferencing toggle */}
      <button
        className={`btn ${isNudgeOpen ? 'btn-warning-active' : 'btn-warning'}`}
        onClick={onToggleNudge}
        title="Calibrate GeoJSON offset against satellite imagery"
      >
        <Compass size={14} /> Nudge / Align
      </button>

      {/* Guide Line Drawing Tools */}
      <button
        className={`btn ${isRulerActive ? 'btn-active-ruler' : 'btn-ruler'}`}
        onClick={onToggleRuler}
        title="2-Click straight distance ruler"
      >
        <Ruler size={14} />
        {isRulerActive ? 'Click Points... (Esc)' : 'Straight Ruler'}
      </button>

      <button
        className={`btn ${isFreehandActive ? 'btn-active-freehand' : 'btn-freehand'}`}
        onClick={onToggleFreehand}
        title="Freehand pencil drag to sketch notes or boundaries"
      >
        <Pencil size={14} />
        {isFreehandActive ? 'Sketching Active... (Esc)' : 'Freehand Draw'}
      </button>

      <button
        className="btn btn-secondary"
        onClick={onToggleGuideLines}
        title={guideLinesVisible ? "Hide guide lines" : "Show guide lines"}
      >
        {guideLinesVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        {guideLinesVisible ? 'Hide Lines' : 'Show Lines'}
      </button>

      <button
        className="btn btn-muted"
        onClick={onClearGuideLines}
        title="Remove all guide lines"
      >
        <Trash2 size={13} /> Clear Lines
      </button>

      {/* GeoJSON Import & Export */}
      <input
        type="file"
        id="geoJsonFileInput"
        ref={fileInputRef}
        accept=".geojson,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <button
        id="btnImportGeoJson"
        className="btn btn-secondary"
        onClick={() => fileInputRef.current?.click()}
        title="Import plots from GeoJSON or JSON file"
      >
        <Upload size={14} /> Import GeoJSON
      </button>

      <button
        id="btnExportGeoJson"
        className="btn btn-success"
        onClick={onExport}
        title="Export calibrated RFC 7946 GeoJSON FeatureCollection"
      >
        <Download size={14} /> Export GeoJSON
      </button>
    </div>
  );
}
