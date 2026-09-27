import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { RevealOrigin } from './ReplayButton';

const expandedTitle = 'Life and Risk Playground';
const words = ['Life', 'and', 'Risk', 'Playground'];
const initials = ['L', 'a', 'r', 'p'];

export function DemoEnding({ origin, reduced, onClose }: {
  origin: RevealOrigin; reduced: boolean; onClose: () => void;
}) {
  const screen = useRef<HTMLElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(reduced);
  useEffect(() => {
    if (reduced) { setExpanded(true); return; }
    const timer = window.setTimeout(() => setExpanded(true), 2120);
    return () => window.clearTimeout(timer);
  }, [reduced]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    screen.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => origin.trigger.focus({ preventScroll: true }));
    };
  }, [origin]);

  return <section ref={screen} role="dialog" aria-modal="true"
    aria-labelledby="larp-ending-title" tabIndex={-1}
    className={'larp-ending' + (reduced ? ' larp-ending-reduced' : '') + (expanded ? ' larp-expanded' : '')}
    style={{ '--reveal-x': origin.x + 'px', '--reveal-y': origin.y + 'px' } as CSSProperties}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') { event.preventDefault(); exitButton.current?.focus(); }
    }}>
    <div className="larp-wash" aria-hidden="true" />
    <div className="larp-content">
      <h1 id="larp-ending-title" aria-label={expanded ? expandedTitle : "That's Larp"}>
        <span className="larp-heading-line" aria-hidden="true">
          <span className="larp-intro"><span>
            {Array.from("That's ").map((letter, index) => <span key={index} className="larp-letter"
              style={{ '--letter-delay': (0.48 + index * 0.08) + 's' } as CSSProperties}>
              {letter === ' ' ? '\u00a0' : letter}
            </span>)}
          </span></span>
          <span className="larp-acronym">
            {words.map((word, index) => <span key={word} className="larp-word">
              <span className="larp-letter" style={{ '--letter-delay': (0.96 + index * 0.08) + 's' } as CSSProperties}>
                {expanded ? word[0] : initials[index]}
              </span>
              <span className="larp-tail" style={{ '--expand-delay': (index * 0.072) + 's' } as CSSProperties}>
                <span>{word.slice(1)}{index < words.length - 1 ? ' ' : ''}</span>
              </span>
            </span>)}
          </span>
        </span>
      </h1>
      <div className="larp-line" aria-hidden="true" />
    </div>
    <button ref={exitButton} className="larp-exit" aria-label="Back to game" onClick={onClose} />
  </section>;
}
