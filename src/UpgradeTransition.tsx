import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshBasicMaterial } from 'three';

// The same shrink, glow, and overshoot animation for both home upgrades.
export function UpgradeTransition({ upgraded, reduced, position = [0, 0, 0], glowHeight = 0.04, name, children, onSwap }: {
  upgraded: boolean; reduced: boolean; position?: [number, number, number]; glowHeight?: number; name: string;
  children: (upgraded: boolean, transforming: boolean) => ReactNode; onSwap?: (upgraded: boolean) => void;
}) {
  const onSwapRef = useRef(onSwap);
  onSwapRef.current = onSwap;
  const content = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const glowMaterial = useRef<MeshBasicMaterial>(null);
  const previous = useRef(upgraded);
  const elapsed = useRef(1);
  const swapped = useRef(upgraded);
  const [showUpgrade, setShowUpgrade] = useState(upgraded);
  const [transforming, setTransforming] = useState(false);
  useEffect(() => {
    const animate = upgraded && !previous.current && !reduced;
    previous.current = upgraded;
    elapsed.current = animate ? 0 : 1;
    swapped.current = animate ? false : upgraded;
    setShowUpgrade(animate ? false : upgraded);
    setTransforming(animate);
    if (!animate) onSwapRef.current?.(upgraded);
    if (content.current) content.current.scale.setScalar(1);
    if (glow.current) glow.current.visible = animate;
  }, [upgraded, reduced]);
  useFrame((_, delta) => {
    if (elapsed.current >= 1 || !content.current) return;
    elapsed.current = Math.min(1, elapsed.current + delta / 0.95);
    const t = elapsed.current;
    if (t < 0.3) {
      const shrink = 1 - t / 0.3;
      content.current.scale.setScalar(Math.max(0.001, shrink * shrink));
    } else {
      if (!swapped.current) { swapped.current = true; setShowUpgrade(true); onSwapRef.current?.(true); }
      const grow = (t - 0.3) / 0.7;
      // A small overshoot makes the new home settle into place.
      const scale = 1 + 2.1 * (grow - 1) ** 3 + 1.1 * (grow - 1) ** 2;
      content.current.scale.setScalar(Math.max(0.001, scale));
    }
    if (glow.current) {
      glow.current.scale.setScalar(1 + t * 5);
      glow.current.visible = t < 1;
    }
    if (glowMaterial.current) glowMaterial.current.opacity = Math.sin(t * Math.PI) * 0.65;
    if (t === 1) { content.current.scale.setScalar(1); setTransforming(false); }
  });
  return <group position={position} name={name}>
    <group ref={content}>
      {children(showUpgrade, transforming)}
    </group>
    <mesh ref={glow} visible={false} position={[0, glowHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.88, 1, 48]} /><meshBasicMaterial ref={glowMaterial} color="#b7f3ce" transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>;
}
