import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CtaButton } from './Buttons.jsx';
import Icon from './Icon.jsx';
import { useMediaQuery } from '../hooks/useMedia.js';

/**
 * Cinematic hero using the supplied camera commercial.
 * - Desktop/tablet: full-viewport video with an overlay and text over the footage.
 * - Phones: the full 16:9 frame is shown uncropped on top (so the camera is never cut off) with the headline in a panel below.
 * - Reduced-motion visitors get the poster image only; everyone gets a pause/play control.
 */
export default function HeroVideo({ hero, ctas }) {
  const reduce = useReducedMotion();
  const mobile = useMediaQuery('(max-width: 767px)');
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);

  const src = mobile ? hero.videoMobile || hero.video : hero.video;
  const poster = mobile ? hero.posterMobile || hero.poster : hero.poster;
  const showVideo = Boolean(src) && !reduce;

  useEffect(() => {
    setReady(false);
    setPlaying(true);
  }, [src]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const fade = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] } });

  return (
    <section className="hero" aria-label="Welcome">
      <div className={`hero__media ${ready ? 'is-ready' : ''}`}>
        {poster && <img className="hero__poster" src={poster} alt="" />}
        {showVideo && (
          <video
            key={src}
            ref={videoRef}
            className="hero__video"
            src={src}
            poster={poster || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            onPlaying={() => setReady(true)}
          />
        )}
        <div className="hero__veil" />
      </div>

      <div className="hero__content container">
        {hero.eyebrow && <motion.p className="hero__eyebrow" {...fade(0.1)}>{hero.eyebrow}</motion.p>}
        <motion.h1 className="hero__title" {...fade(0.25)}>{hero.heading}</motion.h1>
        <motion.p className="hero__sub" {...fade(0.4)}>{hero.subheading}</motion.p>
        <motion.div className="hero__ctas" {...fade(0.55)}>
          {ctas.map((cta, i) => <CtaButton key={i} cta={cta} onDark size="lg" />)}
        </motion.div>
      </div>

      {showVideo && (
        <button type="button" className="hero__toggle" onClick={toggle} aria-label={playing ? 'Pause background video' : 'Play background video'}>
          <Icon name={playing ? 'pause' : 'play'} size={16} />
        </button>
      )}
    </section>
  );
}
