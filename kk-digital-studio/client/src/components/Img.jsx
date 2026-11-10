import { useState } from 'react';
import Icon from './Icon.jsx';
import { optimizeImage } from '../services/format.js';

/**
 * Responsive image with graceful fallback.
 * - lazy loads by default; pass `priority` for above-the-fold images
 * - when there is no source (or it fails to load) a tasteful tonal placeholder is shown instead of a broken image
 * - `ratio` reserves space to avoid layout shift, e.g. ratio="4/5"
 */
export default function Img({ src, alt = '', ratio, width, sizes, priority = false, icon = 'camera', label, className = '', imgClassName = '', onClick, ...rest }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const style = ratio ? { aspectRatio: ratio } : undefined;
  const showPlaceholder = !src || failed;
  const url = optimizeImage(src, width);
  const isCloud = url !== src;
  const srcSet = isCloud && width ? [0.5, 1, 1.5, 2].map((m) => `${optimizeImage(src, Math.round(width * m))} ${Math.round(width * m)}w`).join(', ') : undefined;

  return (
    <div className={`img ${loaded || showPlaceholder ? 'is-ready' : ''} ${className}`} style={style} onClick={onClick} {...rest}>
      {showPlaceholder ? (
        <div className="img__placeholder" role={alt ? 'img' : undefined} aria-label={alt || undefined}>
          <Icon name={icon} size={34} stroke={1.2} />
          {label && <span>{label}</span>}
        </div>
      ) : (
        <img
          className={imgClassName}
          src={url}
          srcSet={srcSet}
          sizes={srcSet ? sizes || '(max-width: 767px) 100vw, 50vw' : undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
