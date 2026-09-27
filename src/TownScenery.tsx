import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { ExtrudeGeometry, Group, Shape } from 'three';

type Point = [number, number, number];
function Block({ at, size, color, rotation = [0, 0, 0] }: { at: Point; size: Point; color: string; rotation?: Point }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
}
function Gable({ width, height, depth, color, position }: { width: number; height: number; depth: number; color: string; position: Point }) {
  const geometry = useMemo(() => { const shape = new Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(0, height); shape.lineTo(width / 2, 0); shape.closePath(); return new ExtrudeGeometry(shape, { depth, bevelEnabled: false }); }, [width, height, depth]);
  return <mesh geometry={geometry} position={[position[0], position[1], position[2] - depth / 2]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}
export function HomeVilla({ position }: { position: Point }) {
  return <group position={position}>
    <Block at={[0, 0.08, 0]} size={[3.1, 0.16, 2.85]} color="#d3d0b1" />
    <Block at={[0, 1.42, 0]} size={[2.4, 2.65, 2.15]} color="#fff4d8" />
    <Block at={[0, 0.35, 0]} size={[2.46, 0.24, 2.2]} color="#ded8be" />
    <Block at={[0, 1.5, 0]} size={[2.48, 0.1, 2.24]} color="#e2d9b9" />
    <Gable width={2.9} height={1} depth={2.7} color="#cc774a" position={[0, 2.76, 0]} />
    <Gable width={2.5} height={0.8} depth={0.08} color="#fff1d1" position={[0, 2.77, 1.16]} />
    {[-1, 1].map(side => <group key={side}>{[-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05].map(z => <Block key={z} at={[side * .73, 3.27, z]} size={[1.78, 0.035, 0.028]} color="#a95f3b" rotation={[0, 0, -side * .602]} />)}</group>)}
    {[0.86, 2.03].flatMap(y => [-0.7, 0.7].map(x => <group key={`${x}${y}`}><Block at={[x, y, 1.09]} size={[0.57, 0.76, 0.1]} color="#9f7857" /><Block at={[x, y, 1.16]} size={[0.42, 0.59, 0.055]} color="#528f9c" /><Block at={[x, y, 1.2]} size={[0.035, 0.61, 0.035]} color="#b9e5dc" /><Block at={[x, y, 1.19]} size={[0.45, 0.035, 0.04]} color="#b9e5dc" /><Block at={[x, y - .43, 1.19]} size={[0.69, 0.11, 0.26]} color="#d7c4a0" /></group>))}
    {[0.84, 2.03].flatMap(y => [-0.6, 0.55].map(z => <group key={`${y}${z}`}><Block at={[1.22, y, z]} size={[0.08, 0.69, 0.51]} color="#aa805b" /><Block at={[1.27, y, z]} size={[0.035, 0.54, 0.38]} color="#578f9a" /></group>))}
    <Block at={[0, .69, 1.12]} size={[.53, 1.11, .12]} color="#966f46" /><Block at={[0, .21, 1.43]} size={[.85, .2, .75]} color="#e5d5ad" />
    <Gable width={1.13} height={.37} depth={.8} color="#d7834e" position={[0, 1.33, 1.27]} />
    <Block at={[-.74, 3.57, -.68]} size={[.35, .92, .37]} color="#d9c5aa" /><Block at={[-.74, 4.03, -.68]} size={[.46, .12, .48]} color="#f6e3c5" /><Block at={[-.74, 4.1, -.68]} size={[.26, .025, .27]} color="#69544a" />
    {[-1.75, 1.75].map(x => <group key={x}>{[-1.6,-1,-.4,.2,.8,1.4,2].map(z => <Block key={z} at={[x,.35,z]} size={[.09,.62,.09]} color="#fffbe9" />)}{[.24,.49].map(y => <Block key={y} at={[x,y,.2]} size={[.065,.08,3.65]} color="#fffbe9" />)}</group>)}
    {[-1.4,-1,-.6,.6,1,1.4].map(x => <Block key={x} at={[x,.35,2]} size={[.085,.62,.085]} color="#fffbe9" />)}
    {[-1,1].map(x => <group key={x}>{[.24,.49].map(y => <Block key={y} at={[x,y,2]} size={[1.25,.08,.07]} color="#fffbe9" />)}</group>)}
  </group>;
}
export function BankBuilding({ position }: { position: Point }) {
  return <group position={position}>
    {[0,1,2].map(i => <Block key={i} at={[0,.08+i*.1,.12]} size={[2.65-i*.15,.16,2.7-i*.17]} color={i===0?'#c9bfa1':'#e6dfc8'} />)}
    <Block at={[0,1.4,-.28]} size={[2.18,2.05,1.68]} color="#8aafbe" />
    <Block at={[0,1.13,.6]} size={[.66,1.4,.08]} color="#365f77" />
    {[-.89,-.36,.36,.89].map(x => <group key={x}><mesh position={[x,1.28,.89]} castShadow><cylinderGeometry args={[.13,.16,1.85,10]} /><meshStandardMaterial color="#e5edf0" /></mesh><Block at={[x,.38,.89]} size={[.34,.17,.34]} color="#e7eef0" /><Block at={[x,2.18,.89]} size={[.34,.15,.34]} color="#e7eef0" /></group>)}
    <Block at={[0,2.34,0]} size={[2.66,.25,2.48]} color="#e5ece9" /><Gable width={2.75} height={.65} depth={2.5} color="#aec5d2" position={[0,2.5,0]} />
    <Gable width={2.77} height={.66} depth={.09} color="#f1f3e8" position={[0,2.5,1.27]} /><Gable width={2.15} height={.4} depth={.03} color="#7399af" position={[0,2.55,1.33]} />
    <Html transform position={[0,2.06,1.12]} distanceFactor={7} zIndexRange={[2,0]}><div className="building-sign">BANK</div></Html>
  </group>;
}
export function Construction({ position, progress }: { position: Point; progress: number }) {
  return <group position={position}>
    <Block at={[0,.09,0]} size={[2.9,.18,2.6]} color="#c5b499" />
    {[0,1,2].map(level => <group key={level} position={[0,level*.65,0]}>
      <Block at={[0,.28,0]} size={[2.45,.13,2.13]} color={level / 3 < progress ? '#e9d6af':'#b9afa0'} />
      {[-1.05,1.05].flatMap(x => [-.85,.85].map(z => <Block key={`${x}${z}`} at={[x,.62,z]} size={[.11,.66,.11]} color="#be8c59" />))}
      {[-.85,.85].map(z => <Block key={z} at={[0,.86,z]} size={[2.3,.1,.1]} color="#b98250" />)}
    </group>)}
    {progress > 0 && <Block at={[0,.6,-.91]} size={[2.1,progress*2,.12]} color="#ece0c8" />}
    <group position={[1.6,0,-.65]}>
      <Block at={[0,1.55,0]} size={[.16,3.1,.16]} color="#e6af22" />
      {[-.15,.15].map(x => <Block key={x} at={[x,1.55,0]} size={[.04,3.1,.28]} color="#f2c23d" />)}
      {Array.from({length:8},(_,i)=><Block key={i} at={[0,.3+i*.36,0]} size={[.32,.045,.3]} color="#d6a225" />)}
      <Block at={[-.8,3.12,0]} size={[3.4,.17,.2]} color="#f6c437" /><Block at={[.45,2.99,0]} size={[.45,.3,.5]} color="#e3ba50" />
      <Block at={[-1.9,2.57,0]} size={[.025,1.1,.025]} color="#7c6c49" /><Block at={[-1.9,2.04,0]} size={[.15,.08,.1]} color="#5e6260" />
    </group>
    {[-1.3,-.85,-.4].map(x => <Block key={x} at={[x,.34,1.3]} size={[.36,.5,.4]} color="#c29561" />)}
  </group>;
}
export function Tree({ position, size=1, pine=false, variant=0 }: { position: Point; size?: number; pine?: boolean; variant?: number }) {
  const color = ['#78ad35','#579d43','#8eba3d','#3e9552'][variant%4];
  return <group position={position} scale={size}><mesh position={[0,.37,0]} castShadow><cylinderGeometry args={[.07,.12,.75,6]} /><meshStandardMaterial color="#826548" /></mesh>{pine ? [0,1,2].map(i=><mesh key={i} position={[0,.76+i*.35,0]} castShadow><coneGeometry args={[.57-i*.11,.9,7]} /><meshStandardMaterial color={i===2?'#92bb43':color} flatShading /></mesh>) : <><mesh position={[0,1.04,0]} scale={[.9,1.05,.9]} castShadow><icosahedronGeometry args={[.69,1]} /><meshStandardMaterial color={color} flatShading /></mesh><mesh position={[.24,1.38,.04]} castShadow><icosahedronGeometry args={[.42,0]} /><meshStandardMaterial color="#91bc41" flatShading /></mesh></>}</group>;
}
export function Island() {
  return <>
    <RoundedBox args={[15.4,.82,12.6]} radius={.38} smoothness={1} position={[0,-.53,0]} castShadow receiveShadow><meshStandardMaterial color="#9a9980" flatShading /></RoundedBox>
    <RoundedBox args={[15.65,.28,12.8]} radius={.13} smoothness={2} position={[0,-.02,0]} receiveShadow><meshStandardMaterial color="#a4ce59" /></RoundedBox>
    {Array.from({length:46},(_,i)=>{ const a=i/46*Math.PI*2;const x=Math.cos(a)*7.35;const z=Math.sin(a)*5.95;return <mesh key={i} position={[x,-.56,z]} rotation={[0,a,i%2*.1]} scale={[.65,.64+i%3*.12,.53]} castShadow><icosahedronGeometry args={[1,0]} /><meshStandardMaterial color={['#96958f','#a3a095','#878d86','#beb49c'][i%4]} flatShading /></mesh>;})}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.02,0]} receiveShadow><planeGeometry args={[200,200]} /><meshStandardMaterial color="#44bfda" roughness={.45} metalness={.12} /></mesh>
    {[1,1.06,1.13].map((s,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,-.99-i*.003,0]} scale={[8.1*s,6.7*s,1]}><ringGeometry args={[.97,1,64]} /><meshBasicMaterial color="#b9f5ec" transparent opacity={.27-i*.07} /></mesh>)}
  </>;
}
export function SkyCloud({ position, scale=1, reduced }: { position: Point; scale?: number; reduced: boolean }) {
  const group=useRef<Group>(null);
  useFrame(({clock})=>{if(group.current&&!reduced)group.current.position.x=position[0]+Math.sin(clock.elapsedTime*.12+position[0])*.25;});
  return <group ref={group} position={position} scale={scale}>{[[-.6,0,0],[0,.28,0],[.6,-.04,0],[.15,-.15,.2]].map((p,i)=><mesh key={i} position={p as Point} scale={[1,.72,.7]}><icosahedronGeometry args={[i===1?.8:.65,0]} /><meshStandardMaterial color={i===1?'#fffefd':'#e7f6fa'} flatShading /></mesh>)}</group>;
}
export function StreetLife() {
  return <>
    {[[-5,1.5],[3.5,1.5],[-1.6,-4.6]].map(([x,z],i)=><group key={i} position={[x,.2,z]}><mesh position={[0,.78,0]} castShadow><cylinderGeometry args={[.035,.055,1.56,8]} /><meshStandardMaterial color="#607d7d" /></mesh><Block at={[.13,1.57,0]} size={[.31,.07,.08]} color="#61797a" /><Block at={[.25,1.53,0]} size={[.22,.04,.15]} color="#f5f0b8" /></group>)}
    <group position={[-2.8,.2,2.45]} rotation={[0,Math.PI/2,0]}><RoundedBox args={[.57,.32,1.02]} radius={.09} position={[0,.24,0]} castShadow><meshStandardMaterial color="#5e9ebe" /></RoundedBox><Block at={[0,.49,-.04]} size={[.47,.27,.55]} color="#a5d5df" /><Block at={[0,.64,-.04]} size={[.49,.05,.56]} color="#5899b7" />{[-.29,.29].flatMap(x=>[-.31,.31].map(z=><mesh key={`${x}${z}`} position={[x,.16,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.14,.14,.1,12]} /><meshStandardMaterial color="#34444a" /></mesh>))}</group>
  </>;
}
