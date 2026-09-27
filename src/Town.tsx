import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, useGLTF } from '@react-three/drei';
import { Box3, Group, MathUtils, Mesh, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Effect, GameState, Sector } from './engine';
import { goalProgress, money, portfolio, townSectors } from './engine';
import { CityBlocks, StreetLife, Tree } from './TownScenery';

type Point = [number, number, number];
const spots: Record<string, Point> = { home: [-5.6, 0.18, 4.8], bank: [-5.6, 0.18, 0], technology: [0, 0.18, -4.8], energy: [5.6, 0.18, -4.8], retail: [5.6, 0.18, 0], goal: [0, 0.18, 4.8], maya: [-4.2, 0.18, 3.5], debt: [-7.1, 0.18, 1.4] };

function Model({ name, size = 2, position = [0, 0, 0], rotation = 0 }: { name: string; size?: number; position?: Point; rotation?: number }) {
  const { scene } = useGLTF(`/models/${name}.glb`);
  const object = useMemo(() => {
    const copy = clone(scene); const box = new Box3().setFromObject(copy);
    const extent = box.getSize(new Vector3()); const center = box.getCenter(new Vector3());
    const scale = size / Math.max(extent.x, extent.y, extent.z);
    copy.scale.setScalar(scale); copy.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    copy.traverse(child => { if (child instanceof Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    return copy;
  }, [scene, size]);
  return <group position={position} rotation={[0, rotation, 0]}><primitive object={object} /></group>;
}
function Shield({ amount, reduced }: { amount: number; reduced: boolean }) {
  const group = useRef<Group>(null); const target = amount ? 0.82 + Math.min(amount / 1500, 1) * 0.15 : 0;
  useFrame((_, delta) => { if (group.current) { const scale = reduced ? target : MathUtils.damp(group.current.scale.x, target, 5, delta); group.current.scale.set(scale, scale * 1.2, scale); } });
  return <group position={spots.home}><group ref={group} scale={0}>
    <mesh position={[0, 0.02, 0]}><sphereGeometry args={[2.45, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#48ffd0" emissive="#05b79f" emissiveIntensity={0.5} transparent opacity={0.15} roughness={0.1} depthWrite={false} side={2} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, 0]}><ringGeometry args={[2.4, 2.46, 64]} /><meshBasicMaterial color="#bcfff1" transparent opacity={0.9} /></mesh>
    {[0,Math.PI/2].map(a=><mesh key={a} rotation={[0,a,0]}><torusGeometry args={[2.44,.017,6,60,Math.PI]} /><meshBasicMaterial color="#a3ffec" transparent opacity={0.7} /></mesh>)}
  </group></group>;
}
function SectorBuilding({ sector, value, reduced }: { sector: Sector; value: number; reduced: boolean }) {
  const group = useRef<Group>(null);
  const target = 0.92 + Math.min(value / 1500, 1) * 0.2;
  useFrame((_, delta) => { if (group.current) group.current.scale.y = reduced ? target : MathUtils.damp(group.current.scale.y, target, 4, delta); });
  const model = sector === 'technology' ? 'technology' : sector === 'energy' ? 'city-office' : 'city-shops';
  return <group ref={group} position={spots[sector]}><Model name={model} size={sector === 'technology' ? 4.4 : sector === 'energy' ? 3.8 : 3.1} rotation={Math.PI / 2} /></group>;
}
function GoalBuilding({ progress, reduced }: { progress: number; reduced: boolean }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => { if (group.current) group.current.scale.y = reduced ? .65 + progress * .6 : MathUtils.damp(group.current.scale.y, .65 + progress * .6, 4, delta); });
  return <group ref={group} position={spots.goal}><Model name="goal" size={2.7} rotation={Math.PI / 2} /></group>;
}
function Maya({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => { if (group.current && !reduced) group.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.035; });
  return <group position={spots.maya}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}><ringGeometry args={[0.36, 0.43, 40]} /><meshBasicMaterial color="#fdfbef" /></mesh><group ref={group}><Model name="maya" size={0.75} rotation={0.5} /></group></group>;
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
    let from = spots.bank; let to = spots.maya;
    if (e.kind === 'income') { from = spots.maya; to = spots.bank; }
    if (e.kind === 'save') to = spots.home;
    if (e.kind === 'debt' || e.kind === 'interest') to = spots.debt;
    if (e.kind === 'invest' && e.sector) to = spots[e.sector];
    if (e.kind === 'sell' && e.sector) { from = spots[e.sector]; to = spots.bank; }
    if (e.kind === 'goal') to = spots.goal;
    if (e.kind === 'repair') { from = spots.home; to = spots.maya; }
    if (e.kind === 'market') return null;
    return <CoinTrail key={i} from={from} to={to} amount={Math.abs(e.amount)} red={e.kind === 'interest' || e.kind === 'debt'} reduced={reduced} />;
  })}</>;
}
function Storm({ state, reduced }: { state: GameState; reduced: boolean }) {
  const group = useRef<Group>(null); const start = useRef<number | null>(null);
  useFrame(({ clock }) => { start.current ??= clock.elapsedTime; if (group.current) group.current.visible = clock.elapsedTime - start.current < (reduced ? 0 : 6); });
  return <group ref={group}>{(['technology', 'energy', 'retail'] as Sector[]).filter(s => townSectors(state)[s] > 0).map(sector => <group key={sector} position={[spots[sector][0], sector === 'technology' ? 5.1 : sector === 'energy' ? 4.5 : 3.8, spots[sector][2]]}>{[-0.45, 0, 0.45].map((x, i) => <mesh key={x} position={[x, i % 2 * 0.17, 0]} scale={[0.7, 0.35, 0.45]}><sphereGeometry args={[0.6, 8, 6]} /><meshStandardMaterial color="#9daabb" /></mesh>)}<Line points={[[0, -0.25, 0], [-0.15, -0.6, 0], [0.12, -0.55, 0], [-0.1, -0.95, 0]]} color="#ffd776" lineWidth={3} /></group>)}</group>;
}
function CameraMotion({ trigger, reduced, zoom }: { trigger: string; reduced: boolean; zoom: number }) {
  const { camera, size } = useThree(); const time = useRef(0);
  useEffect(() => { time.current = 0; }, [trigger]);
  useFrame((_, delta) => {
    time.current += delta;
    const pulse = reduced ? 0 : Math.sin(Math.min(time.current / 2.8, 1) * Math.PI) * 1.1;
    camera.zoom = Math.min(size.width / 24.4, size.height / 20) * zoom + pulse;
    camera.lookAt(0, 1, 0); camera.updateProjectionMatrix();
  }); return null;
}
function World({ state, reduced, zoom, onReady }: { state: GameState; reduced: boolean; zoom: number; onReady: () => void }) {
  useEffect(onReady, [onReady]);
  const trigger = `${state.month}-${state.phase}-${state.decisionHistory.length}`;
  const trees: [number, number][] = [[-7, -5.8], [-4.2, -5.8], [-7, 1.2], [-7, 5.8], [-4.15, 5.8], [1.6, 1.1], [4.4, 4], [6.5, 4], [4.4, 5.7], [6.5, 5.7], [7, -5.9]];
  return <>
    <color attach="background" args={['#dce4e8']} />
    <ambientLight intensity={0.8} /><hemisphereLight args={['#eef3ff', '#b4bdc8', 1.2]} />
    <directionalLight position={[-7, 15, 9]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-normalBias={0.04} shadow-radius={3} />
    <CameraMotion trigger={trigger} reduced={reduced} zoom={zoom} /><CityBlocks />
    <Model name="city-home" position={spots.home} size={2.45} rotation={Math.PI / 2} />
    <Shield amount={state.emergencySavings} reduced={reduced} />
    <Model name="bank" position={spots.bank} size={2.9} rotation={Math.PI / 2} />
    {(['technology', 'energy', 'retail'] as Sector[]).map(sector => <SectorBuilding key={sector} sector={sector} value={townSectors(state)[sector]} reduced={reduced} />)}
    <GoalBuilding progress={goalProgress(state)} reduced={reduced} />
    <Model name="city-apartments" position={[-5.6, .18, -4.8]} size={3.4} rotation={Math.PI / 2} />
    <Model name="retail" position={[-.65, .18, 0]} size={2.9} rotation={Math.PI / 2} />
    <Model name="city-home" position={[1.1, .18, .65]} size={1.35} />
    <Maya reduced={reduced} /><StreetLife />
    {state.debt > 0 && <><Line points={[[-5.6, .4, 4.8], [-7.2, .35, 3.4], [-7.1, .35, 1.4]]} color="#e96c79" lineWidth={5} transparent opacity={.65} /><mesh position={[-7.1, .3, 1.4]}><boxGeometry args={[.35,.4,.35]} /><meshStandardMaterial color="#d96170" /></mesh></>}
    {trees.map(([x,z],i)=><Tree key={i} position={[x,.18,z]} size={.7+(i%3)*.1} variant={i} />)}
    <Effects key={trigger} effects={state.effects} reduced={reduced} />
    {state.monthlyGrowth < 0 && <Storm key={trigger} state={state} reduced={reduced} />}
  </>;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function TextTown({ state }: { state: GameState }) {
  return <div className="text-town"><span className="eyebrow">Your town, in words</span><h3>Every choice still counts.</h3><p>The 3D view is unavailable. Your full game and financial results are ready to play.</p><div><span>Bank <b>{money(state.cash)}</b></span><span>Home shield <b>{money(state.emergencySavings)}</b></span><span>Debt drain <b>{money(state.debt)}</b></span><span>Sector buildings <b>{money(portfolio(state))}</b></span><span>Goal building <b>{Math.round(goalProgress(state) * 100)}%</b></span></div></div>;
}
export default function Town({ state, reduced, zoom }: { state: GameState; reduced: boolean; zoom: number }) {
  const [ready, setReady] = useState(false);
  const [available] = useState(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });
  const fallback = <TextTown state={state} />;
  if (!available) return fallback;
  return <SceneBoundary fallback={fallback}><Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [13, 12, 17], near: 0.1, far: 200, zoom: 40 }} gl={{ antialias: true, alpha: true }} fallback={fallback} data-city-ready={ready} aria-label="A Kenney-style commercial city with animated savings and investments"><Suspense fallback={null}><World state={state} reduced={reduced} zoom={zoom} onReady={() => setReady(true)} /></Suspense></Canvas>{!ready && <div className="scene-loading"><span className="loading-leaf">✦</span>Building your city…</div>}</SceneBoundary>;
}
