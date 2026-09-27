import { useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';

const bursts = [
  { at: [-0.64, 0.55], delay: 0, color: '#ff397c' },
  { at: [0.59, 0.58], delay: 0.12, color: '#ffd237' },
  { at: [-0.03, 0.78], delay: 0.24, color: '#9462ff' },
  { at: [-0.68, -0.04], delay: 0.18, color: '#26e8d2' },
  { at: [0.66, 0.06], delay: 0.3, color: '#ff863b' },
  { at: [-0.1, 0.12], delay: 0.38, color: '#68b9ff' },
  { at: [-0.54, -0.6], delay: 0.42, color: '#f967ff' },
  { at: [0.5, -0.55], delay: 0.5, color: '#baff66' },
  { at: [0.02, -0.8], delay: 0.6, color: '#ffde76' },
] as const;
const sparkCount = 88;

function FireworkBurst({ at, delay, color, elapsed, extent }: {
  at: readonly [number, number]; delay: number; color: string; elapsed: RefObject<number>; extent: RefObject<{ x: number; y: number }>;
}) {
  const group = useRef<Group>(null);
  const sparks = useRef<InstancedMesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const rocket = useRef<Mesh>(null);
  const trail = useRef<Mesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const directions = useMemo(() => Array.from({ length: sparkCount }, (_, i) => {
    const y = 1 - 2 * (i + 0.5) / sparkCount;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = Math.sqrt(1 - y * y);
    return new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }), []);
  useFrame(() => {
    group.current?.position.set(at[0] * extent.current.x, at[1] * extent.current.y, 0);
    const t = elapsed.current - delay;
    const launching = t >= 0 && t < 0.28;
    const height = -0.3 + 0.3 * Math.max(0, Math.min(1, t / 0.28));
    if (rocket.current) { rocket.current.visible = launching; rocket.current.position.set(0, height, 0); }
    if (trail.current) { trail.current.visible = launching; trail.current.position.set(0, height - 0.035, 0); }
    if (!sparks.current) return;
    const age = t - 0.28;
    sparks.current.visible = age >= 0 && age < 1.5;
    if (!sparks.current.visible) return;
    for (let i = 0; i < sparkCount; i++) {
      const expansion = 0.32 * (1 - Math.exp(-age * 2));
      dummy.position.copy(directions[i]).multiplyScalar(expansion);
      dummy.position.y -= age * age * 0.025;
      dummy.scale.setScalar(Math.max(0.4, 1 - age * 0.3));
      dummy.updateMatrix();
      sparks.current.setMatrixAt(i, dummy.matrix);
    }
    sparks.current.instanceMatrix.needsUpdate = true;
    if (material.current) material.current.opacity = Math.max(0, Math.min(1, (1.5 - age) / 0.55));
  });
  return <group ref={group}>
    <mesh ref={rocket} visible={false} renderOrder={100}><sphereGeometry args={[0.011, 8, 6]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} depthWrite={false} /></mesh>
    <mesh ref={trail} visible={false} renderOrder={100}><cylinderGeometry args={[0.002, 0.005, 0.07, 6]} /><meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} depthTest={false} depthWrite={false} /></mesh>
    <instancedMesh ref={sparks} args={[undefined, undefined, sparkCount]} visible={false} frustumCulled={false} renderOrder={100}>
      <sphereGeometry args={[0.009, 6, 4]} /><meshBasicMaterial ref={material} color={color} transparent toneMapped={false} depthTest={false} depthWrite={false} />
    </instancedMesh>
  </group>;
}

export function PenthouseFireworks({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const extent = useRef({ x: 0.5, y: 0.5 });
  const forward = useMemo(() => new Vector3(), []);
  const [active, setActive] = useState(!reduced);
  useFrame(({ camera, viewport }, delta) => {
    if (!active) return;
    // Fit the celebration to the 3D panel on both wide and narrow screens.
    const { width, height } = viewport.getCurrentViewport(camera);
    const unit = Math.min(width, height);
    extent.current.x = width / (2 * unit);
    extent.current.y = height / (2 * unit);
    if (group.current) {
      camera.getWorldDirection(forward);
      group.current.position.copy(camera.position).addScaledVector(forward, 18);
      group.current.quaternion.copy(camera.quaternion);
      group.current.scale.setScalar(unit);
    }
    elapsed.current += delta;
    if (reduced || elapsed.current >= 2.5) setActive(false);
  });
  if (!active || reduced) return null;
  return <group ref={group} name="penthouse-fireworks">{bursts.map((burst, i) => <FireworkBurst key={i} {...burst} elapsed={elapsed} extent={extent} />)}</group>;
}
