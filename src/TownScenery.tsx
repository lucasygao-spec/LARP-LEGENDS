import { RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, Color } from 'three';

type Walkway = { from: [number, number]; to: [number, number]; width: number };

// The reference campsite is an open clearing; movement stays on the island.
export function isOnCampGround(x: number, z: number): boolean {
  return (x / 8.1) ** 2 + (z / 6.6) ** 2 <= 1;
}

export function CampIsland({ height }: { height: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sides = 14;
    const triangle = (a: number[], b: number[], c: number[], tint: string) => {
      positions.push(...a, ...b, ...c);
      const color = new Color(tint);
      for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
    };
    const rim = (i: number, bottom = false) => {
      const angle = Math.PI / 2 + i * Math.PI * 2 / sides;
      const radius = bottom ? 0.83 : 1;
      return [Math.cos(angle) * 9 * radius, bottom ? height - 3.4 - (i % 3) * 0.2 : height, Math.sin(angle) * 7.3 * radius];
    };
    const dirt = ['#72503a', '#60412e', '#805b40', '#68472f'];
    for (let i = 0; i < sides; i++) {
      const a = rim(i), b = rim((i + 1) % sides);
      const c = rim(i, true), d = rim((i + 1) % sides, true);
      triangle([0, height, 0], b, a, '#65b84c');
      triangle(a, b, c, dirt[i % dirt.length]);
      triangle(b, d, c, dirt[(i + 1) % dirt.length]);
      triangle([0, height - 3.7, 0], c, d, '#60412e');
    }
    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(positions, 3));
    result.setAttribute('color', new Float32BufferAttribute(colors, 3));
    result.computeVertexNormals();
    return result;
  }, [height]);
  return <mesh geometry={geometry} receiveShadow castShadow><meshStandardMaterial vertexColors flatShading roughness={1} /></mesh>;
}

const cityRoads: Walkway[] = [
  { from: [-7.5, -5], to: [7.5, -5], width: 1.15 },
  { from: [-7.5, 5], to: [7.5, 5], width: 1.15 },
  { from: [-6.2, -6.35], to: [-6.2, 6.35], width: 1.15 },
  { from: [6.2, -6.35], to: [6.2, 6.35], width: 1.15 },
  { from: [-2.3, -5], to: [-2.3, -2.3], width: 0.8 },
  { from: [-2.3, 2.3], to: [-2.3, 5], width: 0.8 },
  { from: [2.3, -5], to: [2.3, -2.3], width: 0.8 },
  { from: [2.3, 2.3], to: [2.3, 5], width: 0.8 },
  { from: [-2.3, -2.3], to: [2.3, -2.3], width: 0.8 },
  { from: [-2.3, 2.3], to: [2.3, 2.3], width: 0.8 },
];

export function isOnCityWalkway(x: number, z: number): boolean {
  return cityRoads.some(({ from, to, width }) => {
    if (Math.abs(from[1] - to[1]) < 0.001) {
      return Math.abs(z - from[1]) <= width / 2
        && x >= Math.min(from[0], to[0]) - width / 2
        && x <= Math.max(from[0], to[0]) + width / 2;
    }
    return Math.abs(x - from[0]) <= width / 2
      && z >= Math.min(from[1], to[1]) - width / 2
      && z <= Math.max(from[1], to[1]) + width / 2;
  });
}

export function CityStreets({ height }: { height: number }) {
  return <group>
    <RoundedBox args={[17.6, 0.42, 14.8]} radius={0.22} smoothness={3} position={[0, height - 0.22, 0]} receiveShadow castShadow>
      <meshStandardMaterial color="#47a958" roughness={1} />
    </RoundedBox>
    {cityRoads.map(({ from, to, width }, index) => {
      const horizontal = Math.abs(from[1] - to[1]) < 0.001;
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const x = (from[0] + to[0]) / 2;
      const z = (from[1] + to[1]) / 2;
      return <group key={index}>
        <RoundedBox args={horizontal ? [length, 0.045, width] : [width, 0.045, length]} radius={0.08} smoothness={2}
          position={[x, height + 0.025, z]} receiveShadow>
          <meshStandardMaterial color="#596777" roughness={0.95} />
        </RoundedBox>
        {index < 4 && Array.from({ length: Math.ceil(length / 0.9) }, (_, dash) => {
          const offset = -length / 2 + 0.45 + dash * 0.9;
          if (offset > length / 2 - 0.3) return null;
          return <mesh key={dash} position={horizontal ? [x + offset, height + 0.052, z] : [x, height + 0.052, z + offset]}>
            <boxGeometry args={horizontal ? [0.42, 0.016, 0.055] : [0.055, 0.016, 0.42]} /><meshBasicMaterial color="#f5e7a9" />
          </mesh>;
        })}
      </group>;
    })}
  </group>;
}
