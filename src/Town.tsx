import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, RoundedBox, useGLTF } from '@react-three/drei';
import { Box3, Group, MathUtils, Mesh, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Effect, GameState, Sector } from './engine';
import { money, portfolio } from './engine';
import { BankBuilding, Construction, HomeVilla, Island, SkyCloud, StreetLife, Tree } from './TownScenery';
import { Building2, CreditCard, Flag, Landmark, ShieldCheck, UserRound, Zap } from 'lucide-react';

type Point = [number, number, number];
const spots: Record<string, Point> = { home: [1, 0.2, -0.8], bank: [-4.25, 0.2, -2.9], technology: [0.4, 0.2, -4.8], energy: [3.8, 0.2, -4.6], retail: [5.65, 0.2, -1.5], goal: [2.6, 0.2, 3.6], maya: [-1.1, 0.2, 0.65], debt: [6.35, 0.2, 1.3] };

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
function Label({ position, title, value, tone = 'neutral' }: { position: Point; title: string; value?: string; tone?: string }) {
  const Icon = tone === 'cash' ? Landmark : tone === 'savings' ? ShieldCheck : tone === 'debt' ? CreditCard : tone === 'goal' ? Flag : tone === 'energy' ? Zap : tone === 'neutral' ? UserRound : Building2;
  return <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}><div className={`town-label ${tone}`}><Icon /><span className="label-copy">{title}{value && <strong>{value}</strong>}</span></div></Html>;
}
function Plot({ position, tint = '#c9d9ae', width = 2.8, depth = 2.6 }: { position: Point; tint?: string; width?: number; depth?: number }) {
  return <RoundedBox args={[width, 0.1, depth]} radius={0.045} smoothness={2} position={position} receiveShadow><meshStandardMaterial color={tint} /></RoundedBox>;
}
function Shield({ amount, reduced }: { amount: number; reduced: boolean }) {
  const group = useRef<Group>(null); const target = amount ? 1.03 + amount / 1500 * 0.25 : 0;
  useFrame((_, delta) => { if (group.current) { const scale = reduced ? target : MathUtils.damp(group.current.scale.x, target, 5, delta); group.current.scale.set(scale, scale * 1.58, scale); } });
  return <group position={spots.home}><group ref={group} scale={0}>
    <mesh position={[0, 0.02, 0]}><sphereGeometry args={[2.45, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#48ffd0" emissive="#05b79f" emissiveIntensity={0.5} transparent opacity={0.15} roughness={0.1} depthWrite={false} side={2} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, 0]}><ringGeometry args={[2.4, 2.46, 64]} /><meshBasicMaterial color="#bcfff1" transparent opacity={0.9} /></mesh>
    {[0,Math.PI/2].map(a=><mesh key={a} rotation={[0,a,0]}><torusGeometry args={[2.44,.017,6,60,Math.PI]} /><meshBasicMaterial color="#a3ffec" transparent opacity={0.7} /></mesh>)}
  </group></group>;
}
function SectorBuilding({ sector, value, reduced, showLabel }: { sector: Sector; value: number; reduced: boolean; showLabel: boolean }) {
  const group = useRef<Group>(null); const size = sector === 'technology' ? 1.9 : 1.45;
  const target = 0.82 + Math.min(value / 900, 1.2) * 0.28;
  useFrame((_, delta) => { if (group.current) group.current.scale.y = reduced ? target : MathUtils.damp(group.current.scale.y, target, 4, delta); });
  const p = spots[sector];
  return <group><Plot position={p} tint={sector === 'technology' ? '#d8d4e2' : sector === 'energy' ? '#dfe0ba' : '#e4d5c2'} /><group ref={group} position={p}><Model name={sector === 'energy' ? 'factory' : sector} size={size} rotation={Math.PI / 2} />{sector === 'energy' && <Model name="solar" size={1.15} position={[0.4, 0, 1.2]} />}</group>{showLabel && <Label position={[p[0], p[1] + size + 0.45, p[2]]} title={sector === 'technology' ? 'Technology' : sector === 'energy' ? 'Energy' : 'Retail'} value={money(value)} tone={sector} />}</group>;
}
function Turbine({ reduced }: { reduced: boolean }) {
  const rotor = useRef<Group>(null);
  useFrame((_, delta) => { if (rotor.current && !reduced) rotor.current.rotation.z += delta * 0.45; });
  return <group position={[5.3, 0.1, -3.9]}><mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.045, 0.1, 1.6, 8]} /><meshStandardMaterial color="#f6f1df" /></mesh><group ref={rotor} position={[0, 1.6, 0.08]}>{[0, 2.094, 4.188].map(a => <group rotation={[0, 0, a]} key={a}><mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.09, 0.8, 0.035]} /><meshStandardMaterial color="#fffaf0" /></mesh></group>)}</group></group>;
}
function Maya({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => { if (group.current && !reduced) group.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.035; });
  return <group position={spots.maya}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}><ringGeometry args={[0.36, 0.43, 40]} /><meshBasicMaterial color="#fdfbef" /></mesh><group ref={group}><Model name="maya" size={0.95} rotation={0.5} /></group><Label position={[0, 1.3, 0]} title="Maya" /></group>;
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
  return <group ref={group}>{(['technology', 'energy', 'retail'] as Sector[]).filter(s => state.investmentsBySector[s] > 0).map(sector => <group key={sector} position={[spots[sector][0], sector === 'technology' ? 3.8 : 2.9, spots[sector][2]]}>{[-0.45, 0, 0.45].map((x, i) => <mesh key={x} position={[x, i % 2 * 0.17, 0]} scale={[0.7, 0.35, 0.45]}><sphereGeometry args={[0.6, 8, 6]} /><meshStandardMaterial color="#9daabb" /></mesh>)}<Line points={[[0, -0.25, 0], [-0.15, -0.6, 0], [0.12, -0.55, 0], [-0.1, -0.95, 0]]} color="#ffd776" lineWidth={3} /></group>)}</group>;
}
function CameraMotion({ trigger, reduced, zoom }: { trigger: string; reduced: boolean; zoom: number }) {
  const { camera, size } = useThree(); const time = useRef(0);
  useEffect(() => { time.current = 0; }, [trigger]);
  useFrame((_, delta) => {
    time.current += delta;
    const pulse = reduced ? 0 : Math.sin(Math.min(time.current / 2.8, 1) * Math.PI) * 1.1;
    camera.zoom = Math.min(size.width / 20.3, size.height / 18) * zoom + pulse;
    camera.lookAt(0, 1.2, 0); camera.updateProjectionMatrix();
  }); return null;
}
function World({ state, reduced, zoom, onReady }: { state: GameState; reduced: boolean; zoom: number; onReady: () => void }) {
  useEffect(onReady, [onReady]);
  const trigger = `${state.month}-${state.phase}-${state.decisionHistory.length}`;
  const trees: [number, number][] = [
    [-6.8,-4.9],[-5.7,-5.2],[-4.7,-5.25],[-3.2,-5.1],[-1.9,-5.3],[-.8,-5.6],[2,-5.4],[5.1,-5.3],[6.35,-4.9],
    [-6.8,-3.8],[-6.5,-2.7],[-6.9,-1.6],[-5.9,-.7],[-4.6,-.6],[-3.6,-.6],[-2.7,-.2],[-.75,-3.8],
    [6.9,-3.5],[6.85,-2.2],[6.8,-.4],[5.2,.1],[3.3,.3],[-6.7,3.2],[-5.8,3.7],[-4.8,4.9],[-6.3,5.3],
    [-3.7,4.2],[-2.9,5.1],[-1.7,4],[-1.1,5.4],[.1,4.8],[.6,5.8],[4.2,5.5],[5.45,4.85],[6.7,4.7],[6.7,3.5],
    [-5.5,3.1],[-3.8,3.4],[-2.2,4.7],[5.6,3.8],[4.75,5.7],[-6.7,.5],[6.8,5.65],[-.9,-2.1]
  ];
  return <>
    <ambientLight intensity={0.85} /><hemisphereLight args={['#e6faff', '#b4c98b', 1.4]} />
    <directionalLight position={[-5, 14, 8]} intensity={2.7} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-normalBias={0.05} />
    <CameraMotion trigger={trigger} reduced={reduced} zoom={zoom} /><Island />
    {[-6.25,-3.75,-1.25,1.25,3.75,6.25].map(x => <Model key={`h${x}`} name={x === -1.25 ? 'crossroad' : 'road'} size={2.5} position={[x, 0.14, 2]} rotation={Math.PI / 2} />)}
    {[-5.5,-3,-.5,4.5].map(z => <Model key={z} name="road" size={2.5} position={[-1.25, 0.13, z]} />)}
    <Plot position={spots.home} tint="#9bce57" width={3.9} depth={4.25} /><HomeVilla position={spots.home} /><Shield amount={state.emergencySavings} reduced={reduced} />
    <Label position={[1, 5.05, -.8]} title="Emergency Fund" value={state.emergencySavings ? `${money(state.emergencySavings)} protected · Your home` : 'Your home · Build your protection'} tone="savings" />
    <Plot position={spots.bank} tint="#cbd89e" width={3.1} depth={3.4} /><BankBuilding position={spots.bank} /><Label position={[-4.25, 4.4, -2.9]} title="Bank" value={money(state.cash)} tone="cash" />
    {(['technology', 'energy', 'retail'] as Sector[]).map(sector => <SectorBuilding key={sector} sector={sector} value={state.investmentsBySector[sector]} reduced={reduced} showLabel={state.step >= 3} />)}
    <Plot position={spots.goal} tint="#cbb989" width={3.5} depth={2.9} /><Construction position={spots.goal} progress={state.goalSavings / 1500} />
    <Label position={[2.6, 3.3, 4.2]} title="Goal" value={`Tuition · ${Math.round(state.goalSavings / 1500 * 100)}% funded`} tone="goal" />
    <Maya reduced={reduced} /><Turbine reduced={reduced} /><StreetLife />
    {state.creditCardDebt > 0 && <><Line points={[[1, .6, -.8], [3.8, .8, -.1], [6.35, 1.6, 1.3]]} color="#ff596c" lineWidth={9} transparent opacity={.7} /><Line points={[[1, .6, -.8], [3.8, .8, -.1], [6.35, 1.6, 1.3]]} color="#ffd6ad" lineWidth={2} /><group position={spots.debt}><mesh position={[0, .35, 0]} castShadow><boxGeometry args={[.65,.7,.7]} /><meshStandardMaterial color="#e75b64" /></mesh></group></>}
    <Label position={[6.35, 2.7, 1.3]} title="Credit Card Debt" value={state.creditCardDebt ? `Debt drain · ${money(state.creditCardDebt)}` : '$0 · No balance'} tone="debt" />
    {trees.map(([x,z],i)=><Tree key={i} position={[x,.16,z]} size={.75+(i%4)*.15} pine={i%3===0} variant={i} />)}
    {[[-5.9,3], [5.7,4.8], [2.5,-5.6],[-6.2,-1],[6.6,0]].map(([x,z],i)=><Model key={i} name="rock" size={.25+i%2*.1} position={[x,.15,z]} />)}
    <SkyCloud position={[-6.5, 6, -4.5]} scale={1.05} reduced={reduced} /><SkyCloud position={[5.5, 7.8, -5]} scale={1.45} reduced={reduced} />
    <Effects key={trigger} effects={state.effects} reduced={reduced} />
    {state.month === 10 && <Storm key={trigger} state={state} reduced={reduced} />}
  </>;
}
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function TextTown({ state }: { state: GameState }) {
  return <div className="text-town"><span className="eyebrow">Your town, in words</span><h3>Every choice still counts.</h3><p>The 3D view is unavailable. Your full game and financial results are ready to play.</p><div><span>Bank <b>{money(state.cash)}</b></span><span>Home shield <b>{money(state.emergencySavings)}</b></span><span>Debt drain <b>{money(state.creditCardDebt)}</b></span><span>Sector buildings <b>{money(portfolio(state))}</b></span><span>Tuition building <b>{Math.round(state.goalSavings / 1500 * 100)}%</b></span></div></div>;
}
export default function Town({ state, reduced, zoom }: { state: GameState; reduced: boolean; zoom: number }) {
  const [ready, setReady] = useState(false);
  const [available] = useState(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });
  const fallback = <TextTown state={state} />;
  if (!available) return fallback;
  return <SceneBoundary fallback={fallback}><Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [13, 12, 17], near: 0.1, far: 200, zoom: 40 }} gl={{ antialias: true, alpha: true }} fallback={fallback} aria-label="A miniature town showing your bank, home shield, debt drain, investment sectors, and tuition goal"><Suspense fallback={null}><World state={state} reduced={reduced} zoom={zoom} onReady={() => setReady(true)} /></Suspense></Canvas>{!ready && <div className="scene-loading"><span className="loading-leaf">✦</span>Growing your little town…</div>}</SceneBoundary>;
}
