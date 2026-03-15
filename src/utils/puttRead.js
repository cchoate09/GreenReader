import {
  aimPoint,
  compoundAimPoint,
  effectiveDistance,
  grainEffect,
} from './puttingPhysics';

function signedAimInches(aim) {
  if (!aim?.dir) return 0;
  return aim.dir === 'L' ? aim.inches : -aim.inches;
}

export function applyGrainToAim(aim, grain) {
  if (!aim) return null;

  const adjustedSignedAim = signedAimInches(aim) * grain.breakMult + grain.lateralInches;
  const rounded = Math.round(adjustedSignedAim);

  if (rounded === 0) {
    return { inches: 0, dir: null, label: 'Center of hole' };
  }

  const dir = rounded > 0 ? 'L' : 'R';
  const dirFull = rounded > 0 ? 'left' : 'right';
  const inches = Math.abs(rounded);

  return { inches, dir, dirFull, label: `${inches}" ${dir} of hole` };
}

export function getReadOutcome({
  hasSlope,
  slopeX,
  slopeY,
  distance,
  greenSpeed,
  slopeReadings,
  grainDir = 'none',
}) {
  const grain = grainEffect(grainDir, distance);

  if (!hasSlope) {
    return { hasMulti: false, grain, aim: null, rawAim: null, playDist: null, rawPlayDist: null };
  }

  const hasMulti = slopeReadings?.length > 1;
  const rawAim = hasMulti
    ? compoundAimPoint(slopeReadings, distance, greenSpeed)
    : aimPoint(slopeX, distance, greenSpeed, slopeY);

  const rawPlayDist = effectiveDistance(slopeY, distance, greenSpeed);

  return {
    hasMulti,
    grain,
    rawAim,
    aim: applyGrainToAim(rawAim, grain),
    rawPlayDist,
    playDist: Math.max(3, Math.round(rawPlayDist * grain.speedMult)),
  };
}
