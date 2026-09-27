import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { RotateCcw } from 'lucide-react';

export type RevealOrigin = { x: number; y: number; trigger: HTMLButtonElement };
// Wait for a second click before resetting the story and moving the button.
const DOUBLE_CLICK_WINDOW = 550;

export function ReplayButton({ disabled, onReplay, onDemoEnding }: {
  disabled: boolean; onReplay: () => void; onDemoEnding: (origin: RevealOrigin) => void;
}) {
  const pending = useRef<number | null>(null);
  function cancelReplay() {
    if (pending.current !== null) window.clearTimeout(pending.current);
    pending.current = null;
  }
  useEffect(() => cancelReplay, []);
  useEffect(() => { if (disabled) cancelReplay(); }, [disabled]);

  function showDemoEnding(button: HTMLButtonElement) {
    cancelReplay();
    const bounds = button.getBoundingClientRect();
    onDemoEnding({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, trigger: button });
  }
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Keyboard and assistive-technology activation stays immediate.
    if (event.detail === 0) { cancelReplay(); onReplay(); return; }
    if (pending.current !== null) { showDemoEnding(event.currentTarget); return; }
    pending.current = window.setTimeout(() => {
      pending.current = null;
      onReplay();
    }, DOUBLE_CLICK_WINDOW);
  }

  return <button className="replay-button" aria-label="Replay"
    title="Replay. Double-click or press Shift+Enter for the demo ending."
    aria-keyshortcuts="Shift+Enter" disabled={disabled} onClick={handleClick}
    onKeyDown={event => {
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        showDemoEnding(event.currentTarget);
      }
    }}>
    <RotateCcw />Replay
  </button>;
}
