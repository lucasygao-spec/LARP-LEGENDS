import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

const clouds = [
  { position: [-6.5, 6.2, -5.4], size: 0.95, phase: 0 },
  { position: [6.1, 6.5, -5.1], size: 1.1, phase: 2 },
] as const;
const puffs = [
  { position: [-0.95, 0, 0], scale: [0.8, 0.55, 0.6] },
  { position: [-0.25, 0.35, 0], scale: [0.85, 0.9, 0.75] },
  { position: [0.55, 0.12, 0.05], scale: [0.9, 0.65, 0.7] },
  { position: [1.2, -0.05, 0.05], scale: [0.6, 0.4, 0.5] },
] as const;

export function SkyClouds({ reduced, city }: { reduced: boolean; city: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const time = reduced ? 0 : clock.elapsedTime;
    group.current?.children.forEach((cloud, index) => {
      const { position, phase } = clouds[index];
      cloud.position.x = position[0] + Math.sin(time * 0.08 + phase) * 0.8;
      cloud.position.y = position[1] + Math.sin(time * 0.22 + phase) * 0.12;
    });
  });
  return <group ref={group} rotation={[0, city ? Math.atan2(13, 17) : 0, 0]} name="floating-sky-clouds">
    {clouds.map((cloud, index) => <group key={index} position={[...cloud.position]} scale={cloud.size}>
      {puffs.map((puff, puffIndex) => <mesh key={puffIndex} position={[...puff.position]} scale={[...puff.scale]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" emissive="#dceff6" emissiveIntensity={0.16} roughness={1} flatShading />
      </mesh>)}
    </group>)}
  </group>;
}
