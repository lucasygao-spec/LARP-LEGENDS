import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Line, useAnimations, useGLTF } from '@react-three/drei';
import { Box3, Group, MathUtils, Mesh, MeshStandardMaterial, Plane, SkinnedMesh, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Effect, GameState, Sector } from './engine';
import { goalProgress, homeUpgradeUnlocked, money, portfolio, townSectors, totalDebt } from './engine';
import { CampIsland, CityStreets, isOnCampGround, isOnCityWalkway } from './TownScenery';

import { UpgradedHome } from './UpgradedHome';
import { CampDog } from './CampDog';
import { SkyClouds } from './SkyClouds';
import { UpgradeTransition } from './UpgradeTransition';
import { usePenthouseIsland } from './PenthouseIsland';
import { PenthouseFireworks } from './PenthouseFireworks';

type Point = [number, number, number];
const campGround = 1.53;
const tentSize = 11;
const spots: Record<string, Point> = { home: [0, campGround, 0.4], bank: [-3, campGround, 3.8], technology: [-5.3, campGround, -2.8], energy: [5.3, campGround, -2.8], retail: [7, campGround, 2.5], goal: [-0.8, campGround, 5], player: [-3.2, campGround, 3.6], debt: [-7, campGround, 0] };
const pathStep = 0.35;
const pathMinX = -8;
const pathMinZ = -6.5;
const pathColumns = Math.floor(16 / pathStep) + 1;
const pathRows = Math.floor(13 / pathStep) + 1;
const avatarHeadingOffset = 0.5;
const CITY_UNLOCK_KEY = 'investly.city-unlocked.v1';
const campProps: { name: string; position: [number, number]; size: number; rotation?: number; radius: number }[] = [
  { name: 'tree', position: [-3, -5.7], size: 4.4, radius: 0.7 },
  { name: 'tree', position: [3, -5.7], size: 4.4, radius: 0.7 },
  { name: 'tree', position: [-7, 2.5], size: 3.6, radius: 0.65 },
  { name: 'rock', position: [-5.7, -0.8], size: 1.5, radius: 0.7 },
  { name: 'rock', position: [5.7, -0.8], size: 1.5, radius: 0.7 },
  { name: 'rock', position: [6, 4.6], size: 1.4, radius: 0.65 },
  { name: 'log', position: [3.6, 5.4], size: 2, rotation: -0.35, radius: 0.65 },
  { name: 'log-axe', position: [-4.3, 4.5], size: 1.5, rotation: -0.4, radius: 0.65 },
];
const cityBuildings: { name: string; position: [number, number]; size: number; radius: number }[] = [
  { name: 'city-apartments', position: [-4.5, -3.4], size: 2.8, radius: 1.5 },
  { name: 'city-office', position: [0, -3.45], size: 2.4, radius: 1.2 },
  { name: 'city-shops', position: [4.5, -3.4], size: 2.8, radius: 1.25 },
  { name: 'city-home', position: [-4.5, 0], size: 2.6, radius: 1.25 },
  { name: 'city-office', position: [4.5, 0], size: 2.8, radius: 1.15 },
  { name: 'city-shops', position: [-4.5, 3.4], size: 2.8, radius: 1.25 },
  { name: 'city-apartments', position: [0, 3.4], size: 2.5, radius: 1.35 },
  { name: 'city-home', position: [4.5, 3.4], size: 2.6, radius: 1.25 },
];
const cityObstacles: [number, number, number][] = [[0, 0, 1.55], [2.8, 5, 1.1], ...cityBuildings.map(({ position, radius }) => [position[0], position[1], radius] as [number, number, number])];
const walkObstacles: [number, number, number][] = [
  [spots.goal[0], spots.goal[2], 1.1],
  ...campProps.map(({ position, radius }) => [position[0], position[1], radius] as [number, number, number]),
  ...(['technology', 'energy', 'retail'] as const).map(sector => [spots[sector][0], spots[sector][2], 0.7] as [number, number, number]),
];
function gridPoint(index: number): Point {
  return [pathMinX + (index % pathColumns) * pathStep, spots.player[1], pathMinZ + Math.floor(index / pathColumns) * pathStep];
}
function gridIndex(point: Point): number {
  const x = Math.max(0, Math.min(pathColumns - 1, Math.round((point[0] - pathMinX) / pathStep)));
  const z = Math.max(0, Math.min(pathRows - 1, Math.round((point[2] - pathMinZ) / pathStep)));
  return z * pathColumns + x;
}
function cellIsBlocked(x: number, z: number): boolean {
  const px = pathMinX + x * pathStep;
  const pz = pathMinZ + z * pathStep;
  return (Math.abs(px - spots.home[0]) < 4.8 && Math.abs(pz - spots.home[2]) < 2.5) || walkObstacles.some(([ox, oz, radius]) => (px - ox) ** 2 + (pz - oz) ** 2 < radius ** 2);
}
function cellIsWalkable(x: number, z: number, city = false): boolean {
  const px = pathMinX + x * pathStep;
  const pz = pathMinZ + z * pathStep;
  const blocked = city
    ? cityObstacles.some(([ox, oz, radius]) => (px - ox) ** 2 + (pz - oz) ** 2 < radius ** 2)
    : cellIsBlocked(x, z);
  return (city ? isOnCityWalkway(px, pz) : isOnCampGround(px, pz)) && !blocked;
}
function smoothWalkPath(route: Point[], city = false): Point[] {
  if (route.length < 3) return route;
  const segmentIsWalkable = (from: Point, to: Point) => {
    if (Math.abs(from[0] - to[0]) > 0.001 && Math.abs(from[2] - to[2]) > 0.001) return false;
    const distance = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const samples = Math.ceil(distance / (pathStep / 2));
    for (let i = 1; i < samples; i += 1) {
      const t = i / samples;
      const x = Math.round((from[0] + (to[0] - from[0]) * t - pathMinX) / pathStep);
      const z = Math.round((from[2] + (to[2] - from[2]) * t - pathMinZ) / pathStep);
      if (x < 0 || x >= pathColumns || z < 0 || z >= pathRows || !cellIsWalkable(x, z, city)) return false;
    }
    return true;
  };
  const smooth = [route[0]];
  let anchor = 0;
  while (anchor < route.length - 1) {
    let furthest = anchor + 1;
    for (let candidate = anchor + 2; candidate < route.length; candidate += 1) {
      if (!segmentIsWalkable(route[anchor], route[candidate])) break;
      furthest = candidate;
    }
    smooth.push(route[furthest]);
    anchor = furthest;
  }
  return smooth;
}
function dampAngle(current: number, target: number, smoothing: number, delta: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-smoothing * delta));
}
function findWalkPath(start: Point, target: Point, city = false): Point[] {
  const targetX = Math.max(pathMinX, Math.min(pathMinX + (pathColumns - 1) * pathStep, target[0]));
  const targetZ = Math.max(pathMinZ, Math.min(pathMinZ + (pathRows - 1) * pathStep, target[2]));
  const end = gridIndex([targetX, spots.player[1], targetZ]);
  const startIndex = gridIndex(start);
  const count = pathColumns * pathRows;
  const cameFrom = new Int32Array(count).fill(-1);
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  let destination = -1;

  // A click on a building is redirected to the closest open grid cell.
  const endX = end % pathColumns;
  const endZ = Math.floor(end / pathColumns);
  const candidates = Array.from({ length: count }, (_, i) => i)
    .filter(i => cellIsWalkable(i % pathColumns, Math.floor(i / pathColumns), city))
    .sort((a, b) => {
      const da = ((a % pathColumns) - endX) ** 2 + (Math.floor(a / pathColumns) - endZ) ** 2;
      const db = ((b % pathColumns) - endX) ** 2 + (Math.floor(b / pathColumns) - endZ) ** 2;
      return da - db;
    });
  const endCell = candidates[0];
  if (endCell === undefined) return [];

  queue[tail++] = startIndex;
  visited[startIndex] = 1;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  while (head < tail) {
    const current = queue[head++];
    if (current === endCell) { destination = current; break; }
    const x = current % pathColumns;
    const z = Math.floor(current / pathColumns);
    for (const [dx, dz] of directions) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nx >= pathColumns || nz < 0 || nz >= pathRows || !cellIsWalkable(nx, nz, city)) continue;
      const next = nz * pathColumns + nx;
      if (visited[next]) continue;
      visited[next] = 1;
      cameFrom[next] = current;
      queue[tail++] = next;
    }
  }
  if (destination < 0) return [];
  const route: Point[] = [];
  for (let cell = destination; cell !== startIndex; cell = cameFrom[cell]) route.push(gridPoint(cell));
  route.reverse();
  return smoothWalkPath(route, city);
}

function normalizedClone(scene: Group, size: number, tints?: Record<string, string>) {
  const copy = clone(scene);
  copy.updateMatrixWorld(true);
  copy.traverse(child => { if (child instanceof SkinnedMesh) child.computeBoundingBox(); });
  const box = new Box3().setFromObject(copy);
  const extent = box.getSize(new Vector3()); const center = box.getCenter(new Vector3());
  const scale = size / Math.max(extent.x, extent.y, extent.z);
  copy.scale.setScalar(scale); copy.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  copy.traverse(child => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (tints) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const recolored = materials.map(material => {
          const result = material.clone();
          if (result instanceof MeshStandardMaterial && tints[result.name]) result.color.set(tints[result.name]);
          return result;
        });
        child.material = Array.isArray(child.material) ? recolored : recolored[0];
      }
    }
  });
  return copy;
}
function Model({ name, size = 2, position = [0, 0, 0], rotation = 0, tints }: { name: string; size?: number; position?: Point; rotation?: number; tints?: Record<string, string> }) {
  const { scene } = useGLTF(`/models/${name}.glb`);
  const object = useMemo(() => normalizedClone(scene, size, tints), [scene, size, tints]);
  return <group position={position} rotation={[0, rotation, 0]}><primitive object={object} /></group>;
}
function AnimatedAvatar({ avatarId, size, walking }: { avatarId: string; size: number; walking: boolean }) {
  const root = useRef<Group>(null);
  const { scene, animations } = useGLTF(`/models/avatars/${avatarId}.glb`);
  const { actions, names } = useAnimations(animations, root);
  const object = useMemo(() => normalizedClone(scene, size), [scene, size]);
  useEffect(() => {
    const idleName = names.find(name => /idle/i.test(name)) ?? names.find(name => /grounded/i.test(name));
    const walkName = names.find(name => /walk/i.test(name));
    const incoming = actions[walking ? walkName ?? '' : idleName ?? ''];
    const outgoing = actions[walking ? idleName ?? '' : walkName ?? ''];
    incoming?.reset().fadeIn(0.2).play();
    outgoing?.fadeOut(0.2);
    return () => { incoming?.fadeOut(0.2); };
  }, [actions, names, walking]);
  return <group ref={root}><primitive object={object} /></group>;
}
function Shield({ amount, reduced }: { amount: number; reduced: boolean }) {
  const group = useRef<Group>(null); const target = amount ? 0.82 + Math.min(amount / 1500, 1) * 0.15 : 0;
  useFrame((_, delta) => { if (group.current) { const scale = reduced ? target : MathUtils.damp(group.current.scale.x, target, 5, delta); group.current.scale.set(scale, scale * 1.2, scale); } });
  return <group position={spots.home} scale={tentSize / 3.2}><group ref={group} scale={0}>
    <mesh position={[0, 0.02, 0]}><sphereGeometry args={[2.45, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#48ffd0" emissive="#05b79f" emissiveIntensity={0.5} transparent opacity={0.15} roughness={0.1} depthWrite={false} side={2} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, 0]}><ringGeometry args={[2.4, 2.46, 64]} /><meshBasicMaterial color="#bcfff1" transparent opacity={0.9} /></mesh>
    {[0,Math.PI/2].map(a=><mesh key={a} rotation={[0,a,0]}><torusGeometry args={[2.44,.017,6,60,Math.PI]} /><meshBasicMaterial color="#a3ffec" transparent opacity={0.7} /></mesh>)}
  </group></group>;
}
function CampGrowthTree({ sector, value, reduced }: { sector: Sector; value: number; reduced: boolean }) {
  const group = useRef<Group>(null);
  const target = 1 + Math.min(value / 1500, 1) * 0.25;
  useFrame((_, delta) => { if (group.current) group.current.scale.y = reduced ? target : MathUtils.damp(group.current.scale.y, target, 4, delta); });
  return <group ref={group} position={spots[sector]}><Model name="camp/tree" size={sector === 'retail' ? 3.6 : 2.8} /></group>;
}
function CampGrass() {
  const patches = [[-6, 3.5], [-5.3, 5.4], [-2.8, 5.6], [1.7, 5.1], [2, 6.5], [0.4, 6.8], [-5.5, -4.5], [5.5, -4.5], [-7, 0], [7, 0], [-4.4, -5.6], [4.4, -5.6], [-1.4, -6], [1.4, -6]];
  return <group>{patches.map(([x, z], index) => <group key={index} position={[x, campGround, z]} rotation={[0, index * 1.7, 0]}>
    {[-1, 0, 1].map(blade => <mesh key={blade} position={[blade * 0.13, 0.17, 0]} rotation={[0.1, blade, blade * -0.4]} castShadow>
      <coneGeometry args={[0.16, 0.5, 3]} /><meshStandardMaterial color={index % 2 ? '#519c3b' : '#65ad42'} roughness={1} />
    </mesh>)}
  </group>)}</group>;
}
function HomeTransformation({ upgraded, reduced }: { upgraded: boolean; reduced: boolean }) {
  return <UpgradeTransition upgraded={upgraded} reduced={reduced} position={spots.home} name="home-transformation">{(showHouse, transforming) =>
    showHouse ? <UpgradedHome position={[0, 0, 0]} showLabel={!transforming} /> : <group scale={[1, 0.9, 0.7]}><Model name="camp/tent" size={tentSize} /></group>
  }</UpgradeTransition>;
}
function PlayerCharacter({ reduced, avatarId, path, positionRef, city }: { reduced: boolean; avatarId: string; path: Point[]; positionRef: { current: Point }; city: boolean }) {
  const group = useRef<Group>(null);
  const avatar = useRef<Group>(null);
  const waypoint = useRef(0);
  const walkingRef = useRef(false);
  const faceTarget = useRef<number | null>(null);
  const [walking, setWalking] = useState(false);
  useEffect(() => { waypoint.current = 0; }, [path]);
  useEffect(() => {
    if (!group.current) return;
    const spawn: Point = city ? [0, spots.player[1], 5] : [...spots.player];
    group.current.position.set(...spawn);
    positionRef.current = spawn;
    faceTarget.current = null;
  }, [city, positionRef]);
  useFrame(({ clock }, delta) => {
    if (!group.current || !avatar.current) return;
    const next = path[waypoint.current];
    if (next) {
      if (!walkingRef.current) { walkingRef.current = true; setWalking(true); }
      faceTarget.current = null;
      const dx = next[0] - group.current.position.x;
      const dz = next[2] - group.current.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.06) {
        group.current.position.x = next[0];
        group.current.position.z = next[2];
        waypoint.current += 1;
      } else {
        const step = Math.min(distance, delta * 2.2);
        group.current.position.x += dx / distance * step;
        group.current.position.z += dz / distance * step;
        group.current.rotation.y = dampAngle(group.current.rotation.y, Math.atan2(dx, dz) - avatarHeadingOffset, 10, delta);
      }
    } else if (walkingRef.current) {
      walkingRef.current = false;
      setWalking(false);
      faceTarget.current = Math.atan2((city ? 13 : 0) - group.current.position.x, (city ? 17 : 22) - group.current.position.z) - avatarHeadingOffset;
    }
    if (!next && faceTarget.current !== null) {
      group.current.rotation.y = dampAngle(group.current.rotation.y, faceTarget.current, 10, delta);
      const difference = Math.atan2(Math.sin(faceTarget.current - group.current.rotation.y), Math.cos(faceTarget.current - group.current.rotation.y));
      if (Math.abs(difference) < 0.01) { group.current.rotation.y = faceTarget.current; faceTarget.current = null; }
    }
    group.current.position.y = spots.player[1];
    positionRef.current = [group.current.position.x, spots.player[1], group.current.position.z];
    avatar.current.position.y = !reduced ? Math.sin(clock.elapsedTime * 2) * 0.035 : 0;
  });
  return <group ref={group} position={positionRef.current}>{city && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}><ringGeometry args={[0.68, 0.76, 40]} /><meshBasicMaterial color="#fff4bd" /></mesh>}<group ref={avatar}><AnimatedAvatar avatarId={avatarId} size={3.5} walking={walking} /></group></group>;
}
function CoinTrail({ from, to, amount, red = false, reduced }: { from: Point; to: Point; amount: number; red?: boolean; reduced: boolean }) {
  const group = useRef<Group>(null); const start = useRef<number | null>(null);
  const count = Math.max(1, Math.min(12, Math.ceil(amount / 100)));
  useFrame(({ clock }) => {
    if (!group.current || reduced) return;
    start.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - start.current;
    group.current.visible = elapsed < 5;
    group.current.children.forEach((coin, i) => {
      const t = Math.max(0, Math.min(1, (elapsed - i * 0.1) / 1.7));
      coin.position.set(MathUtils.lerp(from[0], to[0], t), MathUtils.lerp(from[1] + 0.7, to[1] + 0.5, t) + Math.sin(t * Math.PI) * 1.6, MathUtils.lerp(from[2], to[2], t));
      coin.rotation.set(Math.PI / 2, elapsed * 2, 0); coin.visible = t > 0 && t < 1;
    });
  });
  if (reduced) return null;
  return <group ref={group}>{Array.from({ length: count }, (_, i) => <mesh key={i}><cylinderGeometry args={[0.15, 0.15, 0.065, 16]} /><meshStandardMaterial color={red ? '#ffba47' : '#ffd340'} metalness={0.45} roughness={0.25} emissive={red ? '#8f2424' : '#af6c0b'} emissiveIntensity={0.6} /></mesh>)}</group>;
}
function Effects({ effects, reduced }: { effects: Effect[]; reduced: boolean }) {
  return <>{effects.filter(e => e.amount !== 0).map((e, i) => {
    let from = spots.bank; let to = spots.player;
    if (e.kind === 'income') { from = spots.player; to = spots.bank; }
    if (e.kind === 'save') to = spots.home;
    if (e.kind === 'debt' || e.kind === 'interest') to = spots.debt;
    if (e.kind === 'invest' && e.sector) to = spots[e.sector];
    if (e.kind === 'sell' && e.sector) { from = spots[e.sector]; to = spots.bank; }
    if (e.kind === 'goal') to = spots.goal;
    if (e.kind === 'repair') { from = spots.home; to = spots.player; }
    if (e.kind === 'market') return null;
    return <CoinTrail key={i} from={from} to={to} amount={Math.abs(e.amount)} red={e.kind === 'interest' || e.kind === 'debt'} reduced={reduced} />;
  })}</>;
}
function Storm({ state, reduced }: { state: GameState; reduced: boolean }) {
  const group = useRef<Group>(null); const start = useRef<number | null>(null);
  useFrame(({ clock }) => { start.current ??= clock.elapsedTime; if (group.current) group.current.visible = clock.elapsedTime - start.current < (reduced ? 0 : 6); });
  return <group ref={group}>{(['technology', 'energy', 'retail'] as Sector[]).filter(s => townSectors(state)[s] > 0).map(sector => <group key={sector} position={[spots[sector][0], sector === 'technology' ? 5.1 : sector === 'energy' ? 4.5 : 3.8, spots[sector][2]]}>{[-0.45, 0, 0.45].map((x, i) => <mesh key={x} position={[x, i % 2 * 0.17, 0]} scale={[0.7, 0.35, 0.45]}><sphereGeometry args={[0.6, 8, 6]} /><meshStandardMaterial color="#9daabb" /></mesh>)}<Line points={[[0, -0.25, 0], [-0.15, -0.6, 0], [0.12, -0.55, 0], [-0.1, -0.95, 0]]} color="#ffd776" lineWidth={3} /></group>)}</group>;
}
function CameraMotion({ trigger, reduced, zoom, cityUnlocked, penthouseVisible, onCityReveal }: { trigger: string; reduced: boolean; zoom: number; cityUnlocked: boolean; penthouseVisible: boolean; onCityReveal: () => void }) {
  const { camera, size } = useThree(); const time = useRef(0);
  const transition = useRef<'camp' | 'zoom-out' | 'zoom-in' | 'city'>(cityUnlocked ? 'city' : 'camp');
  const transitionTime = useRef(0);
  useEffect(() => { time.current = 0; }, [trigger]);
  useEffect(() => {
    if (cityUnlocked && transition.current === 'camp') {
      transition.current = 'zoom-out';
      transitionTime.current = 0;
    } else if (!cityUnlocked) {
      transition.current = 'camp';
      transitionTime.current = 0;
    }
  }, [cityUnlocked]);
  useFrame((_, delta) => {
    if (penthouseVisible) {
      camera.position.set(22, 19, 28);
      camera.zoom = Math.min(size.width / 25, size.height / 25) * zoom;
      camera.lookAt(0, 8, 0);
      camera.updateProjectionMatrix();
      return;
    }
    time.current += delta;
    let zoomFactor = transition.current === 'city' ? 1.12 : 1;
    if (transition.current === 'zoom-out') {
      transitionTime.current += delta;
      const t = Math.min(transitionTime.current / 0.9, 1);
      const eased = t * t * (3 - 2 * t);
      zoomFactor = 1 - 0.48 * eased;
      if (t === 1) {
        transition.current = 'zoom-in';
        transitionTime.current = 0;
        onCityReveal();
      }
    } else if (transition.current === 'zoom-in') {
      transitionTime.current += delta;
      const t = Math.min(transitionTime.current / 1.15, 1);
      const eased = t * t * (3 - 2 * t);
      zoomFactor = 0.52 + 0.6 * eased;
      if (t === 1) transition.current = 'city';
    }
    const pulse = reduced || transition.current === 'zoom-out' || transition.current === 'zoom-in' ? 0 : Math.sin(Math.min(time.current / 2.8, 1) * Math.PI) * 1.1;
    const cityView = transition.current === 'city' || transition.current === 'zoom-in';
    camera.position.set(cityView ? 13 : 0, cityView ? 12 : 20, cityView ? 17 : 22);
    camera.zoom = Math.min(size.width / (cityView ? 24.4 : 20.5), size.height / (cityView ? 20 : 15.5)) * zoom * zoomFactor + pulse;
    camera.lookAt(0, 2, 0); camera.updateProjectionMatrix();
  }); return null;
}
function MapClickSurface({ onMoveTo }: { onMoveTo: (point: Point) => void }) {
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const point = event.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -spots.player[1]), new Vector3());
    if (point) onMoveTo([point.x, spots.player[1], point.z]);
  };
  return <mesh position={[0, 8.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={onClick}>
    <planeGeometry args={[200, 200]} />
    <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
  </mesh>;
}
function World({ state, reduced, zoom, avatarId, cityUnlocked, onReady }: { state: GameState; reduced: boolean; zoom: number; avatarId: string; cityUnlocked: boolean; onReady: () => void }) {
  const tower = usePenthouseIsland(campGround);
  const rented = state.decisionHistory.some(decision => decision.choice === 'rent-penthouse');
  const [penthouseVisible, setPenthouseVisible] = useState(rented);
  useEffect(onReady, [onReady]);
  const playerPosition = useRef<Point>([...spots.player]);
  const [playerPath, setPlayerPath] = useState<Point[]>([]);
  const [cityVisible, setCityVisible] = useState(cityUnlocked);
  useEffect(() => {
    if (!cityUnlocked) {
      setCityVisible(false);
      setPlayerPath([]);
    }
  }, [cityUnlocked]);
  const revealCity = useCallback(() => setCityVisible(true), []);
  const movePlayer = useCallback((destination: Point) => setPlayerPath(findWalkPath(playerPosition.current, destination, cityVisible)), [cityVisible]);
  const trigger = `${state.month}-${state.phase}-${state.decisionHistory.length}`;
  return <>
    <color attach="background" args={['#87ceeb']} />
    <ambientLight intensity={penthouseVisible ? 0.55 : 0.95} /><hemisphereLight args={['#eaf7ff', '#90a778', penthouseVisible ? 0.65 : 1.15]} />
    <directionalLight position={[-7, 15, 9]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-normalBias={0.04} shadow-radius={3} />
    <CameraMotion trigger={trigger} reduced={reduced} zoom={zoom} cityUnlocked={cityUnlocked} penthouseVisible={penthouseVisible} onCityReveal={revealCity} />
    {!rented && <MapClickSurface onMoveTo={movePlayer} />}
    <UpgradeTransition upgraded={rented} reduced={reduced} glowHeight={campGround + 0.04} name="penthouse-transformation" onSwap={setPenthouseVisible}>{showPenthouse => showPenthouse ? <group name="miami-penthouse-island">
      <primitive object={tower} />
      <group position={[-1.5, campGround + 0.05, 5.3]} rotation={[0, 0.3, 0]}><AnimatedAvatar avatarId={avatarId} size={2.3} walking={false} /></group>
      <CampDog position={[0.1, campGround + 0.05, 5.3]} reduced={reduced} />
    </group> : <group>
    {cityVisible ? <>
      <CityStreets height={campGround - 0.015} />
      {cityBuildings.map((building, index) => <Model key={`${building.name}-${index}`} name={building.name} position={[building.position[0], campGround, building.position[1]]} size={building.size} />)}
      <UpgradedHome position={[0, campGround, 0]} scale={0.85} rotation={0} />
    </> : <>
      <CampIsland height={campGround} />
      <HomeTransformation upgraded={homeUpgradeUnlocked(state)} reduced={reduced} />
      <CampGrass />
      <Shield amount={state.emergencySavings} reduced={reduced} />
      {(['technology', 'energy', 'retail'] as Sector[]).map(sector => <CampGrowthTree key={sector} sector={sector} value={townSectors(state)[sector]} reduced={reduced} />)}
      {campProps.map((prop, index) => <Model key={`${prop.name}-${index}`} name={`camp/${prop.name}`} position={[prop.position[0], campGround, prop.position[1]]} size={prop.size} rotation={prop.rotation} />)}
      <Effects key={trigger} effects={state.effects} reduced={reduced} />
      {state.monthlyGrowth < 0 && <Storm key={trigger} state={state} reduced={reduced} />}
    </>}
    <CampDog position={cityVisible ? [2.8, campGround, 5] : spots.goal} reduced={reduced} />
    <PlayerCharacter reduced={reduced} avatarId={avatarId} path={playerPath} positionRef={playerPosition} city={cityVisible} />
    </group>}</UpgradeTransition>
    {rented && penthouseVisible && <PenthouseFireworks reduced={reduced} />}
    <SkyClouds reduced={reduced} city={cityVisible || penthouseVisible} />
  </>;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function TextTown({ state }: { state: GameState }) {
  return <div className="text-town"><span className="eyebrow">Your campsite, in words</span><h3>Every choice still counts.</h3>{state.decisionHistory.some(decision => decision.choice === 'rent-penthouse') && <p>Your rented Miami penthouse sits on a floating island with a rooftop pool and gardens.</p>}{homeUpgradeUnlocked(state) && <p>Home upgraded: {state.account === 'TFSA' ? 'opening your TFSA' : 'investing your raise in an ETF'} replaced your tent with a house.</p>}<p>The 3D campsite is unavailable. Your full game and financial results are ready to play. A dog keeps your character company outside their home.</p><div><span>Bank <b>{money(state.cash)}</b></span><span>General savings <b>{money(state.savings)}</b></span><span>Home shield <b>{money(state.emergencySavings)}</b></span><span>Debt drain <b>{money(totalDebt(state))}</b></span><span>Sector buildings <b>{money(portfolio(state))}</b></span><span>Goal building <b>{Math.round(goalProgress(state) * 100)}%</b></span></div></div>;
}
export default function Town({ state, reduced, zoom, avatarId, avatarName }: { state: GameState; reduced: boolean; zoom: number; avatarId: string; avatarName: string }) {
  const rented = state.decisionHistory.some(decision => decision.choice === 'rent-penthouse');
  const [ready, setReady] = useState(false);
  const [cityUnlocked, setCityUnlocked] = useState(() => {
    if (!homeUpgradeUnlocked(state)) return false;
    try { return localStorage.getItem(CITY_UNLOCK_KEY) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    if (homeUpgradeUnlocked(state) && state.cash >= 5000) {
      setCityUnlocked(true);
      try { localStorage.setItem(CITY_UNLOCK_KEY, 'true'); } catch { /* storage is optional */ }
    } else if (state.decisionHistory.length === 0) {
      setCityUnlocked(false);
      try { localStorage.removeItem(CITY_UNLOCK_KEY); } catch { /* storage is optional */ }
    }
  }, [state.cash, state.decisionHistory.length]);
  const [available] = useState(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });
  const fallback = <TextTown state={state} />;
  const sceneDescription = rented ? 'Miami island with a rented penthouse' : `${cityUnlocked ? 'City' : 'Campsite'} with ${homeUpgradeUnlocked(state) ? 'an upgraded house' : 'a tent'}`;
  if (!available) return fallback;
  return <SceneBoundary fallback={fallback}><Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [0, 20, 22], near: 0.1, far: 200, zoom: 40 }} gl={{ antialias: true, alpha: true }} fallback={fallback} data-city-ready={ready} data-home-upgraded={homeUpgradeUnlocked(state)} data-penthouse-unlocked={rented} aria-label={`${sceneDescription}, a dog, and ${avatarName}'s selected character`}><Suspense fallback={null}><World state={state} reduced={reduced} zoom={zoom} avatarId={avatarId} cityUnlocked={cityUnlocked} onReady={() => setReady(true)} /></Suspense></Canvas>{!ready && <div className="scene-loading"><span className="loading-leaf">✦</span>Setting up your camp…</div>}</SceneBoundary>;
}
