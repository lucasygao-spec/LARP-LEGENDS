import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { ExtrudeGeometry, Shape } from 'three';

// A small cream house with a slate gable roof, blue windows, and a planted yard.
export function UpgradedHome({ position, scale = 1.2, rotation = -0.5 }: { position: [number, number, number]; scale?: number; rotation?: number }) {
  const walls = useMemo(() => {
    const outline = new Shape();
    outline.moveTo(-1.9, 0); outline.lineTo(1.9, 0); outline.lineTo(1.9, 2.5);
    outline.lineTo(0, 3.65); outline.lineTo(-1.9, 2.5); outline.closePath();
    return new ExtrudeGeometry(outline, { depth: 2.8, bevelEnabled: false });
  }, []);
  const box = (key: string, at: [number, number, number], size: [number, number, number], color: string) => <mesh key={key} position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
  return <group position={position}>
    <group scale={scale} rotation={[0, rotation, 0]}>
      {box('foundation', [0, 0.04, 0], [6, 0.12, 5], '#c1ccce')}
      {box('lawn', [0, 0.12, 0], [5.65, 0.08, 4.65], '#65ad67')}
      <mesh geometry={walls} position={[0, 0.22, -1.4]} castShadow receiveShadow><meshStandardMaterial color="#eee5ca" roughness={0.95} /></mesh>
      {[-1, 1].map(side => <group key={side} position={[side * 1.05, 3.23, 0]} rotation={[0, 0, -side * 0.55]}>
        {box('roof', [0, 0, 0], [2.55, 0.22, 3.5], '#424c63')}
        {[-1.1, 0, 1.1].map(z => box(`seam-${z}`, [0, 0.13, z], [2.55, 0.045, 0.065], '#505b72'))}
      </group>)}
      {box('front-frame', [-0.65, 1.45, 1.44], [1.25, 1.15, 0.09], '#506174')}
      {box('front-glass', [-0.65, 1.45, 1.50], [1.02, 0.94, 0.025], '#6499c4')}
      {box('front-mullion', [-0.65, 1.45, 1.53], [0.055, 0.98, 0.035], '#455b72')}
      {box('door', [1, 1.04, 1.44], [0.63, 1.65, 0.1], '#42657d')}
      {box('door-glass', [1, 1.4, 1.5], [0.44, 0.6, 0.035], '#77a4c2')}
      {box('handle', [1.19, 0.88, 1.52], [0.05, 0.1, 0.06], '#c8c5b2')}
      {[-0.7, 0.7].map(z => <group key={z}>
        {box(`side-frame-${z}`, [1.94, 1.5, z], [0.08, 1.03, 0.65], '#506174')}
        {box(`side-glass-${z}`, [1.99, 1.5, z], [0.025, 0.84, 0.46], '#6499c4')}
      </group>)}
      {[0, 1, 2].map(step => box(`step-${step}`, [1, 0.17 + step * 0.07, 2.06 - step * 0.17], [0.96, 0.1, 0.48], '#9ba9ac'))}
      {[[-2.5, -1.7], [2.5, -1.7], [2.5, 1.5]].map(([x, z], i) => <group key={i} position={[x, 0.17, z]}>
        {box('trunk', [0, 0.6, 0], [0.18, 1.2, 0.18], '#806c49')}
        {box('leaves', [0, 1.55, 0], [0.7, 1.75, 0.7], '#45a873')}
        {box('crown', [-0.04, 2.18, -0.02], [0.63, 0.55, 0.64], '#58b983')}
      </group>)}
      {[-1.9, -1.25, -0.6].map(x => box(`hedge-${x}`, [x, 0.4, 2.05], [0.65, 0.55, 0.6], '#4da66b'))}
    </group>
    <Html position={[0, scale * 4.6, 0]} center style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 17px', borderRadius: 12, border: '1px solid #6793a5', background: '#193746ed', color: '#f4fbff', boxShadow: '0 3px 12px #102a3740', fontSize: 19, fontWeight: 700 }}>
        <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 1 11h3v10h6v-7h4v7h6V11h3Z" /></svg>Home
      </div>
    </Html>
  </group>;
}
