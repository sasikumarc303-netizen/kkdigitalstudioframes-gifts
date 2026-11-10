import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { optimizeImage } from '../services/format.js';
import { useLockBody } from '../hooks/useMedia.js';

/** Full-screen gallery viewer: keyboard (←/→/Esc), swipe, click-to-zoom with pan, captions and neighbour preloading. */
export default function Lightbox({ items, index, onClose, onIndex }) {
  const open = index !== null && index >= 0;
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const startX = useRef(null);
  const closeRef = useRef(null);
  const total = items?.length || 0;
  useLockBody(open);

  const go = useCallback((dir) => {
    setZoom(false);
    onIndex((i) => (i + dir + total) % total);
  }, [total, onIndex]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, onClose]);

  useEffect(() => {
    if (!open || !total) return;
    [1, -1].forEach((d) => {
      const n = items[(index + d + total) % total];
      if (n) new Image().src = optimizeImage(n.image, 1600);
    });
  }, [open, index, items, total]);

  const current = open ? items[index] : null;

  const onPointerDown = (e) => { startX.current = e.clientX; };
  const onPointerUp = (e) => {
    if (startX.current === null || zoom) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  };
  const toggleZoom = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
    setZoom((z) => !z);
  };
  const onMove = (e) => {
    if (!zoom) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="lightbox__bar">
            <span className="lightbox__count">{index + 1} / {total}</span>
            <div className="lightbox__tools">
              <button type="button" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'Zoom out' : 'Zoom in'}><Icon name="zoom" /></button>
              <button type="button" ref={closeRef} onClick={onClose} aria-label="Close viewer"><Icon name="close" /></button>
            </div>
          </div>

          <div className="lightbox__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            {total > 1 && <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Previous photo"><Icon name="chevronLeft" size={28} /></button>}
            <AnimatePresence mode="wait">
              <motion.img
                key={current.id || current.image}
                src={optimizeImage(current.image, 1800)}
                alt={current.title || current.caption || 'Photograph'}
                className={`lightbox__img ${zoom ? 'is-zoomed' : ''}`}
                style={{ transformOrigin: origin }}
                onClick={toggleZoom}
                onMouseMove={onMove}
                draggable={false}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </AnimatePresence>
            {total > 1 && <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Next photo"><Icon name="chevronRight" size={28} /></button>}
          </div>

          {(current.title || current.caption) && (
            <div className="lightbox__caption">
              {current.title && <strong>{current.title}</strong>}
              {current.caption && <p>{current.caption}</p>}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
