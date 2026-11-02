import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { 
  METERS_PER_LAT, 
  METERS_PER_LON, 
  COLONY_CENTER, 
  applyOffsetToCoords,
  calculateDistanceMeters 
} from '../utils/geoUtils';

// Fix default marker icons in Leaflet for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapCanvas({
  features,
  offsetN,
  offsetE,
  isAddingPlot,
  onFinishDrawingPlot,
  onEditPlotGeometry,
  onMovePlotGeometry,
  onDeletePlot,
  onOpenEditModal,
  selectedFidToJump,
  onJumpComplete,
  isRulerActive,
  onRulerFinish,
  isFreehandActive,
  onFreehandFinish,
  guideLinesVisible,
  referenceLinesData,
  onUpdateReferenceLines
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const plotLayerGroupRef = useRef(null);
  const refLinesGroupRef = useRef(null);

  // Ruler state
  const rulerStartRef = useRef(null);
  const rulerTempLineRef = useRef(null);
  const rulerTooltipRef = useRef(null);

  // Freehand state
  const isMouseDownRef = useRef(false);
  const freehandTempLineRef = useRef(null);
  const freehandPointsRef = useRef([]);

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: COLONY_CENTER,
      zoom: 19,
      maxZoom: 21
    });

    // Offline Local Satellite (Primary)
    const offlineSatellite = L.tileLayer('satellite_tiles/{z}/{x}/{y}.jpg', {
      attribution: '&copy; Offline Satellite Imagery',
      maxZoom: 21,
      maxNativeZoom: 19,
      errorTileUrl: 'https://duckduckgo.com/mapkit/?https://sat-cdn.apple-mapkit.com/tile?style=7&size=2&scale=1&z={z}&x={x}&y={y}&v=10481&accessKey=1793394495_396044025412308342_%2F_IRwQCbQh31chNux38Tc1SFB4xF3db6roxzFj%2Bhxv4%2FU%3D'
    }).addTo(map);

    // Online layers
    const appleSatellite = L.tileLayer(
      'https://duckduckgo.com/mapkit/?https://sat-cdn.apple-mapkit.com/tile?style=7&size=2&scale=1&z={z}&x={x}&y={y}&v=10481&accessKey=1793394495_396044025412308342_%2F_IRwQCbQh31chNux38Tc1SFB4xF3db6roxzFj%2Bhxv4%2FU%3D',
      {
        attribution: '&copy; Apple Maps Satellite | MapKit',
        maxZoom: 21,
        maxNativeZoom: 19
      }
    );

    const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Satellite',
      maxZoom: 21,
      maxNativeZoom: 18
    });

    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri World Imagery',
      maxZoom: 21
    });

    L.control.layers({
      "Offline Satellite (Local - Active)": offlineSatellite,
      "Apple Maps Satellite (Online)": appleSatellite,
      "Google Satellite (Online)": googleSatellite,
      "Esri World Imagery (Online)": esriSatellite
    }).addTo(map);

    const plotGroup = L.featureGroup().addTo(map);
    const refLinesGroup = L.featureGroup().addTo(map);

    plotLayerGroupRef.current = plotGroup;
    refLinesGroupRef.current = refLinesGroup;
    mapInstanceRef.current = map;
    window.__leaflet_map__ = map;
    window.__plot_layer_group__ = plotGroup;

    // Geoman Setup
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true
    });

    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 25,
      snapSegment: true,
      snapVertex: true,
      snapMiddle: true,
      snappingOrder: ['Marker', 'CircleMarker', 'Polygon', 'Rectangle', 'Line'],
      allowSelfIntersection: false
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Setup Geoman Events
  useEffect(() => {
    const map = mapInstanceRef.current;
    const plotGroup = plotLayerGroupRef.current;
    const refLinesGroup = refLinesGroupRef.current;
    if (!map) return;

    const handleCreate = (e) => {
      if (e.shape === 'Line' || !(e.layer instanceof L.Polygon)) {
        // Guide line
        const refLine = e.layer;
        setupGuideLine(refLine);
        refLinesGroupRef.current?.addLayer(refLine);
        notifyRefLinesChange();
        return;
      }
      onFinishDrawingPlot(e.layer);
    };

    const handleEdit = (e) => {
      const targetLayer = e?.layer || e?.target;
      const fid = targetLayer?.featureFid;
      if (fid !== undefined) {
        const isNewPlot = targetLayer.isNewPlot;
        const newGeo = targetLayer.toGeoJSON();
        const dLat = offsetN / METERS_PER_LAT;
        const dLon = offsetE / METERS_PER_LON;
        if (!isNewPlot && newGeo.geometry) {
          newGeo.geometry.coordinates = applyOffsetToCoords(newGeo.geometry.coordinates, -dLat, -dLon);
        }
        onEditPlotGeometry(fid, newGeo.geometry);
      } else if (refLinesGroupRef.current?.hasLayer(targetLayer)) {
        notifyRefLinesChange();
      }
    };

    const handleDragEnd = (e) => {
      const targetLayer = e?.layer || e?.target;
      const fid = targetLayer?.featureFid;
      if (fid !== undefined) {
        const isNewPlot = targetLayer.isNewPlot;
        const newGeo = targetLayer.toGeoJSON();
        const dLat = offsetN / METERS_PER_LAT;
        const dLon = offsetE / METERS_PER_LON;
        if (!isNewPlot && newGeo.geometry) {
          newGeo.geometry.coordinates = applyOffsetToCoords(newGeo.geometry.coordinates, -dLat, -dLon);
        }
        onMovePlotGeometry(fid, newGeo.geometry);
      } else if (refLinesGroupRef.current?.hasLayer(targetLayer)) {
        notifyRefLinesChange();
      }
    };

    const handleRemove = (e) => {
      const targetLayer = e?.layer || e?.target;
      const fid = targetLayer?.featureFid;
      if (fid !== undefined) {
        onDeletePlot(fid);
      } else if (refLinesGroupRef.current?.hasLayer(targetLayer)) {
        notifyRefLinesChange();
      }
    };

    map.on('pm:create', handleCreate);
    map.on('pm:edit', handleEdit);
    map.on('pm:dragend', handleDragEnd);
    map.on('pm:remove', handleRemove);

    if (plotGroup) {
      plotGroup.on('pm:edit', handleEdit);
      plotGroup.on('pm:dragend', handleDragEnd);
      plotGroup.on('pm:remove', handleRemove);
    }

    if (refLinesGroup) {
      refLinesGroup.on('pm:edit', notifyRefLinesChange);
      refLinesGroup.on('pm:dragend', notifyRefLinesChange);
      refLinesGroup.on('pm:remove', notifyRefLinesChange);
    }

    return () => {
      map.off('pm:create', handleCreate);
      map.off('pm:edit', handleEdit);
      map.off('pm:dragend', handleDragEnd);
      map.off('pm:remove', handleRemove);
      if (plotGroup) {
        plotGroup.off('pm:edit', handleEdit);
        plotGroup.off('pm:dragend', handleDragEnd);
        plotGroup.off('pm:remove', handleRemove);
      }
      if (refLinesGroup) {
        refLinesGroup.off('pm:edit', notifyRefLinesChange);
        refLinesGroup.off('pm:dragend', notifyRefLinesChange);
        refLinesGroup.off('pm:remove', notifyRefLinesChange);
      }
    };
  }, [offsetN, offsetE, onFinishDrawingPlot, onEditPlotGeometry, onMovePlotGeometry, onDeletePlot]);

  // Helper for guide lines
  const notifyRefLinesChange = () => {
    if (refLinesGroupRef.current) {
      onUpdateReferenceLines(refLinesGroupRef.current.toGeoJSON());
    }
  };

  const setupGuideLine = (layer) => {
    layer.setStyle({
      color: '#fa5252',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.95,
      className: 'guide-line'
    });

    const updateMeasurements = () => {
      const latlngs = layer.getLatLngs ? layer.getLatLngs() : [];
      const map = mapInstanceRef.current;
      const totalMeters = calculateDistanceMeters(latlngs, map);
      const totalFeet = (totalMeters * 3.28084).toFixed(1);
      const lengthText = totalMeters > 0 ? `${totalFeet} ft (${totalMeters.toFixed(1)}m)` : '';
      if (layer.setTooltipContent) {
        layer.setTooltipContent(`<b>Guide Line${lengthText ? ': ' + lengthText : ''}</b><br>Click to delete`);
      }
      notifyRefLinesChange();
    };

    const latlngs = layer.getLatLngs ? layer.getLatLngs() : [];
    const map = mapInstanceRef.current;
    const totalMeters = calculateDistanceMeters(latlngs, map);
    const totalFeet = (totalMeters * 3.28084).toFixed(1);
    const lengthText = totalMeters > 0 ? `${totalFeet} ft (${totalMeters.toFixed(1)}m)` : '';

    layer.bindTooltip(`<b>Guide Line${lengthText ? ': ' + lengthText : ''}</b><br>Click to delete`, { sticky: true });
    layer.on('click', () => {
      refLinesGroupRef.current?.removeLayer(layer);
      notifyRefLinesChange();
    });

    layer.on('pm:edit', updateMeasurements);
    layer.on('pm:markerdragend', updateMeasurements);
    layer.on('pm:vertexadded', updateMeasurements);
    layer.on('pm:vertexremoved', updateMeasurements);
    layer.on('pm:dragend', updateMeasurements);
  };

  // 3. Render plots whenever features or offsets change
  useEffect(() => {
    const group = plotLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;

    group.clearLayers();
    const dLat = offsetN / METERS_PER_LAT;
    const dLon = offsetE / METERS_PER_LON;

    features.forEach((f) => {
      const isNewPlot = f.properties && f.properties._is_new;
      const shifted = JSON.parse(JSON.stringify(f));

      if (!isNewPlot && shifted.geometry && shifted.geometry.coordinates) {
        shifted.geometry.coordinates = applyOffsetToCoords(shifted.geometry.coordinates, dLat, dLon);
      }

      const p = f.properties || {};
      const layer = L.geoJSON(shifted, {
        style: {
          color: isNewPlot ? '#ffd700' : '#00a8ff',
          weight: isNewPlot ? 3 : 2,
          fillColor: isNewPlot ? '#ffd700' : '#00a8ff',
          fillOpacity: isNewPlot ? 0.45 : 0.15
        },
        onEachFeature: (feature, sublayer) => {
          sublayer.featureFid = p.fid;
          sublayer.isNewPlot = isNewPlot;

          let editTimer = null;
          const syncLayerGeometry = (actionType = 'Reshape') => {
            if (editTimer) clearTimeout(editTimer);
            editTimer = setTimeout(() => {
              const fid = sublayer.featureFid;
              if (fid === undefined) return;
              const newGeo = sublayer.toGeoJSON();
              const dLat = offsetN / METERS_PER_LAT;
              const dLon = offsetE / METERS_PER_LON;
              if (!sublayer.isNewPlot && newGeo.geometry) {
                newGeo.geometry.coordinates = applyOffsetToCoords(newGeo.geometry.coordinates, -dLat, -dLon);
              }
              if (actionType === 'Move') {
                onMovePlotGeometry(fid, newGeo.geometry);
              } else {
                onEditPlotGeometry(fid, newGeo.geometry);
              }
            }, 30);
          };

          sublayer.on('pm:markerdragend', () => syncLayerGeometry('Reshape'));
          sublayer.on('pm:vertexadded', () => syncLayerGeometry('Reshape'));
          sublayer.on('pm:vertexremoved', () => syncLayerGeometry('Reshape'));
          sublayer.on('pm:edit', () => syncLayerGeometry('Reshape'));
          sublayer.on('pm:dragend', () => syncLayerGeometry('Move'));

          sublayer.bindTooltip(`<b>[${p.fid || 'N/A'}] ${p.owner_name || 'Unassigned'}</b><br>${p.reg_doc_no || 'No Doc'}`, {
            sticky: true,
            direction: 'top'
          });

          sublayer.on('click', () => {
            const popupContent = document.createElement('div');
            popupContent.style.minWidth = '210px';
            popupContent.innerHTML = `
              <h4 style="margin:0 0 5px; color:#1971c2; font-size:14px;">[${p.fid || 'N/A'}] ${p.owner_name || 'No Owner'}</h4>
              <div style="font-size:12px; line-height:1.5;">
                <b>Doc:</b> ${p.reg_doc_no || 'N/A'}<br>
                <b>Status:</b> ${p.land_status || 'N/A'}<br>
                <b>Nature:</b> ${p.nature_of_land || 'N/A'}<br>
                ${p.house_condition ? `<b>Condition:</b> ${p.house_condition}<br>` : ''}
                <b>Colony Plot:</b> ${Boolean(p.is_colony) ? 'true' : 'false'}<br>
                ${p.surveyor_notes ? `<b>Notes:</b> ${p.surveyor_notes}<br>` : ''}
              </div>
              <div style="margin-top:10px; display:flex; gap:6px;">
                <button id="btn-popup-edit-${p.fid}" style="background:#1971c2; color:#fff; border:none; padding:4px 9px; border-radius:4px; font-size:11px; cursor:pointer;">✏️ Edit</button>
                <button id="btn-popup-del-${p.fid}" style="background:#c92a2a; color:#fff; border:none; padding:4px 9px; border-radius:4px; font-size:11px; cursor:pointer;">🗑️ Delete</button>
              </div>
            `;

            L.popup()
              .setLatLng(sublayer.getBounds().getCenter())
              .setContent(popupContent)
              .openOn(map);

            setTimeout(() => {
              const editBtn = document.getElementById(`btn-popup-edit-${p.fid}`);
              const delBtn = document.getElementById(`btn-popup-del-${p.fid}`);
              if (editBtn) {
                editBtn.onclick = () => {
                  map.closePopup();
                  onOpenEditModal(p.fid);
                };
              }
              if (delBtn) {
                delBtn.onclick = () => {
                  map.closePopup();
                  onDeletePlot(p.fid);
                };
              }
            }, 50);
          });
        }
      });

      layer.featureFid = p.fid;
      group.addLayer(layer);
    });
  }, [features, offsetN, offsetE, onOpenEditModal, onDeletePlot, onEditPlotGeometry, onMovePlotGeometry]);

  // 4. Synchronize reference lines from props
  useEffect(() => {
    const group = refLinesGroupRef.current;
    if (!group) return;

    group.clearLayers();
    if (referenceLinesData && referenceLinesData.features && referenceLinesData.features.length > 0) {
      L.geoJSON(referenceLinesData, {
        onEachFeature: (feature, layer) => {
          setupGuideLine(layer);
          group.addLayer(layer);
        }
      });
    }
  }, [referenceLinesData]);

  // 5. Toggle guide lines visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = refLinesGroupRef.current;
    if (!map || !group) return;

    if (guideLinesVisible) {
      if (!map.hasLayer(group)) map.addLayer(group);
    } else {
      if (map.hasLayer(group)) map.removeLayer(group);
    }
  }, [guideLinesVisible]);

  // 6. Add Plot drawing mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isAddingPlot) {
      map.pm.enableDraw('Polygon', {
        snappable: true,
        snapDistance: 25,
        allowSelfIntersection: false
      });
    } else {
      if (map.pm.globalDrawModeEnabled()) {
        map.pm.disableDraw();
      }
    }
  }, [isAddingPlot]);

  // 7. Auto-jump to plot from search
  useEffect(() => {
    if (!selectedFidToJump) return;
    const group = plotLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map) return;

    let targetLayer = null;
    group.eachLayer(layer => {
      if (layer.eachLayer) {
        layer.eachLayer(sub => {
          if (sub.featureFid && String(sub.featureFid) === String(selectedFidToJump)) {
            targetLayer = sub;
          }
        });
      } else if (layer.featureFid && String(layer.featureFid) === String(selectedFidToJump)) {
        targetLayer = layer;
      }
    });

    if (targetLayer && targetLayer.getBounds) {
      map.fitBounds(targetLayer.getBounds(), { maxZoom: 20, padding: [40, 40] });
      setTimeout(() => {
        targetLayer.fire('click');
        onJumpComplete();
      }, 300);
    } else {
      onJumpComplete();
    }
  }, [selectedFidToJump, onJumpComplete]);

  // 8. Straight Ruler tool
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isRulerActive) {
      rulerStartRef.current = null;
      if (rulerTempLineRef.current) {
        map.removeLayer(rulerTempLineRef.current);
        rulerTempLineRef.current = null;
      }
      if (rulerTooltipRef.current) {
        map.removeLayer(rulerTooltipRef.current);
        rulerTooltipRef.current = null;
      }
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const handleMapClick = (e) => {
      const clickPt = e.latlng;
      if (!rulerStartRef.current) {
        // First click
        rulerStartRef.current = clickPt;
        rulerTempLineRef.current = L.polyline([clickPt, clickPt], {
          color: '#fa5252',
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.95
        }).addTo(map);

        rulerTooltipRef.current = L.tooltip({
          permanent: true,
          direction: 'right',
          className: 'guide-measure-tip'
        }).setLatLng(clickPt).setContent('Move to end point...').addTo(map);
      } else {
        // Second click -> finish
        const endPt = clickPt;
        if (rulerTempLineRef.current) map.removeLayer(rulerTempLineRef.current);
        if (rulerTooltipRef.current) map.removeLayer(rulerTooltipRef.current);

        const finalLine = L.polyline([rulerStartRef.current, endPt], {
          color: '#fa5252',
          weight: 3.5,
          dashArray: '6, 6',
          opacity: 0.95
        });

        setupGuideLine(finalLine);
        refLinesGroupRef.current?.addLayer(finalLine);
        notifyRefLinesChange();
        rulerStartRef.current = null;
        onRulerFinish();
      }
    };

    const handleMouseMove = (e) => {
      if (rulerStartRef.current && rulerTempLineRef.current) {
        rulerTempLineRef.current.setLatLngs([rulerStartRef.current, e.latlng]);
        const distM = map.distance(rulerStartRef.current, e.latlng);
        const distFt = (distM * 3.28084).toFixed(1);
        rulerTooltipRef.current?.setLatLng(e.latlng).setContent(`${distFt} ft (${distM.toFixed(1)}m)`);
      }
    };

    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [isRulerActive, onRulerFinish]);

  // 9. Freehand sketch tool
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isFreehandActive) {
      isMouseDownRef.current = false;
      map.dragging.enable();
      if (freehandTempLineRef.current) {
        map.removeLayer(freehandTempLineRef.current);
        freehandTempLineRef.current = null;
      }
      freehandPointsRef.current = [];
      map.getContainer().style.cursor = '';
      return;
    }

    map.dragging.disable();
    map.getContainer().style.cursor = 'crosshair';

    const handleMouseDown = (e) => {
      isMouseDownRef.current = true;
      freehandPointsRef.current = [e.latlng];
      freehandTempLineRef.current = L.polyline([e.latlng], {
        color: '#fa5252',
        weight: 3.5,
        dashArray: '6, 6',
        opacity: 0.95
      }).addTo(map);
    };

    const handleMouseMove = (e) => {
      if (isMouseDownRef.current && freehandTempLineRef.current) {
        freehandPointsRef.current.push(e.latlng);
        freehandTempLineRef.current.setLatLngs(freehandPointsRef.current);
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;
      if (freehandTempLineRef.current && freehandPointsRef.current.length > 1) {
        const line = freehandTempLineRef.current;
        freehandTempLineRef.current = null;
        setupGuideLine(line);
        refLinesGroupRef.current?.addLayer(line);
        notifyRefLinesChange();
        onFreehandFinish();
      }
      freehandPointsRef.current = [];
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [isFreehandActive, onFreehandFinish]);

  return <div id="map" ref={mapContainerRef} style={{ width: '100vw', height: '100vh' }} />;
}
