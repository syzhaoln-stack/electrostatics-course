// Angles follow the memoir's opposed rotations: top = -beta, bottom = +alpha.
// Uniform circular wire, elastic torsion. These are explanatory models, not
// additional readings attributed to Coulomb.
export function torsionState({alpha=0,beta=0}={}) {
  alpha=Number.isFinite(Number(alpha))?Number(alpha):0;
  beta=Number.isFinite(Number(beta))?Number(beta):0;
  return {top:-beta,bottom:alpha,twist:alpha+beta};
}
export function sectionAngle(fractionFromBottom,state={}) {
  const s=torsionState(state),u=Math.max(0,Math.min(1,Number(fractionFromBottom)||0));
  return s.bottom+(s.top-s.bottom)*u;
}
export function relativeCompliance({length=1,diameter=1,shearModulus=1}={}) {
  if(!(length>0&&diameter>0&&shearModulus>0))throw new RangeError('Wire dimensions and shear modulus must be positive.');
  return length/(shearModulus*diameter**4);
}
