import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

const IntroCampsite = lazy(() => import('./Town').then(module => ({ default: module.IntroCampsite })));
type Level = { level: 1 | 2 | 3; name: string; description: string };

export function OnboardingIntro({ name, onNameChange, levels, onChoose, reduced }: {
  name: string;
  onNameChange: (name: string) => void;
  levels: Level[];
  onChoose: (level: Level['level']) => void;
  reduced: boolean;
}) {
  const [expanded, setExpanded] = useState(!!name.trim());
  const [inputReady, setInputReady] = useState(reduced || !!name.trim());
  const input = useRef<HTMLInputElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const focusChoices = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setInputReady(true), reduced ? 0 : 650);
    return () => window.clearTimeout(timer);
  }, [reduced]);
  useEffect(() => { if (inputReady && !expanded) input.current?.focus({ preventScroll: true }); }, [inputReady, expanded]);
  useEffect(() => {
    if (expanded && focusChoices.current) {
      firstChoice.current?.focus({ preventScroll: true });
      focusChoices.current = false;
    }
  }, [expanded]);
  function revealExperience(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) { input.current?.focus(); return; }
    if (expanded) firstChoice.current?.focus();
    else { focusChoices.current = true; setExpanded(true); }
  }
  const duration = reduced ? 0 : .65;
  const ease = [.22, 1, .36, 1] as const;
  return <div className={`intro-layout ${expanded ? 'is-expanded' : 'is-name-only'}`}>
    <svg className="intro-chart-decoration" viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M-20 895 L30 850 50 863 75 820 98 834 124 784 145 799 170 815 200 771 222 793 248 759 270 774 295 860 319 885 351 842 378 855 410 802 440 782 470 732 500 753 524 830 549 846 580 802 610 816 642 766 670 745 705 675" />
      <path d="M550 325 L570 264 588 274 607 250 624 253 649 212 664 219 686 169 702 206 720 231 736 217 752 240 770 208 786 215 805 179 820 190 836 155 853 166 875 125 889 130 910 76" />
      <circle cx="686" cy="169" r="4" /><rect x="650" y="126" width="72" height="28" rx="8" /><text x="686" y="145" textAnchor="middle">+12.4%</text>
    </svg>
    <motion.form layout={reduced ? false : 'position'} className="intro-content" onSubmit={revealExperience} transition={{ layout: { duration, ease } }}>
      <div className="intro-name-block">
        <motion.h1 layout={reduced ? false : 'position'} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .55, ease, layout: { duration, ease } }}><label htmlFor="intro-name">What’s your name?</label></motion.h1>
        <motion.div layout={reduced ? false : 'position'} transition={{ duration, ease }} className="intro-input-space">
          {inputReady && <motion.div className="intro-input-shell" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .5, ease }}>
            <input ref={input} id="intro-name" className="intro-name-input" aria-label="Your name" autoComplete="nickname" required maxLength={32} value={name} onChange={event => onNameChange(event.target.value)} placeholder="Enter name" />
            <button type="submit" className="intro-next" aria-label="Continue with your name" disabled={!name.trim()}><ArrowRight size={28} /></button>
          </motion.div>}
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && <motion.section key="experience" className="intro-experience" aria-labelledby="intro-experience-title" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .5, delay: reduced ? 0 : .18, ease }}>
          <h2 id="intro-experience-title">How familiar are you with money?</h2>
          <div className="intro-levels" role="group" aria-label="Financial literacy level">
            {levels.map((option, index) => <button key={option.level} ref={index === 0 ? firstChoice : undefined} type="button" title={option.description} disabled={!name.trim()} onClick={() => onChoose(option.level)}>{option.name}</button>)}
          </div>
        </motion.section>}
      </AnimatePresence>
    </motion.form>
    {expanded && <motion.div className="intro-campsite" initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduced ? 0 : .75, delay: reduced ? 0 : .12, ease }}>
      <Suspense fallback={<img src="/images/onboarding-camp.png" alt="A tent on a green island with pine trees and a campfire" />}><IntroCampsite /></Suspense>
    </motion.div>}
  </div>;
}
