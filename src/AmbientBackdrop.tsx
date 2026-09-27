/** Decorative light only: kept behind the interface and out of the tab order. */
export function AmbientBackdrop({ reduced, sky = false }: { reduced: boolean; sky?: boolean }) {
  return <div className={`ambient-backdrop${sky ? ' ambient-sky' : ''}`} aria-hidden="true" data-still={reduced}>
    <div className="ambient-glow ambient-glow-top" />
    <div className="ambient-glow ambient-glow-bottom" />
    {!sky && <div className="ambient-grid" />}
  </div>;
}
