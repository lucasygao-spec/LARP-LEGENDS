import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

export function CampDog({ position, reduced }: { position: [number, number, number]; reduced: boolean }) {
  const body = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const head = useRef<Group>(null);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (body.current) body.current.position.y = reduced ? 0 : Math.sin(time * 2) * 0.018;
    if (tail.current) tail.current.rotation.z = reduced ? 0 : Math.sin(time * 7) * 0.45;
    if (head.current) head.current.rotation.z = reduced ? 0 : Math.sin(time * 0.8) * 0.045;
  });
  const box = (key: string, at: [number, number, number], size: [number, number, number], color: string) => <mesh key={key} position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={1} /></mesh>;
  return <group position={position} rotation={[0, -0.4, 0]} scale={1.15} name="camp-dog">
    <group ref={body}>
      {box('body', [0, 0.79, -0.12], [0.9, 0.72, 1.3], '#bf8a4b')}
      {box('chest', [0, 0.82, 0.49], [0.66, 0.69, 0.16], '#fff0d6')}
      {[-0.31, 0.31].flatMap(x => [-0.55, 0.38].map(z => <group key={`${x}-${z}`}>
        {box('leg', [x, 0.3, z], [0.25, 0.5, 0.29], '#b78043')}
        {box('paw', [x, 0.12, z + 0.07], [0.29, 0.23, 0.39], '#fff0d6')}
      </group>))}
      {box('collar', [0, 1.04, 0.45], [0.88, 0.15, 0.56], '#159b9e')}
      {box('tag', [0, 0.96, 0.75], [0.14, 0.18, 0.07], '#f7ce66')}
      <group ref={head} position={[0, 1.4, 0.55]}>
        {box('head', [0, 0, 0], [1.0, 0.82, 0.77], '#ce9a59')}
        {box('blaze', [0, 0.08, 0.397], [0.23, 0.61, 0.03], '#fff0d6')}
        {box('muzzle', [0, -0.18, 0.48], [0.58, 0.34, 0.36], '#fff0d6')}
        {box('nose', [0, -0.09, 0.67], [0.23, 0.16, 0.13], '#302d2a')}
        {box('tongue', [0.08, -0.36, 0.58], [0.14, 0.15, 0.06], '#de827d')}
        {[-1, 1].map(side => <group key={side}>
          {box('eye', [side * 0.29, 0.07, 0.405], [0.12, 0.16, 0.035], '#282925')}
          {box('glint', [side * 0.29 - 0.02, 0.11, 0.43], [0.035, 0.035, 0.02], '#ffffff')}
          <mesh position={[side * 0.37, 0.52, -0.03]} rotation={[0, Math.PI / 4, side * -0.2]} castShadow>
            <coneGeometry args={[0.3, 0.66, 4]} /><meshStandardMaterial color="#976233" roughness={1} />
          </mesh>
        </group>)}
      </group>
      <group ref={tail} position={[0, 0.95, -0.78]}>
        <group rotation={[-0.65, 0, 0]}>
          {box('tail', [0, 0.35, 0], [0.22, 0.7, 0.24], '#bf8a4b')}
          {box('tip', [0, 0.7, 0], [0.24, 0.22, 0.26], '#fff0d6')}
        </group>
      </group>
    </group>
  </group>;
}
