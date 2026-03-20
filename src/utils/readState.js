function getReadModeLabelFromReadings(readings) {
  return (readings?.length ?? 0) > 1 ? 'Advanced read' : 'Quick read';
}

function getHoleStateLabel(hole) {
  if (!hole) return 'Hole not set';

  if (hole.status === 'confirmed') {
    return hole.source === 'auto' ? 'Auto hole confirmed' : 'Manual hole confirmed';
  }

  if (hole.status === 'autoDetected') return 'Auto hole candidate';
  if (hole.status === 'placing') return 'Manual placement';
  return 'Hole not set';
}

export function getReadState({ slope, hole, ui }) {
  const modeLabel = getReadModeLabelFromReadings(slope?.readings);
  const holeLabel = getHoleStateLabel(hole);

  if (ui?.isPreviewMode) {
    return {
      tone: 'preview',
      title: 'Previewing latest read',
      meta: `${modeLabel} · ${holeLabel}`,
      detail: 'Close Preview to adjust distance or capture a fresher read.',
    };
  }

  if (ui?.isScanning) {
    return {
      tone: 'working',
      title: 'Scanning for hole',
      meta: 'Auto detect in progress',
      detail: 'Hold steady while GreenReader looks for the cup.',
    };
  }

  if (ui?.isStimpCalibrating) {
    return {
      tone: 'working',
      title: 'Calibrating green speed',
      meta: 'Stimp test active',
      detail: 'Finish the roll test to update green speed.',
    };
  }

  if (hole?.status === 'autoDetected') {
    return {
      tone: 'attention',
      title: 'Confirm detected hole',
      meta: 'Auto hole candidate',
      detail: 'Use Detected to lock the cup, or Adjust to place it manually.',
    };
  }

  if (hole?.status === 'placing') {
    return {
      tone: 'attention',
      title: 'Set the hole',
      meta: 'Manual placement active',
      detail: 'Tap the hole on screen, or run Auto Detect.',
    };
  }

  if (slope?.hasSlope && hole?.status === 'confirmed') {
    return {
      tone: 'ready',
      title: 'Read ready',
      meta: `${modeLabel} · ${holeLabel}`,
      detail: 'Aim / Play As are live. Preview the line or capture a fresh read.',
    };
  }

  if (slope?.hasSlope) {
    return {
      tone: 'partial',
      title: 'Slope captured',
      meta: modeLabel,
      detail: 'Set the hole to finish this read.',
    };
  }

  if (hole?.status === 'confirmed') {
    return {
      tone: 'partial',
      title: 'Hole locked',
      meta: holeLabel,
      detail: 'Capture slope near the ball to finish this read.',
    };
  }

  return {
    tone: 'idle',
    title: 'Start quick read',
    meta: 'Quick read',
    detail: 'Capture slope near the ball, then set the hole.',
  };
}

export function getReadStateColor(tone) {
  if (tone === 'ready') return '#4caf50';
  if (tone === 'preview') return '#64b5f6';
  if (tone === 'attention') return '#ffb300';
  if (tone === 'working') return '#29b6f6';
  if (tone === 'partial') return '#ffd54f';
  return '#90a4ae';
}
