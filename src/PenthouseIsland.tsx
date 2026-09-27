import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Material, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export function usePenthouseIsland(ground: number) {
  // Load with the world so downloading cannot interrupt the rental animation.
  const { scene } = useGLTF('/models/miami-penthouse.glb');
  const island = useMemo(() => {
    const island = clone(scene);
    const bounds = new Box3().setFromObject(island);
    const scale = 17 / bounds.getSize(new Vector3()).x;
    const center = bounds.getCenter(new Vector3());
    island.scale.setScalar(scale);
    // The supplied model's grass plane is at y=0.1.
    island.position.set(-center.x * scale, ground - 0.1 * scale, -center.z * scale);
    const palette = new Map<Material, Material>();
    const previewMaterial = (source: Material) => {
      if (!palette.has(source)) {
        const material = source.clone();
        // Match the supplied preview's palette under the game's linear lighting.
        if (material instanceof MeshStandardMaterial) material.color.convertSRGBToLinear();
        palette.set(source, material);
      }
      return palette.get(source)!;
    };
    island.traverse(child => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = Array.isArray(child.material) ? child.material.map(previewMaterial) : previewMaterial(child.material);
      }
    });
    return island;
  }, [scene, ground]);
  useEffect(() => () => {
    const materials = new Set<Material>();
    island.traverse(child => {
      if (child instanceof Mesh) for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
    });
    materials.forEach(material => material.dispose());
  }, [island]);
  return island;
}
