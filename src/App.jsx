import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from './components/TopBar';
import MapCanvas from './components/MapCanvas';
import NudgePanel from './components/NudgePanel';
import PlotModal from './components/PlotModal';
import Legend from './components/Legend';
import Toast from './components/Toast';
import { 
  BASELINE_FEATURES, 
  INITIAL_OFFSET_N, 
  INITIAL_OFFSET_E,
  INITIAL_GEOJSON 
} from './data/initialData';
import { METERS_PER_LAT, METERS_PER_LON, applyOffsetToCoords } from './utils/geoUtils';
import './App.css';

const STORAGE_KEY_STATE = 'vasavi_editor_persistent_state_v1';
const STORAGE_KEY_LINES = 'vasavi_editor_ref_lines_v1';
const MAX_HISTORY = 60;

export default function App() {
  // Initial state restoration from localStorage
  const [features, setFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.features && parsed.features.length > 0) return parsed.features;
      }
    } catch (e) {
      console.warn("Could not parse saved features:", e);
    }
    return JSON.parse(JSON.stringify(BASELINE_FEATURES));
  });

  const [offsetN, setOffsetN] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.offsetN === 'number') return parsed.offsetN;
      }
    } catch (e) {}
    return INITIAL_OFFSET_N;
  });

  const [offsetE, setOffsetE] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.offsetE === 'number') return parsed.offsetE;
      }
    } catch (e) {}
    return INITIAL_OFFSET_E;
  });

  const [referenceLines, setReferenceLines] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LINES);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { type: "FeatureCollection", features: [] };
  });

  // UI state
  const [isAddingPlot, setIsAddingPlot] = useState(false);
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isFreehandActive, setIsFreehandActive] = useState(false);
  const [guideLinesVisible, setGuideLinesVisible] = useState(true);
  const [selectedFidToJump, setSelectedFidToJump] = useState(null);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'new', // 'new' | 'edit'
    data: null,
    drawnLayer: null
  });

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', icon: '' });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, icon = '') => {
    setToast({ visible: true, message, icon });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 1900);
  }, []);

  // History Stacks using Refs for rock-solid synchronous state tracking
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const currentSnapshotRef = useRef(null);
  const [, setHistoryVersion] = useState(0);

  // Helper to capture current snapshot
  const getSnapshot = useCallback((actionName = 'Action', feat = features, offN = offsetN, offE = offsetE, refL = referenceLines) => {
    return {
      actionName,
      features: JSON.parse(JSON.stringify(feat)),
      offsetN: offN,
      offsetE: offE,
      refLines: JSON.parse(JSON.stringify(refL))
    };
  }, [features, offsetN, offsetE, referenceLines]);

  // Initialize snapshot once
  useEffect(() => {
    if (!currentSnapshotRef.current) {
      currentSnapshotRef.current = getSnapshot('Initial State');
    }
  }, [getSnapshot]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({
        features,
        offsetN,
        offsetE
      }));
    } catch (e) {}
  }, [features, offsetN, offsetE]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(referenceLines));
    } catch (e) {}
  }, [referenceLines]);

  // Record an action into history
  const recordHistory = useCallback((actionName, newFeat = features, newOffN = offsetN, newOffE = offsetE, newRefL = referenceLines) => {
    const prevSnapshot = currentSnapshotRef.current || getSnapshot('Previous State');
    undoStackRef.current.push(prevSnapshot);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    currentSnapshotRef.current = {
      actionName,
      features: JSON.parse(JSON.stringify(newFeat)),
      offsetN: newOffN,
      offsetE: newOffE,
      refLines: JSON.parse(JSON.stringify(newRefL))
    };
    setHistoryVersion(v => v + 1);
  }, [features, offsetN, offsetE, referenceLines, getSnapshot]);

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    // Cancel active drawing modes
    setIsAddingPlot(false);
    setIsRulerActive(false);
    setIsFreehandActive(false);

    const prevSnapshot = undoStackRef.current.pop();
    const currentAction = currentSnapshotRef.current?.actionName || 'Action';

    redoStackRef.current.push(currentSnapshotRef.current);
    if (redoStackRef.current.length > MAX_HISTORY) {
      redoStackRef.current.shift();
    }

    currentSnapshotRef.current = prevSnapshot;
    setFeatures(JSON.parse(JSON.stringify(prevSnapshot.features)));
    setOffsetN(prevSnapshot.offsetN);
    setOffsetE(prevSnapshot.offsetE);
    setReferenceLines(JSON.parse(JSON.stringify(prevSnapshot.refLines)));

    setHistoryVersion(v => v + 1);
    showToast(`Undid: ${currentAction}`, '↶');
  }, [showToast]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    setIsAddingPlot(false);
    setIsRulerActive(false);
    setIsFreehandActive(false);

    const nextSnapshot = redoStackRef.current.pop();
    const redoneAction = nextSnapshot.actionName || 'Action';

    undoStackRef.current.push(currentSnapshotRef.current);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }

    currentSnapshotRef.current = nextSnapshot;
    setFeatures(JSON.parse(JSON.stringify(nextSnapshot.features)));
    setOffsetN(nextSnapshot.offsetN);
    setOffsetE(nextSnapshot.offsetE);
    setReferenceLines(JSON.parse(JSON.stringify(nextSnapshot.refLines)));

    setHistoryVersion(v => v + 1);
    showToast(`Redid: ${redoneAction}`, '↷');
  }, [showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }

      if (e.key === 'Escape') {
        setIsAddingPlot(false);
        setIsRulerActive(false);
        setIsFreehandActive(false);
        setModalState(prev => ({ ...prev, isOpen: false }));
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ------------------------------------------------------------------
  // PLOT MANAGEMENT (GENERIC ADD & EDIT)
  // ------------------------------------------------------------------
  const handleFinishDrawingPlot = (layer) => {
    setIsAddingPlot(false);

    // Calculate next suggested numeric FID
    const numericFids = features.map(f => parseInt(f.properties?.fid)).filter(n => !isNaN(n));
    const nextFid = numericFids.length > 0 ? (Math.max(...numericFids) + 1) : (features.length + 1);

    setModalState({
      isOpen: true,
      mode: 'new',
      drawnLayer: layer,
      data: {
        fid: nextFid,
        owner_name: '',
        reg_doc_no: '',
        surveyor_notes: '',
        land_status: '',
        nature_of_land: '',
        is_colony: false
      }
    });
  };

  const handleOpenEditModal = (fid) => {
    const feat = features.find(f => String(f.properties?.fid) === String(fid));
    if (!feat) return;

    setModalState({
      isOpen: true,
      mode: 'edit',
      drawnLayer: null,
      data: { ...feat.properties }
    });
  };

  const handleSavePlotModal = (formData) => {
    if (modalState.mode === 'edit') {
      const origFid = modalState.data?.fid;
      const finalFid = formData.fid || origFid;

      const newFeatures = features.map(f => {
        if (String(f.properties?.fid) === String(origFid)) {
          return {
            ...f,
            properties: {
              ...f.properties,
              ...formData,
              house_condition: formData.house_condition || null,
              fid: finalFid
            }
          };
        }
        return f;
      });

      setFeatures(newFeatures);
      recordHistory(`Edit Plot [${finalFid}] Attributes`, newFeatures);
      showToast(`Saved Plot [${finalFid}]`, '💾');
      setModalState({ isOpen: false, mode: 'new', data: null, drawnLayer: null });
      return;
    }

    // Creating new plot
    const layer = modalState.drawnLayer;
    if (!layer) return;

    const geo = layer.toGeoJSON();
    const finalFid = formData.fid || (features.length + 1);

    geo.properties = {
      ...formData,
      fid: finalFid,
      house_condition: formData.house_condition || null,
      number_of_floors: null,
      is_mortgaged: null,
      mortgage_bank: null,
      mortgage_doc_no: null,
      electricity_no: null,
      doc_link: '',
      _is_new: true
    };

    const existingIdx = features.findIndex(f => String(f.properties?.fid) === String(finalFid));
    let nextFeatures;
    if (existingIdx !== -1) {
      nextFeatures = [...features];
      nextFeatures[existingIdx] = geo;
    } else {
      nextFeatures = [...features, geo];
    }

    setFeatures(nextFeatures);
    const plotLabel = formData.owner_name ? `Add Plot [${finalFid}] (${formData.owner_name})` : `Add Plot [${finalFid}]`;
    recordHistory(plotLabel, nextFeatures);
    showToast(`Added Plot [${finalFid}]`, '➕');

    // Cleanup layer from temporary map draw
    layer.remove();
    setModalState({ isOpen: false, mode: 'new', data: null, drawnLayer: null });
  };

  const handleDeletePlot = (fid) => {
    const feat = features.find(f => String(f.properties?.fid) === String(fid));
    const owner = feat?.properties?.owner_name || '';
    const plotLabel = owner ? `[${fid}] ${owner}` : `[${fid}]`;

    if (window.confirm(`Delete plot ${plotLabel}?`)) {
      const nextFeatures = features.filter(f => String(f.properties?.fid) !== String(fid));
      setFeatures(nextFeatures);
      recordHistory(`Delete Plot ${plotLabel}`, nextFeatures);
      showToast(`Deleted Plot ${plotLabel}`, '🗑️');
    }
  };

  const handleEditPlotGeometry = (fid, newGeometry) => {
    const nextFeatures = features.map(f => {
      if (String(f.properties?.fid) === String(fid)) {
        let finalGeo = newGeometry;
        if (f.geometry?.type === 'MultiPolygon' && newGeometry?.type === 'Polygon') {
          finalGeo = {
            type: 'MultiPolygon',
            coordinates: [newGeometry.coordinates]
          };
        }
        return { ...f, geometry: finalGeo };
      }
      return f;
    });
    setFeatures(nextFeatures);
    recordHistory(`Reshape Plot [${fid}]`, nextFeatures);
    showToast(`Reshaped Plot [${fid}]`, '✏️');
  };

  const handleMovePlotGeometry = (fid, newGeometry) => {
    const nextFeatures = features.map(f => {
      if (String(f.properties?.fid) === String(fid)) {
        let finalGeo = newGeometry;
        if (f.geometry?.type === 'MultiPolygon' && newGeometry?.type === 'Polygon') {
          finalGeo = {
            type: 'MultiPolygon',
            coordinates: [newGeometry.coordinates]
          };
        }
        return { ...f, geometry: finalGeo };
      }
      return f;
    });
    setFeatures(nextFeatures);
    recordHistory(`Move Plot [${fid}]`, nextFeatures);
    showToast(`Moved Plot [${fid}]`, '✋');
  };

  // ------------------------------------------------------------------
  // NUDGE / CALIBRATION
  // ------------------------------------------------------------------
  const handleNudge = (xDir, yDir, step) => {
    const newOffE = offsetE + xDir * step;
    const newOffN = offsetN + yDir * step;
    setOffsetE(newOffE);
    setOffsetN(newOffN);

    let dirStr = '';
    if (xDir > 0) dirStr = `Nudge East (${step}m)`;
    else if (xDir < 0) dirStr = `Nudge West (${step}m)`;
    else if (yDir > 0) dirStr = `Nudge North (${step}m)`;
    else if (yDir < 0) dirStr = `Nudge South (${step}m)`;

    recordHistory(dirStr, features, newOffN, newOffE);
  };

  const handleResetNudge = () => {
    if (offsetN === 0 && offsetE === 0) return;
    setOffsetN(0.0);
    setOffsetE(0.0);
    recordHistory('Reset Nudge Offset', features, 0.0, 0.0);
  };

  const handleBakeOffset = () => {
    if (offsetN === 0 && offsetE === 0) {
      alert("Offset is already zero. Nothing to bake.");
      return;
    }
    const dLat = offsetN / METERS_PER_LAT;
    const dLon = offsetE / METERS_PER_LON;

    const bakedFeatures = features.map(f => {
      const isNewPlot = f.properties && f.properties._is_new;
      if (!isNewPlot && f.geometry && f.geometry.coordinates) {
        return {
          ...f,
          geometry: {
            ...f.geometry,
            coordinates: applyOffsetToCoords(f.geometry.coordinates, dLat, dLon)
          }
        };
      }
      return f;
    });

    setFeatures(bakedFeatures);
    setOffsetN(0.0);
    setOffsetE(0.0);
    recordHistory('Bake Offset into Coordinates', bakedFeatures, 0.0, 0.0);
    showToast("Offset baked into coordinates!", "💾");
  };

  const handleResetLayout = () => {
    if (window.confirm("Reset layout to original GeoJSON from disk?")) {
      const baseline = JSON.parse(JSON.stringify(BASELINE_FEATURES));
      setFeatures(baseline);
      setOffsetN(-4.0);
      setOffsetE(-4.0);
      recordHistory('Reset to Default Layout', baseline, -4.0, -4.0);
      showToast("Reset to default layout", "🔄");
    }
  };

  // ------------------------------------------------------------------
  // GUIDE LINES
  // ------------------------------------------------------------------
  const handleUpdateReferenceLines = (newRefLinesGeo) => {
    setReferenceLines(newRefLinesGeo);
    recordHistory('Update Guide Lines', features, offsetN, offsetE, newRefLinesGeo);
  };

  const handleClearGuideLines = () => {
    if (!referenceLines.features || referenceLines.features.length === 0) return;
    if (window.confirm("Remove all reference/guide lines?")) {
      const emptyLines = { type: "FeatureCollection", features: [] };
      setReferenceLines(emptyLines);
      recordHistory('Clear All Guide Lines', features, offsetN, offsetE, emptyLines);
      showToast('Cleared all guide lines', '🧹');
    }
  };

  // ------------------------------------------------------------------
  // EXPORT
  // ------------------------------------------------------------------
  const handleExport = () => {
    const dLat = offsetN / METERS_PER_LAT;
    const dLon = offsetE / METERS_PER_LON;

    const exportFeatures = features.map(f => {
      const cleanF = JSON.parse(JSON.stringify(f));
      const isNewPlot = cleanF.properties && cleanF.properties._is_new;
      if (cleanF.properties) delete cleanF.properties._is_new;
      if (!isNewPlot && (dLat !== 0 || dLon !== 0) && cleanF.geometry) {
        cleanF.geometry.coordinates = applyOffsetToCoords(cleanF.geometry.coordinates, dLat, dLon);
      }
      return cleanF;
    });

    const exportData = {
      type: "FeatureCollection",
      name: "vasavi_map",
      crs: INITIAL_GEOJSON.crs,
      features: exportFeatures
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "vasavi_map.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Exported vasavi_map.geojson", "📁");
  };

  // ------------------------------------------------------------------
  // IMPORT GEOJSON
  // ------------------------------------------------------------------
  const handleImportGeoJSON = (geoData) => {
    let rawFeatures = [];
    if (geoData?.type === 'FeatureCollection' && Array.isArray(geoData.features)) {
      rawFeatures = geoData.features;
    } else if (geoData?.type === 'Feature') {
      rawFeatures = [geoData];
    } else if (Array.isArray(geoData)) {
      rawFeatures = geoData;
    } else {
      alert("Invalid GeoJSON: Expected a FeatureCollection or Feature object.");
      return;
    }

    const cleanFeatures = rawFeatures.filter(f => f && f.geometry && f.geometry.coordinates).map((f, idx) => {
      const cleanF = JSON.parse(JSON.stringify(f));
      const p = cleanF.properties || {};
      cleanF.properties = {
        ...p,
        fid: p.fid !== undefined ? p.fid : (p.plot_no ? p.plot_no : `plot_${idx + 1}`),
        owner_name: p.owner_name || '',
        reg_doc_no: p.reg_doc_no || '',
        land_status: p.land_status || '',
        nature_of_land: p.nature_of_land || '',
        is_colony: p.is_colony !== undefined ? Boolean(p.is_colony) : false,
        _is_new: false
      };
      return cleanF;
    });

    if (cleanFeatures.length === 0) {
      alert("No valid plot features with geometries found in the imported file.");
      return;
    }

    // Clear current GeoJSON completely and load the imported features
    const nextFeatures = cleanFeatures;
    setFeatures(nextFeatures);
    setOffsetN(0.0);
    setOffsetE(0.0);
    recordHistory(`Import GeoJSON (${cleanFeatures.length} plots)`, nextFeatures, 0.0, 0.0);
    showToast(`Cleared previous & imported ${cleanFeatures.length} plots`, '📥');

    // Auto-fit map camera bounds to newly imported plots
    setTimeout(() => {
      if (window.__leaflet_map__ && window.__plot_layer_group__) {
        try {
          const bounds = window.__plot_layer_group__.getBounds();
          if (bounds && bounds.isValid()) {
            window.__leaflet_map__.fitBounds(bounds, { padding: [40, 40], maxZoom: 20 });
          }
        } catch (e) {
          console.warn('Could not fit bounds to imported plots:', e);
        }
      }
    }, 150);
  };

  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const undoTooltip = canUndo
    ? `Undo: ${currentSnapshotRef.current?.actionName || 'Action'} (Ctrl+Z)`
    : 'Nothing to undo (Ctrl+Z)';

  const redoTooltip = canRedo
    ? `Redo: ${redoStackRef.current[redoStackRef.current.length - 1]?.actionName || 'Action'} (Ctrl+Y / Ctrl+Shift+Z)`
    : 'Nothing to redo (Ctrl+Y)';

  return (
    <div className="app-container">
      <TopBar
        plotCount={features.length}
        canUndo={canUndo}
        canRedo={canRedo}
        undoTooltip={undoTooltip}
        redoTooltip={redoTooltip}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isAddingPlot={isAddingPlot}
        onToggleAddPlot={() => setIsAddingPlot(prev => !prev)}
        features={features}
        onSelectPlot={(fid) => setSelectedFidToJump(fid)}
        isNudgeOpen={isNudgeOpen}
        onToggleNudge={() => setIsNudgeOpen(prev => !prev)}
        isRulerActive={isRulerActive}
        onToggleRuler={() => {
          setIsFreehandActive(false);
          setIsAddingPlot(false);
          setIsRulerActive(prev => !prev);
        }}
        isFreehandActive={isFreehandActive}
        onToggleFreehand={() => {
          setIsRulerActive(false);
          setIsAddingPlot(false);
          setIsFreehandActive(prev => !prev);
        }}
        guideLinesVisible={guideLinesVisible}
        onToggleGuideLines={() => setGuideLinesVisible(prev => !prev)}
        onClearGuideLines={handleClearGuideLines}
        onExport={handleExport}
        onImport={handleImportGeoJSON}
      />

      <NudgePanel
        isOpen={isNudgeOpen}
        offsetN={offsetN}
        offsetE={offsetE}
        onNudge={handleNudge}
        onResetNudge={handleResetNudge}
        onBakeOffset={handleBakeOffset}
        onResetLayout={handleResetLayout}
        onUndo={handleUndo}
        canUndo={canUndo}
      />

      <MapCanvas
        features={features}
        offsetN={offsetN}
        offsetE={offsetE}
        isAddingPlot={isAddingPlot}
        onFinishDrawingPlot={handleFinishDrawingPlot}
        onEditPlotGeometry={handleEditPlotGeometry}
        onMovePlotGeometry={handleMovePlotGeometry}
        onDeletePlot={handleDeletePlot}
        onOpenEditModal={handleOpenEditModal}
        selectedFidToJump={selectedFidToJump}
        onJumpComplete={() => setSelectedFidToJump(null)}
        isRulerActive={isRulerActive}
        onRulerFinish={() => setIsRulerActive(false)}
        isFreehandActive={isFreehandActive}
        onFreehandFinish={() => setIsFreehandActive(false)}
        guideLinesVisible={guideLinesVisible}
        referenceLinesData={referenceLines}
        onUpdateReferenceLines={handleUpdateReferenceLines}
      />

      <Legend />

      <PlotModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.data}
        onSave={handleSavePlotModal}
        onCancel={() => {
          if (modalState.drawnLayer) modalState.drawnLayer.remove();
          setModalState({ isOpen: false, mode: 'new', data: null, drawnLayer: null });
        }}
      />

      <Toast toast={toast} />
    </div>
  );
}
