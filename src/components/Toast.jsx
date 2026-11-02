import React from 'react';

export default function Toast({ toast }) {
  if (!toast || !toast.message) return null;

  return (
    <div className={`toast-notification ${toast.visible ? 'show' : ''}`}>
      {toast.icon && <span className="toast-icon">{toast.icon}</span>}
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}
