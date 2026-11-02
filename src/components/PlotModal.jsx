import React, { useState, useEffect } from 'react';

export default function PlotModal({ isOpen, mode, initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    fid: '',
    owner_name: '',
    reg_doc_no: '',
    surveyor_notes: '',
    land_status: '',
    house_condition: '',
    nature_of_land: '',
    is_colony: false
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        fid: initialData.fid ?? '',
        owner_name: initialData.owner_name || '',
        reg_doc_no: initialData.reg_doc_no || '',
        surveyor_notes: initialData.surveyor_notes || '',
        land_status: initialData.land_status ?? '',
        house_condition: initialData.house_condition ?? '',
        nature_of_land: initialData.nature_of_land ?? '',
        is_colony: Boolean(initialData.is_colony)
      });
    } else if (isOpen && !initialData) {
      setFormData({
        fid: '',
        owner_name: '',
        reg_doc_no: '',
        surveyor_notes: '',
        land_status: '',
        house_condition: '',
        nature_of_land: '',
        is_colony: false
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const title = mode === 'edit'
    ? `Edit Plot [${initialData?.fid || ''}] Attributes`
    : 'New Plot Attributes';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Feature ID (fid):</label>
            <input
              type="text"
              value={formData.fid}
              onChange={(e) => setFormData({ ...formData, fid: e.target.value })}
              placeholder="e.g. 209 or custom ID"
              required
            />
          </div>

          <div className="form-group">
            <label>Registration Document / Year (reg_doc_no):</label>
            <input
              type="text"
              value={formData.reg_doc_no}
              onChange={(e) => setFormData({ ...formData, reg_doc_no: e.target.value })}
              placeholder="e.g. 879/2002"
            />
          </div>

          <div className="form-group">
            <label>Owner Name (owner_name):</label>
            <input
              type="text"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              placeholder="e.g. Titleholder Name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Surveyor Notes (surveyor_notes):</label>
            <textarea
              rows={3}
              value={formData.surveyor_notes}
              onChange={(e) => setFormData({ ...formData, surveyor_notes: e.target.value })}
              placeholder="e.g. Plot No, Door No, Extent, Boundaries (North, South, East, West)"
            />
          </div>

          <div className="form-group">
            <label>Land Status:</label>
            <select
              value={formData.land_status}
              onChange={(e) => setFormData({ ...formData, land_status: e.target.value })}
            >
              <option value="">-- Select Land Status --</option>
              <option value="House">House</option>
              <option value="Empty Plot">Empty Plot</option>
              <option value="Open Plot">Open Plot</option>
              <option value="Under Construction">Under Construction</option>
              <option value="Commercial">Commercial</option>
              <option value="Dilapidated">Dilapidated</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>House Condition:</label>
            <select
              value={formData.house_condition}
              onChange={(e) => setFormData({ ...formData, house_condition: e.target.value })}
            >
              <option value="">-- Select House Condition --</option>
              <option value="Good">Good</option>
              <option value="Excellent">Excellent</option>
              <option value="Fair">Fair</option>
              <option value="Dilapidated">Dilapidated</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nature of Land:</label>
            <input
              type="text"
              value={formData.nature_of_land}
              onChange={(e) => setFormData({ ...formData, nature_of_land: e.target.value })}
              placeholder="e.g. Registered or Unregistered"
            />
          </div>

          <div className="form-group">
            <label>Is Colony Plot (is_colony):</label>
            <select
              value={formData.is_colony ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_colony: e.target.value === 'true' })}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Save Plot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
