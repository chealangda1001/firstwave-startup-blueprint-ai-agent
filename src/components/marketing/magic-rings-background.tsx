"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// three.js is a large dependency for a decorative hero accent, so it's
// never part of the initial bundle: this wrapper only pulls it in on the
// client, after mount, and skips it entirely for anyone who prefers
// reduced motion or is on a narrow (likely lower-powered) viewport —
// those visitors get a cheap static glow instead via the CSS fallback
// below, so the hero never depends on WebGL to look intentional.
const MagicRings = dynamic(() => import("./magic-rings"), { ssr: false });

function StaticGlowFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full"
      style={{
        background:
          "radial-gradient(circle at center, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)",
      }}
    />
  );
}

// Subscribes to the two bits of external browser state that decide whether
// the WebGL animation is allowed to run at all (motion preference, and a
// narrow/likely-lower-powered viewport). useSyncExternalStore keeps this a
// real subscription — reduced-motion or a resize past the breakpoint flips
// the fallback on immediately — without reaching for setState-in-an-effect.
function subscribe(onChange: () => void) {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener("change", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    motionQuery.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

function getSnapshot() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const isNarrow = window.innerWidth < 640;
  return !reduceMotion && !isNarrow;
}

// SSR/hydration default: always the static fallback until the client has
// actually measured motion preference and viewport width.
function getServerSnapshot() {
  return false;
}

export function MagicRingsBackground() {
  const canAnimate = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (!canAnimate) return <StaticGlowFallback />;

  // Monochrome white-to-zinc glow (not the library's magenta/cyan default)
  // to match the rest of the app's black-and-white design language, and
  // toned down — fewer rings, no blur/noise/mouse tracking — since this is
  // ambient texture behind the headline, not the focal point.
  return (
    <MagicRings
      color="#ffffff"
      colorTwo="#71717a"
      ringCount={4}
      speed={0.6}
      attenuation={12}
      lineThickness={1.5}
      baseRadius={0.32}
      radiusStep={0.12}
      scaleRate={0.12}
      opacity={0.55}
      blur={0}
      noiseAmount={0.03}
      ringGap={1.4}
      followMouse={false}
      clickBurst={false}
    />
  );
}
