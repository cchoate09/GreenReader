/**
 * Putting physics — perspective-based distance estimation with
 * Stimpmeter-aware break and effective-distance calculations.
 */

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Typical phone camera vertical field of view (degrees).
 * Most modern phones have 50-55° vertical FOV in portrait mode.
 */
const CAMERA_FOV_V = 55;

/**
 * Phone height above ground when held at shoulder height (feet).
 * Average shoulder height ≈ 5'2" (5.17 ft).
 */
const PHONE_HEIGHT_FT = 5.17;

/** Default phone tilt angle when sensor isn't available (degrees from flat). */
const DEFAULT_PHONE_TILT = 65;

/** Default Stimpmeter speed — typical well-maintained course. */
export const DEFAULT_STIMP = 9;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert radians (from DeviceMotion) to degrees */
export function toDeg(rad) {
  return rad * DEG;
}

// ── Break ───────────────────────────────────────────────────────────────────

/**
 * Break amount in inches.
 *
 * Uses classic d² relationship between distance and break —
 * break grows with the square of distance because the ball spends
 * more time on the slope AND starts farther from the hole.
 *
 * Coefficient k calibrated so a 1° slope on a 12-ft putt at stimp 9
 * gives about 4" of break (matches empirical green-reading data).
 *
 * Grade factor: downhill putts break MORE (ball is slower through the
 * break zone), uphill putts break LESS (ball has more momentum).
 *
 * Capped at 72 inches (6 ft).
 */
export function calcBreakInches(slopeXDeg, distanceFt, stimpSpeed = DEFAULT_STIMP, slopeYDeg = 0) {
  // Dead zone: ignore slopes under 0.3° — sensor noise floor when phone is flat
  const absSlope = Math.abs(slopeXDeg);
  if (absSlope < 0.3) return 0;

  const k = 0.003 * stimpSpeed;
  const raw = absSlope * distanceFt * distanceFt * k;

  // Grade adjustment: downhill → more break, uphill → less break
  let gradeFactor = 1;
  if (slopeYDeg > 0.5) {
    gradeFactor = 1 + slopeYDeg * 0.08;    // downhill: +8% per degree
  } else if (slopeYDeg < -0.5) {
    gradeFactor = 1 / (1 + Math.abs(slopeYDeg) * 0.08); // uphill: less break
  }

  return Math.min(72, Math.round(raw * gradeFactor));
}

/**
 * Break direction label.
 * slopeX > 0 → right side lower → ball breaks right
 */
export function breakDirection(slopeXDeg) {
  if (slopeXDeg > 0.4) return 'Right';
  if (slopeXDeg < -0.4) return 'Left';
  return null; // straight
}

// ── Speed ───────────────────────────────────────────────────────────────────

/**
 * Speed level 1-5 (slowest → fastest needed).
 * slopeY > 0 → downhill (less effort needed)
 * slopeY < 0 → uphill  (more effort needed)
 */
export function speedLevel(slopeYDeg, distanceFt) {
  let base = Math.ceil(distanceFt / 8); // roughly 1=short, 5=very long
  base = Math.max(1, Math.min(5, base));
  if (slopeYDeg < -1.5) base = Math.min(5, base + 1); // uphill: more power
  if (slopeYDeg > 1.5)  base = Math.max(1, base - 1); // downhill: less
  return base;
}

/**
 * Human-readable speed label + description.
 */
export function speedInfo(slopeYDeg, distanceFt) {
  const level = speedLevel(slopeYDeg, distanceFt);
  const uphill   = slopeYDeg < -1.5;
  const downhill = slopeYDeg > 1.5;

  if (distanceFt <= 4) {
    return { label: 'Tap It', desc: 'Short putt — quiet hands, die at the hole', level };
  }
  if (downhill) {
    return {
      label: level <= 2 ? 'Feather It' : 'Smooth Roll',
      desc: 'Downhill — let gravity do the work',
      level,
    };
  }
  if (uphill) {
    return {
      label: level >= 4 ? 'Give It a Push' : 'Firm Pace',
      desc: 'Uphill — commit through the ball',
      level,
    };
  }

  const labels = ['Easy Roll', 'Smooth Pace', 'Normal Pace', 'Confident Stroke', 'Full Commit'];
  const descs  = [
    'Short putt — die at the hole',
    'Smooth roll, aim 12" past',
    'Normal pace, finish 18" past',
    'Commit to line, 18-24" past',
    'Long lag putt — focus on distance control',
  ];
  return { label: labels[level - 1], desc: descs[level - 1], level };
}

// ── Distance estimation ─────────────────────────────────────────────────────

/**
 * Estimate real-world putt distance (feet) from the hole's normalised Y
 * position on screen (0 = top, 1 = bottom) using perspective projection.
 *
 * Uses the phone's current tilt angle (beta from DeviceMotion, in degrees)
 * to compute where each screen pixel maps to on the ground plane.
 *
 * Geometry:
 *   h  = phone height above ground (shoulder height)
 *   β  = DeviceMotion beta: 0° when flat face-up, increases as phone
 *        tilts forward (top away from user)
 *   φ  = camera angle below horizontal = 90° − β
 *   FOV = camera vertical field of view
 *
 *   For pixel at normalised y (0=top → far, 1=bottom → near):
 *     ray angle below horizontal = φ − FOV/2 + y × FOV
 *     ground distance = h / tan(ray_angle)
 *
 * Tilt correction: users naturally over-tilt the phone when looking
 * down at the ground (tilting ~3° past the optimal angle).  Adding
 * TILT_BIAS_DEG compensates, preventing systematic under-estimation.
 *
 * @param {number} holeYNorm    - 0..1 normalised Y position on screen
 * @param {number} phoneBetaDeg - current phone beta in degrees (from DeviceMotion)
 */
const TILT_BIAS_DEG = 4;

export function estimateDistanceFromScreen(holeYNorm, phoneBetaDeg) {
  // Clamp beta to reasonable range (0-85°) to avoid singularities
  let beta = phoneBetaDeg != null ? Math.abs(phoneBetaDeg) : DEFAULT_PHONE_TILT;
  beta = Math.max(0, Math.min(85, beta));

  // Correct for natural over-tilt: users tilt the phone more than
  // geometrically required, which makes distances read short.
  beta = Math.min(85, beta + TILT_BIAS_DEG);

  const cameraBelowHoriz = 90 - beta;        // degrees below horizontal
  const halfFov = CAMERA_FOV_V / 2;

  // Ray angle below horizontal for the hole's y-position
  const rayAngleDeg = cameraBelowHoriz - halfFov + holeYNorm * CAMERA_FOV_V;

  // If ray is at or above horizontal, the hole is very far away
  if (rayAngleDeg <= 1) return 50;

  const rayAngleRad = rayAngleDeg * RAD;
  const dist = PHONE_HEIGHT_FT / Math.tan(rayAngleRad);

  return Math.max(3, Math.min(50, Math.round(dist)));
}

// ── Effective distance ──────────────────────────────────────────────────────

/**
 * Effective (playing) distance — the flat-green equivalent the golfer
 * should mentally commit to when stroking the putt.
 *
 * Uses a non-linear model that better captures how steep slopes
 * compound their effect. Green speed amplifies the slope impact
 * (fast greens make slopes matter more).
 *
 * slopeY < 0 → uphill   → hit harder (playing dist > actual dist)
 * slopeY > 0 → downhill → hit softer (playing dist < actual dist)
 */
export function effectiveDistance(slopeYDeg, distanceFt, stimpSpeed = DEFAULT_STIMP) {
  const absSlope = Math.abs(slopeYDeg);
  // Scale slope impact with green speed: faster greens amplify slope effect
  const stimpFactor = stimpSpeed / DEFAULT_STIMP;
  // Non-linear: each additional degree of slope has increasing impact
  const slopeImpact = absSlope * 0.10 * (1 + absSlope * 0.06) * stimpFactor;

  let mult;
  if (slopeYDeg < 0) {
    // Uphill: need to hit harder — multiply up
    mult = 1 + slopeImpact;
  } else {
    // Downhill: need to hit softer — multiply down (inverse so it's bounded)
    mult = 1 / (1 + slopeImpact);
  }

  return Math.max(3, Math.round(distanceFt * mult));
}

// ── Aim point ───────────────────────────────────────────────────────────────

/**
 * Aim point: how many inches left or right of the hole centre to start
 * the putt. This is the OPPOSITE of the break direction — if the ball
 * breaks right, aim left of the hole.
 *
 * Dead zone at 0.3° filters out phone sensor noise when lying flat.
 *
 * Returns { inches, dir: 'L'|'R'|null, dirFull, label: string }
 */
export function aimPoint(slopeXDeg, distanceFt, stimpSpeed = DEFAULT_STIMP, slopeYDeg = 0) {
  const inches = calcBreakInches(slopeXDeg, distanceFt, stimpSpeed, slopeYDeg);
  if (inches === 0 || Math.abs(slopeXDeg) <= 0.3) {
    return { inches: 0, dir: null, label: 'Center of hole' };
  }
  // Ball breaks in the direction of slopeX → aim the opposite way
  const dir     = slopeXDeg > 0 ? 'L' : 'R';
  const dirFull = slopeXDeg > 0 ? 'left' : 'right';
  return { inches, dir, dirFull, label: `${inches}" ${dir} of hole` };
}

// ── Grade label ─────────────────────────────────────────────────────────────

/**
 * Grade label for front/back slope.
 */
export function gradeLabel(slopeYDeg) {
  const g = Math.abs(slopeYDeg);
  if (g < 0.8)  return 'Flat';
  if (g < 2.0)  return slopeYDeg > 0 ? '↘ Downhill' : '↗ Uphill';
  return slopeYDeg > 0 ? '⬇ Steep Down' : '⬆ Steep Up';
}

// ── Stimpmeter calibration ──────────────────────────────────────────────────

/**
 * Calculate Stimpmeter reading from a timed roll test.
 *
 * Physics: constant deceleration on flat ground →
 *   d = v₀²/(2a),  t_stop = v₀/a  →  a = 2d/t²
 * Standard Stimpmeter ramp initial velocity ≈ 6.0 ft/s →
 *   S = v₀²/(2a) = 36/(4d/t²) = 9t²/d
 */
export function stimpFromRollTest(timeSec, distanceFt) {
  if (timeSec <= 0.3 || distanceFt <= 1) return DEFAULT_STIMP;
  const stimp = 9 * timeSec * timeSec / distanceFt;
  return Math.max(4, Math.min(15, Math.round(stimp * 2) / 2));
}

// ── Elevation profile ───────────────────────────────────────────────────────

/**
 * Build elevation profile points from slope readings.
 * Returns [{x: 0..1, elevFt}] where x=0 is ball, x=1 is hole.
 *
 * @param {Array<{slopeX, slopeY, pos}>} readings - sorted by pos
 * @param {number} distanceFt
 */
export function elevationPoints(slopeReadings, distanceFt) {
  if (!slopeReadings?.length) return [];

  const sorted = [...slopeReadings].sort((a, b) => a.pos - b.pos);
  const pts = [{ x: 0, elevFt: 0 }];

  for (let i = 0; i < sorted.length; i++) {
    const prevX = i === 0 ? 0 : sorted[i - 1].pos;
    const segDist = (sorted[i].pos - prevX) * distanceFt;
    const prev = pts[pts.length - 1];
    // slopeY > 0 → downhill → elevation drops
    const drop = segDist * Math.tan(sorted[i].slopeY * RAD);
    pts.push({ x: sorted[i].pos, elevFt: prev.elevFt - drop });
  }

  // Extend to hole if last reading isn't at the end
  const lastR = sorted[sorted.length - 1];
  if (lastR.pos < 0.95) {
    const remain = (1 - lastR.pos) * distanceFt;
    const last = pts[pts.length - 1];
    pts.push({ x: 1, elevFt: last.elevFt - remain * Math.tan(lastR.slopeY * RAD) });
  }

  return pts;
}

// ── Compound break (multi-point) ────────────────────────────────────────────

/**
 * Compute total aim point from multiple slope readings.
 * Weights each segment by its distance proportion.
 */
export function compoundAimPoint(slopeReadings, distanceFt, stimpSpeed = DEFAULT_STIMP) {
  if (!slopeReadings?.length) return aimPoint(0, distanceFt, stimpSpeed);
  if (slopeReadings.length === 1) {
    return aimPoint(slopeReadings[0].slopeX, distanceFt, stimpSpeed, slopeReadings[0].slopeY ?? 0);
  }

  const sorted = [...slopeReadings].sort((a, b) => a.pos - b.pos);
  const k = 0.003 * stimpSpeed;
  let totalBreak = 0;

  // Each segment contributes break based on its slope and length
  for (let i = 0; i < sorted.length; i++) {
    const prevPos = i === 0 ? 0 : sorted[i - 1].pos;
    const segLen = (sorted[i].pos - prevPos) * distanceFt;
    // Skip segment if slope is below sensor noise floor
    if (Math.abs(sorted[i].slopeX) < 0.3) continue;
    const segBreak = sorted[i].slopeX * segLen * segLen * k;
    // Grade factor: downhill → more break, uphill → less
    const sy = sorted[i].slopeY ?? 0;
    let gradeFactor = 1;
    if (sy > 0.5) {
      gradeFactor = 1 + sy * 0.08;
    } else if (sy < -0.5) {
      gradeFactor = 1 / (1 + Math.abs(sy) * 0.08);
    }
    // Remaining distance weighting (break accumulates more at end)
    const remainFactor = 1 + (1 - sorted[i].pos);
    totalBreak += segBreak * gradeFactor * remainFactor;
  }

  const inches = Math.min(72, Math.round(Math.abs(totalBreak)));
  if (inches === 0) return { inches: 0, dir: null, label: 'Center of hole' };

  const dir     = totalBreak > 0 ? 'L' : 'R';
  const dirFull = totalBreak > 0 ? 'left' : 'right';
  return { inches, dir, dirFull, label: `${inches}" ${dir} of hole` };
}
