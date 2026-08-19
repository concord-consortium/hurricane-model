import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { ImageOverlay } from "react-leaflet";
import { LatLngBoundsExpression } from "leaflet";
import css from "./crossfade-image-overlay.scss";

interface IProps {
  url: string;
  opacity: number;
  bounds: LatLngBoundsExpression;
}

interface ISlot {
  url: string | null;
  op: number;
}

// How long to wait for the incoming image's `load` before promoting anyway (cached images may not
// re-fire `load` after the src is set). Kept shorter than the CSS fade so the cross-fade still reads.
const LOAD_FALLBACK_MS = 90;

// A drop-in replacement for react-leaflet's ImageOverlay that CROSS-FADES when `url` changes, rather
// than hard-swapping the underlying <img> src. Two overlays ping-pong: the incoming image loads into
// the hidden slot at opacity 0, then fades in as the visible one fades out (transition in .layer).
export function CrossfadeImageOverlay({ url, opacity, bounds }: IProps) {
  const [a, setA] = useState<ISlot>({ url, op: opacity });
  const [b, setB] = useState<ISlot>({ url: null, op: 0 });
  const visible = useRef<"a" | "b">("a");
  const loading = useRef<"a" | "b" | null>(null);
  // Latest opacity, so async load handlers fade in to the current target, not a stale one.
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;

  // Fade the just-loaded hidden slot in and the old visible slot out.
  const promote = (slot: "a" | "b") => {
    if (loading.current !== slot) return;
    loading.current = null;
    visible.current = slot;
    const op = opacityRef.current;
    if (slot === "a") { setA(s => ({ ...s, op })); setB(s => ({ ...s, op: 0 })); }
    else { setB(s => ({ ...s, op })); setA(s => ({ ...s, op: 0 })); }
  };

  useEffect(() => {
    const curUrl = visible.current === "a" ? a.url : b.url;
    if (url === curUrl) {
      // Same image — just retarget the visible slot's opacity (e.g. the opacity slider changed).
      if (visible.current === "a") setA(s => ({ ...s, op: opacity }));
      else setB(s => ({ ...s, op: opacity }));
      return;
    }
    // Load the incoming image into the hidden slot at opacity 0, then cross-fade once it's ready.
    const hidden = visible.current === "a" ? "b" : "a";
    loading.current = hidden;
    if (hidden === "a") setA({ url, op: 0 });
    else setB({ url, op: 0 });
    const t = window.setTimeout(() => promote(hidden), LOAD_FALLBACK_MS);
    return () => window.clearTimeout(t);
    // a.url/b.url are read via refs-of-intent; re-running only on url/opacity is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, opacity]);

  return (
    <React.Fragment>
      {a.url && (
        <ImageOverlay url={a.url} bounds={bounds} opacity={a.op} className={css.layer}
          eventHandlers={{ load: () => promote("a") }} />
      )}
      {b.url && (
        <ImageOverlay url={b.url} bounds={bounds} opacity={b.op} className={css.layer}
          eventHandlers={{ load: () => promote("b") }} />
      )}
    </React.Fragment>
  );
}
