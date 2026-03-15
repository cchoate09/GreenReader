function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getReadingSensorScore(reading) {
  const gammaStd = Math.max(0, reading?.gammaStd ?? 0);
  const betaStd = Math.max(0, reading?.betaStd ?? 0);
  return clamp(100 - ((gammaStd + betaStd) * 60), 0, 100);
}

export function getAverageSensorScore(readings = []) {
  if (!readings.length) return null;
  const total = readings.reduce((sum, reading) => sum + getReadingSensorScore(reading), 0);
  return Math.round(total / readings.length);
}

export function getHoleScore(hole) {
  if (!hole || hole.status !== 'confirmed') return null;
  return hole.source === 'manual' ? 90 : 75;
}

export function getReadQuality({ hasSlope, readings, hole }) {
  if (!hasSlope && hole?.status !== 'confirmed') {
    return { score: 0, level: 'incomplete', label: 'Need slope + hole' };
  }

  if (!hasSlope || !readings?.length) {
    return { score: 0, level: 'incomplete', label: 'Capture slope' };
  }

  const holeScore = getHoleScore(hole);
  if (holeScore == null) {
    return { score: 0, level: 'incomplete', label: 'Confirm hole' };
  }

  const sensorScore = getAverageSensorScore(readings);
  const overallScore = Math.round((sensorScore * 0.7) + (holeScore * 0.3));

  if (overallScore >= 80) {
    return { score: overallScore, level: 'high', label: 'High confidence' };
  }

  if (overallScore >= 60) {
    return { score: overallScore, level: 'medium', label: 'Good confidence' };
  }

  return { score: overallScore, level: 'low', label: 'Low confidence' };
}

export function getReadQualityGuidance(readQuality) {
  switch (readQuality?.level) {
    case 'high':
      return 'Stable read. Trust it, then confirm with your eyes.';
    case 'medium':
      return 'Pretty solid. If the green is tricky, take one more read.';
    case 'low':
      return 'Phone movement was noisy. Set it down again and re-read.';
    case 'incomplete':
    default:
      return 'Capture slope and confirm the hole to finish the read.';
  }
}
