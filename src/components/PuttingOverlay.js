import React from 'react';
import Svg, {
  Path,
  Line,
  Circle,
  Text as SvgText,
  Rect,
  G,
  Polygon,
} from 'react-native-svg';
import { aimPoint, compoundAimPoint } from '../utils/puttingPhysics';

const GREEN    = 'rgba(76,175,80,0.92)';
const YELLOW   = 'rgba(255,235,59,0.95)';
const LABEL_BG = 'rgba(0,0,0,0.68)';
const ANIM_CLR = 'rgba(255,255,255,0.95)';

// ── Helpers ─────────────────────────────────────────────────────────────────

function Arrowhead({ x, y, angle, size = 12, color }) {
  const tip   = [x, y];
  const left  = [x - size * Math.cos(angle - Math.PI / 5), y - size * Math.sin(angle - Math.PI / 5)];
  const right = [x - size * Math.cos(angle + Math.PI / 5), y - size * Math.sin(angle + Math.PI / 5)];
  return <Polygon points={[...tip, ...left, ...right].join(',')} fill={color} />;
}

function Label({ cx, cy, text, color = '#ffffff' }) {
  const pad  = 8;
  const charW = 7.5;
  const w = text.length * charW + pad * 2;
  const h = 22;
  return (
    <G>
      <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={6} fill={LABEL_BG} />
      <SvgText x={cx} y={cy + 1} fontSize={12} fontWeight="bold" fill={color}
        textAnchor="middle" alignmentBaseline="middle">{text}</SvgText>
    </G>
  );
}

function HoleMarker({ x, y, isUserPlaced }) {
  const opacity = isUserPlaced ? 1 : 0.45;
  return (
    <G>
      <Circle cx={x} cy={y} r={16}
        stroke={`rgba(255,255,255,${opacity})`} strokeWidth={2}
        strokeDasharray={isUserPlaced ? undefined : '4,3'} fill="none" />
      <Circle cx={x} cy={y} r={5}
        fill={`rgba(255,255,255,${isUserPlaced ? 0.5 : 0.2})`} />
      <Line x1={x} y1={y - 16} x2={x} y2={y - 30}
        stroke={`rgba(255,255,255,${opacity})`} strokeWidth={1.5} />
      <Polygon
        points={`${x},${y - 30} ${x + 10},${y - 24} ${x},${y - 18}`}
        fill={isUserPlaced ? '#ff5252' : 'rgba(255,82,82,0.4)'} />
    </G>
  );
}

function PlacingHolePrompt({ W, H }) {
  const boxW = Math.min(W - 32, 320);
  return (
    <G>
      <Rect x={0} y={0} width={W} height={H} fill="rgba(0,0,0,0.2)" />
      <Rect x={W / 2 - boxW / 2} y={H * 0.07} width={boxW} height={52} rx={26} fill="rgba(0,0,0,0.78)" />
      <SvgText x={W / 2} y={H * 0.07 + 19} fontSize={13} fontWeight="bold"
        fill="#ffeb3b" textAnchor="middle" alignmentBaseline="middle">
        Phone at shoulder height, stand at ball
      </SvgText>
      <SvgText x={W / 2} y={H * 0.07 + 38} fontSize={11}
        fill="#90a4ae" textAnchor="middle" alignmentBaseline="middle">
        Tap the hole on screen
      </SvgText>
      {[0.25, 0.5, 0.75].map((frac, i) => {
        const cx = W * frac;
        const cy = H * (0.25 + i * 0.08);
        return (
          <G key={i} opacity={0.3}>
            <Circle cx={cx} cy={cy} r={18} stroke="#ffeb3b" strokeWidth={1.5} fill="none" />
            <Line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="#ffeb3b" strokeWidth={1} />
            <Line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#ffeb3b" strokeWidth={1} />
          </G>
        );
      })}
    </G>
  );
}

// ── Quadratic bezier helpers ────────────────────────────────────────────────

function quadBezierAt(t, p0x, p0y, cpx, cpy, p1x, p1y) {
  const u = 1 - t;
  return {
    x: u * u * p0x + 2 * u * t * cpx + t * t * p1x,
    y: u * u * p0y + 2 * u * t * cpy + t * t * p1y,
  };
}

// ── Main overlay ────────────────────────────────────────────────────────────

/**
 * AR putting overlay.
 *
 * Props:
 *   width, height, slopeX, slopeY, distance, hasSlope
 *   holePos, isUserPlacedHole, isPlacingHole
 *   greenSpeed, slopeReadings, animT (0..1 or null)
 */
export default function PuttingOverlay({
  width: W,
  height: H,
  slopeX,
  slopeY,
  distance,
  hasSlope,
  holePos,
  isUserPlacedHole,
  isPlacingHole,
  greenSpeed,
  slopeReadings,
  animT,
}) {
  const holeX = holePos?.x ?? W * 0.5;
  const holeY = holePos?.y ?? H * 0.18;

  // ── No slope yet ──────────────────────────────────────────────────────────
  if (!hasSlope && !isPlacingHole) {
    const tipW = Math.min(W - 24, 310);
    return (
      <Svg width={W} height={H}>
        <Rect x={W / 2 - tipW / 2} y={H * 0.42} width={tipW} height={64} rx={12} fill={LABEL_BG} />
        <SvgText x={W / 2} y={H * 0.42 + 22} fontSize={13} fill="#90a4ae" textAnchor="middle">
          1. "Read Slope" — lay phone flat on green
        </SvgText>
        <SvgText x={W / 2} y={H * 0.42 + 44} fontSize={12} fill="#616161" textAnchor="middle">
          2. "Find Hole" — shoulder height, tap the hole
        </SvgText>
      </Svg>
    );
  }

  // ── Tap-to-place mode ─────────────────────────────────────────────────────
  if (isPlacingHole) {
    return (
      <Svg width={W} height={H}>
        <PlacingHolePrompt W={W} H={H} />
        {holePos && <HoleMarker x={holeX} y={holeY} isUserPlaced={isUserPlacedHole} />}
      </Svg>
    );
  }

  // ── Full putting overlay ──────────────────────────────────────────────────
  const ballX = W * 0.5;
  const ballY = H * 0.80;
  const hasMulti = slopeReadings && slopeReadings.length > 1;

  // ── Compute curve path and control points ─────────────────────────────────
  let pathD;
  let midLabelX, midLabelY;
  // Store segments for animation interpolation
  let segments = []; // [{p0, cp, p1}]

  if (hasMulti) {
    // Compound curve: one quadratic bezier per segment pair
    const sorted = [...slopeReadings].sort((a, b) => a.pos - b.pos);
    // Build waypoints from readings
    const waypoints = [{ x: ballX, y: ballY, slope: sorted[0].slopeX }];
    for (let i = 0; i < sorted.length; i++) {
      const frac = sorted[i].pos;
      const wx = ballX + (holeX - ballX) * frac;
      const wy = ballY + (holeY - ballY) * frac;
      if (frac > 0 && frac < 1) {
        waypoints.push({ x: wx, y: wy, slope: sorted[i].slopeX });
      }
    }
    waypoints.push({ x: holeX, y: holeY, slope: sorted[sorted.length - 1].slopeX });

    let d = `M ${ballX} ${ballY}`;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp0 = waypoints[i];
      const wp1 = waypoints[i + 1];
      const segDist = distance * ((i + 1) / (waypoints.length - 1));
      const breakPx = (wp0.slope / 45) * W * 0.55 * (segDist / 15);
      const cpx = (wp0.x + wp1.x) / 2 - breakPx * 0.45;
      const cpy = (wp0.y + wp1.y) / 2;
      d += ` Q ${cpx} ${cpy} ${wp1.x} ${wp1.y}`;
      segments.push({
        p0: { x: wp0.x, y: wp0.y },
        cp: { x: cpx, y: cpy },
        p1: { x: wp1.x, y: wp1.y },
      });
    }
    pathD = d;

    // Label at first segment midpoint
    const firstSeg = segments[0];
    const mid = quadBezierAt(0.5, firstSeg.p0.x, firstSeg.p0.y, firstSeg.cp.x, firstSeg.cp.y, firstSeg.p1.x, firstSeg.p1.y);
    midLabelX = mid.x;
    midLabelY = mid.y;
  } else {
    // Single curve (original behavior)
    const breakPx = (slopeX / 45) * W * 0.55 * (distance / 15);
    const ctrlX   = (ballX + holeX) / 2 - breakPx * 0.45;
    const ctrlY   = (ballY + holeY) / 2;
    pathD = `M ${ballX} ${ballY} Q ${ctrlX} ${ctrlY} ${holeX} ${holeY}`;
    segments = [{ p0: { x: ballX, y: ballY }, cp: { x: ctrlX, y: ctrlY }, p1: { x: holeX, y: holeY } }];
    midLabelX = 0.25 * ballX + 0.5 * ctrlX + 0.25 * holeX;
    midLabelY = 0.25 * ballY + 0.5 * ctrlY + 0.25 * holeY;
  }

  // Aim line
  const breakPxAim = (slopeX / 45) * W * 0.55 * (distance / 15);
  const aimEndX  = ballX - breakPxAim * 0.38;
  const aimEndY  = ballY - H * 0.12;
  const aimAngle = Math.atan2(aimEndY - ballY, aimEndX - ballX);

  // Aim point label
  const aim = hasMulti
    ? compoundAimPoint(slopeReadings, distance, greenSpeed)
    : aimPoint(slopeX, distance, greenSpeed, slopeY);

  // ── Animation ball position ───────────────────────────────────────────────
  let animBall = null;
  if (animT != null && animT >= 0 && animT <= 1 && segments.length > 0) {
    // Map animT across all segments evenly
    const totalSegs = segments.length;
    const segIdx = Math.min(Math.floor(animT * totalSegs), totalSegs - 1);
    const segT = (animT * totalSegs) - segIdx;
    const seg = segments[segIdx];
    animBall = quadBezierAt(
      Math.min(1, segT),
      seg.p0.x, seg.p0.y,
      seg.cp.x, seg.cp.y,
      seg.p1.x, seg.p1.y,
    );
  }

  const isPreview = animT != null;

  return (
    <Svg width={W} height={H}>
      {/* Straight line to hole (visible during preview for comparison) */}
      {isPreview && (
        <Line x1={ballX} y1={ballY} x2={holeX} y2={holeY}
          stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="6,6" />
      )}

      {/* Putting line (projected curve) */}
      <Path d={pathD} stroke={GREEN} strokeWidth={3.5} strokeDasharray="14,7" fill="none" />

      {/* Aim line */}
      {!isPreview && (
        <G>
          <Line x1={ballX} y1={ballY} x2={aimEndX} y2={aimEndY} stroke={YELLOW} strokeWidth={3.5} />
          <Arrowhead x={aimEndX} y={aimEndY} angle={aimAngle} size={12} color={YELLOW} />
        </G>
      )}

      {/* Ball */}
      <Circle cx={ballX} cy={ballY} r={11} fill="white" />
      <Circle cx={ballX} cy={ballY} r={11} stroke="#4caf50" strokeWidth={2.5} fill="none" />

      {/* Hole */}
      <HoleMarker x={holeX} y={holeY} isUserPlaced={isUserPlacedHole} />

      {/* Labels (hidden during preview for cleaner view) */}
      {!isPreview && (
        <G>
          {/* AIM HERE label */}
          <Label cx={(ballX + aimEndX) * 0.5 + 4} cy={(ballY + aimEndY) * 0.5 - 6}
            text="AIM HERE" color="#ffeb3b" />

          {/* Aim-point label mid-curve */}
          {aim.dir
            ? <Label cx={midLabelX} cy={midLabelY} text={aim.label} color="#4caf50" />
            : <Label cx={midLabelX} cy={midLabelY} text="Straight" color="#90caf9" />}

          {/* Multi-point indicator */}
          {hasMulti && (
            <Label cx={W * 0.5} cy={H * 0.12} text={`${slopeReadings.length}-pt read`} color="#ff9800" />
          )}

          {/* Nudge to set hole */}
          {!isUserPlacedHole && (
            <Label cx={holeX} cy={holeY + 38} text="Tap to place hole ↑" color="#ffeb3b" />
          )}
        </G>
      )}

      {/* Preview: minimal labels */}
      {isPreview && (
        <G>
          {aim.dir && <Label cx={midLabelX} cy={midLabelY} text={aim.label} color="#4caf50" />}
        </G>
      )}

      {/* Animated preview ball */}
      {animBall && (
        <G>
          <Circle cx={animBall.x} cy={animBall.y} r={8} fill={ANIM_CLR} />
          <Circle cx={animBall.x} cy={animBall.y} r={12}
            stroke={ANIM_CLR} strokeWidth={1.5} fill="none" opacity={0.4} />
        </G>
      )}
    </Svg>
  );
}
