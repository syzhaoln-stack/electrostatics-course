import { fieldAt } from './physics.js';

/**
 * A fixed sampling lattice, not moving tracers. Positions are in mm and
 * fieldAt returns V/m. Samples use XZ, XY, a supplied observation plane, or a
 * sparse Cartesian volume. Arrows show full E, not a projection onto the plane.
 * Length and colour use a fixed, monotone compression, never per-frame maxima.
 */
export function buildVectorLattice(scene, THREE, getSources, { plane = 'xz', step = 0.28, getFrame = null, light = false, nearSources = false } = {}) {
  if (!['xz','xy','volume'].includes(plane)) throw new Error('Invalid vector sampling mode');
  if (!(step > 0 && step <= 2)) throw new Error('Invalid lattice spacing');
  const nx = Math.floor(12 / step) + 1;
  const ny = Math.floor(8 / step) + 1;
  const nz = plane === 'volume' ? 3 : 1;
  const samples = [];
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const horizontal = (x - (nx - 1) / 2) * step;
      const transverse = (y - (ny - 1) / 2) * step;
      samples.push({local:plane === 'xz' ? [horizontal, 0, transverse] : [horizontal, transverse, (z-(nz-1)/2)*1.5],source:null});
    }
  }
  // A symmetric 3 × 3 × 3 refinement around each source makes the near field
  // legible without filling the whole volume with densely overlapping glyphs.
  // These are sample locations, not particles; all glyphs show the TOTAL E.
  if (nearSources && plane === 'volume') getSources().forEach((_, source) => {
    for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++) {
      if(x===0&&y===0&&z===0)continue;
      samples.push({local:[x*.48,y*.48,z*.48],source});
    }
  });
  const count = samples.length;

  const group = new THREE.Group();
  group.name = `fixed-${plane}-vector-lattice`;
  scene.layer('field-vectors').add(group);

  // Two draw calls for the entire lattice, with no per-arrow scene objects.
  const shaftGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 5);
  const headGeometry = new THREE.ConeGeometry(1, 1, 7);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: light ? .86 : .92,
    depthWrite: false,
    toneMapped: false,
  });
  const shafts = new THREE.InstancedMesh(shaftGeometry, material, count);
  const heads = new THREE.InstancedMesh(headGeometry, material, count);
  for (const mesh of [shafts, heads]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // The source can move; a static first-frame bounding sphere is unsuitable.
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  const dummy = new THREE.Object3D();
  const direction = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const background = new THREE.Color(light ? '#fcfbf7' : '#07111d');
  const weak = new THREE.Color(light ? '#8aa8a2' : '#21617e');
  const strong = new THREE.Color(light ? '#206b72' : '#83e8ff');
  const colour = new THREE.Color();
  let disposed = false;

  function hide(index, point) {
    dummy.position.set(...point);
    dummy.quaternion.identity();
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    shafts.setMatrixAt(index, dummy.matrix);
    heads.setMatrixAt(index, dummy.matrix);
    shafts.setColorAt(index, background);
    heads.setColorAt(index, background);
  }

  function update() {
    if (disposed) return;
    const sources = getSources();
    const frame = getFrame?.();
    for (let index = 0; index < count; index++) {
      const sample = samples[index],local = sample.local;
      const point = sample.source !== null ? sources[sample.source].pos.map((v,i)=>v+local[i]) : frame ? frame.origin.map((v,i)=>v+local[0]*frame.u[i]+local[1]*frame.v[i]) : local;
      const { E } = fieldAt(point, sources);
      const magnitude = Math.hypot(...E);
      const insideSource = sources.some(source => Math.abs(source.Q) > 0 &&
        Math.hypot(point[0] - source.pos[0], point[1] - source.pos[1], point[2] - source.pos[2]) <
          (source.radius ?? 0.22) + 0.035);
      const redundant = nearSources && plane === 'volume' && sample.source === null && sources.some(source=>Math.abs(source.Q)>0&&Math.hypot(...point.map((v,i)=>v-source.pos[i]))<.78);
      const inactiveRefinement = sample.source !== null && Math.abs(sources[sample.source].Q)<1e-8;
      if (!Number.isFinite(magnitude) || magnitude < 1e-7 || insideSource || redundant || inactiveRefinement) {
        hide(index, point);
        continue;
      }

      // 300 V/m is a display scale, not a physical threshold. The same E has
      // the same appearance across source presets and charge-strength changes.
      const strength = magnitude / (magnitude + 300);
      const emphasis = Math.sqrt(strength);
      const refined=sample.source!==null;
      const length = refined ? .055+.20*emphasis : (plane === 'volume' ? .09 : .06) + (plane === 'volume' ? .32 : .30) * emphasis;
      const headLength = length * .25;
      const shaftLength = length - headLength;
      direction.set(E[0] / magnitude, E[1] / magnitude, E[2] / magnitude);
      dummy.quaternion.setFromUnitVectors(yAxis, direction);

      dummy.position.set(
        point[0] + direction.x * shaftLength / 2,
        point[1] + direction.y * shaftLength / 2,
        point[2] + direction.z * shaftLength / 2,
      );
      const shaftWidth = light ? .010+.003*emphasis : .010+.005*emphasis;
      dummy.scale.set(shaftWidth, shaftLength, shaftWidth);
      dummy.updateMatrix();
      shafts.setMatrixAt(index, dummy.matrix);

      dummy.position.set(
        point[0] + direction.x * (length - headLength / 2),
        point[1] + direction.y * (length - headLength / 2),
        point[2] + direction.z * (length - headLength / 2),
      );
      const headRadius = (light ? .015 : .015) + .012 * emphasis;
      dummy.scale.set(headRadius, headLength, headRadius);
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);

      colour.copy(weak).lerp(strong, strength);
      // At near-zero fields, colour approaches the actual dark background.
      // Weak arrows recede instead of competing with the selected-point arrow.
      colour.lerp(background, light ? .20*(1-emphasis) : 1 - Math.min(1, emphasis * 1.8));
      if (plane === 'volume' && !light) colour.multiplyScalar(.58);
      shafts.setColorAt(index, colour);
      heads.setColorAt(index, colour);
    }
    for (const mesh of [shafts, heads]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor.needsUpdate = true;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    shafts.dispose();
    heads.dispose();
    shaftGeometry.dispose();
    headGeometry.dispose();
    material.dispose();
    group.clear();
  }

  update();
  return { update, dispose, group, count, plane };
}
