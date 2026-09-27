import { RoundedBox } from '@react-three/drei';

type Point = [number, number, number];
function Block({ at, size, color, rotation = [0, 0, 0] }: { at: Point; size: Point; color: string; rotation?: Point }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>;
}
export function CityBlocks() {
  return <>
    <RoundedBox args={[17.4, .35, 14.6]} radius={.12} smoothness={2} position={[0,-.13,0]} receiveShadow castShadow><meshStandardMaterial color="#858f9f" /></RoundedBox>
    <Block at={[0,.055,0]} size={[17.2,.04,14.4]} color="#535c6e" />
    {[-5.6,0,5.6].flatMap(x => [-4.8,0,4.8].map(z => <group key={`${x}-${z}`}>
      <Block at={[x,.115,z]} size={[4.15,.12,3.35]} color="#bcc5d5" />
      {x === 5.6 && z === 4.8 && <><Block at={[x,.18,z]} size={[3.8,.025,3]} color="#63c694" /><Block at={[x,.2,z]} size={[.65,.025,3]} color="#d0d5db" /><Block at={[x,.2,z]} size={[3.8,.025,.5]} color="#d0d5db" /></>}
    </group>))}
    {/* Two continuous cross streets with clear, uncluttered lane markings. */}
    {[-2.4,2.4].flatMap(z => Array.from({length:22},(_,i) => {const x=-8+i*.76; return Math.abs(Math.abs(x)-2.8)>.85 ? <Block key={`${z}-${i}`} at={[x,.085,z]} size={[.35,.012,.035]} color="#aeb8cc" /> : null; }))}
    {[-2.8,2.8].flatMap(x => Array.from({length:19},(_,i) => {const z=-6.8+i*.75; return Math.abs(Math.abs(z)-2.4)>.8 ? <Block key={`${x}-${i}`} at={[x,.085,z]} size={[.035,.012,.35]} color="#aeb8cc" /> : null; }))}
    {[-2.8,2.8].flatMap(x => [-2.4,2.4].map(z => <group key={`${x}-${z}`}>
      {[-1,1].flatMap(side => Array.from({length:6},(_,i) => <Block key={`${side}-${i}`} at={[x-.5+i*.2,.09,z+side*.68]} size={[.1,.015,.3]} color="#dce1eb" />))}
    </group>))}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.34,0]} receiveShadow><planeGeometry args={[200,200]} /><meshStandardMaterial color="#dce4e8" roughness={1} /></mesh>
  </>;
}
export function Tree({ position, size=1, variant=0 }: { position: Point; size?: number; variant?: number }) {
  return <group position={position} scale={size}><mesh position={[0,.35,0]} castShadow><cylinderGeometry args={[.055,.08,.7,5]} /><meshStandardMaterial color="#9c7e6b" /></mesh><mesh position={[0,.98,0]} scale={[.65,1.35,.65]} castShadow><icosahedronGeometry args={[.48,1]} /><meshStandardMaterial color={['#45b98d','#60c99b','#42aa8a'][variant%3]} flatShading /></mesh></group>;
}
export function StreetLife() {
  return <>
    {[[-4.2,1.6],[4.2,1.6],[-1.5,-3.3],[7,3.4]].map(([x,z],i)=><group key={i} position={[x,.18,z]}><mesh position={[0,.7,0]} castShadow><cylinderGeometry args={[.025,.045,1.4,6]} /><meshStandardMaterial color="#8190a4" /></mesh><Block at={[.12,1.4,0]} size={[.3,.055,.08]} color="#9faabc" /><Block at={[.23,1.36,0]} size={[.18,.035,.12]} color="#fff4d3" /></group>)}
    {[[-5,.12,2.65],[2.55,.12,-.7]].map((p,i)=><group key={i} position={p as Point} rotation={[0,i===0?Math.PI/2:0,0]}><RoundedBox args={[.48,.24,.9]} radius={.055} position={[0,.2,0]} castShadow><meshStandardMaterial color={i===0?'#e6bd73':'#80a8c9'} /></RoundedBox><Block at={[0,.39,-.04]} size={[.41,.2,.46]} color="#b7d9ed" /><Block at={[0,.5,-.04]} size={[.43,.035,.47]} color={i===0?'#e8cb98':'#81aacb'} />{[-.25,.25].flatMap(x=>[-.27,.27].map(z=><mesh key={`${x}${z}`} position={[x,.13,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.11,.11,.075,8]} /><meshStandardMaterial color="#374151" /></mesh>))}</group>)}
  </>;
}
