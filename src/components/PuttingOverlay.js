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
import { grainEffect } from '../utils/puttingPhysics';
import { getReadOutcome } from '../utils/puttRead';

const GREEN = 'rgba(76,175,80,0.92)';
const YELLOW = 'rgba(255,235,59,0.95)';
const LABEL_BG = 'rgba(0,0,0,0.68)';
const ANIM_CLR = 'rgba(255,255,255,0.95)';

function Arrowhead({ x, y, angle, size = 12, color }) {
  const tip = [x, y];
  const left = [x - size * Math.cos(angle - Math.PI / 5), y - size * Math.sin(angle - Math.PI / 5)];
  const right = [x - size * Math.cos(angle + Math.PI / 5), y - size * Math.sin(angle + Math.PI / 5)];
  return <Polygon points={[...tip, ...left, ...right].join(',')} fill={color} />;
}

function Label({ cx, cy, text, color = '#ffffff' }) {
  const pad = 8;
  const charW = 7.4;
  const w = text.length * charW + pad * 2;
  const h = 22;

  return (
    <G>
      <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={6} fill={LABEL_BG} />
      <SvgText
        x={cx}
        y={cy + 1}
        fontSize={12}
        fontWeight="bold"
        fill={color}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {text}
      </SvgText>
    </G>
  );
}

function HoleMarker({ x, y, hole }) {
  const isPreview = hole.status === 'autoDetected';
  const isAuto = hole.source === 'auto' || isPreview;
  const opacity = isPreview ? 0.6 : 1;
  const stroke = `rgba(255,255,255,${opacity})`;
  const fill = isPreview ? 'rgba(255,255,255,0.18)' : `rgba(255,255,255,${isAuto ? 0.35 : 0.5})`;

  return (
    <G>
      <Circle
        cx={x}
        cy={y}
        r={16}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={isAuto ? '4,3' : undefined}
        fill="none"
      />
      <Circle cx={x} cy={y} r={5} fill={fill} />
      <Line x1={x} y1={y - 16} x2={x} y2={y - 30} stroke={stroke} strokeWidth={1.5} />
      <Polygon
        points={`${x},${y - 30} ${x + 10},${y - 24} ${x},${y - 18}`}
        fill={isPreview ? 'rgba(255,82,82,0.45)' : isAuto ? '#ff8a65' : '#ff5252'}
      />
    </G>
  );
}

function PlacingHolePrompt({ width, height, title, subtitle }) {
  const boxW = Math.min(width - 32, 340);

  return (
    <G>
      <Rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.18)" />
      <Rect
        x={width / 2 - boxW / 2}
        y={height * 0.07}
        width={boxW}
        height={56}
        rx={28}
        fill="rgba(0,0,0,0.78)"
      />
      <SvgText
        x={width / 2}
        y={height * 0.07 + 19}
        fontSize={13}
        fontWeight="bold"
        fill="#ffeb3b"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {title}
      </SvgText>
      <SvgText
        x={width / 2}
        y={height * 0.07 + 38}
        fontSize={11}
        fill="#90a4ae"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {subtitle}
      </SvgText>
      {[0.25, 0.5, 0.75].map((frac, index) => {
        const cx = width * frac;
        const cy = height * (0.25 + index * 0.08);
        return (
          <G key={index} opacity={0.3}>
            <Circle cx={cx} cy={cy} r={18} stroke="#ffeb3b" strokeWidth={1.5} fill="none" />
            <Line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="#ffeb3b" strokeWidth={1} />
            <Line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#ffeb3b" strokeWidth={1} />
          </G>
        );
      })}
    </G>
  );
}

function quadBezierAt(t, p0x, p0y, cpx, cpy, p1x, p1y) {
  const u = 1 - t;
  return {
    x: (u * u * p0x) + (2 * u * t * cpx) + (t * t * p1x),
    y: (u * u * p0y) + (2 * u * t * cpy) + (t * t * p1y),
  };
}

function qualityColor(level) {
  if (level === 'high') return '#4caf50';
  if (level === 'medium') return '#ffb300';
  if (level === 'low') return '#ff7043';
  return '#90a4ae';
}

export default function PuttingOverlay({
  width: W,
  height: H,
  slopeX,
  slopeY,
  distance,
  hasSlope,
  hole,
  greenSpeed,
  slopeReadings,
  animT,
  grainDir = 'none',
  readQuality,
}) {
  const holeX = hole.position?.x ?? W * 0.5;
  const holeY = hole.position?.y ?? H * 0.18;
  const ballX = W * 0.5;
  const ballY = H * 0.8;
  const placementMode = hole.status === 'placing';
  const detectedMode = hole.status === 'autoDetected';
  const confirmedHole = hole.status === 'confirmed';
  const showProjectedLine = hasSlope && confirmedHole;

  if (!hasSlope && hole.status === 'unset') {
    const tipW = Math.min(W - 24, 320);
    return (
      <Svg width={W} height={H}>
        <Rect x={W / 2 - tipW / 2} y={H * 0.42} width={tipW} height={74} rx={12} fill={LABEL_BG} />
        <SvgText x={W / 2} y={H * 0.42 + 22} fontSize={13} fill="#90a4ae" textAnchor="middle">
          Practice mode quick read
        </SvgText>
        <SvgText x={W / 2} y={H * 0.42 + 44} fontSize={12} fill="#ffffff" textAnchor="middle">
          1. Read Slope near the ball
        </SvgText>
        <SvgText x={W / 2} y={H * 0.42 + 62} fontSize={12} fill="#ffffff" textAnchor="middle">
          2. Set Hole and review Aim / Play As
        </SvgText>
      </Svg>
    );
  }

  if (placementMode) {
    return (
      <Svg width={W} height={H}>
        <PlacingHolePrompt
          width={W}
          height={H}
          title="Practice aid: set the hole"
          subtitle="Stand at the ball, then tap the hole on screen"
        />
        {hole.position && <HoleMarker x={holeX} y={holeY} hole={hole} />}
        <Circle cx={ballX} cy={ballY} r={11} fill="white" />
        <Circle cx={ballX} cy={ballY} r={11} stroke="#4caf50" strokeWidth={2.5} fill="none" />
      </Svg>
    );
  }

  const readOutcome = getReadOutcome({
    hasSlope,
    slopeX,
    slopeY,
    distance,
    greenSpeed,
    slopeReadings,
    grainDir,
  });
  const grain = grainEffect(grainDir, distance);

  let pathD = null;
  let midLabelX = null;
  let midLabelY = null;
  let segments = [];

  if (showProjectedLine) {
    const hasMulti = slopeReadings && slopeReadings.length > 1;
    const grainLateralPx = grain.lateralInches * 2;

    if (hasMulti) {
      const sorted = [...slopeReadings].sort((a, b) => a.pos - b.pos);
      const waypoints = [{ x: ballX, y: ballY, slope: sorted[0].slopeX }];

      for (let index = 0; index < sorted.length; index += 1) {
        const frac = sorted[index].pos;
        const wx = ballX + ((holeX - ballX) * frac);
        const wy = ballY + ((holeY - ballY) * frac);
        if (frac > 0 && frac < 1) {
          waypoints.push({ x: wx, y: wy, slope: sorted[index].slopeX });
        }
      }

      waypoints.push({ x: holeX, y: holeY, slope: sorted[sorted.length - 1].slopeX });

      let d = `M ${ballX} ${ballY}`;

      for (let index = 0; index < waypoints.length - 1; index += 1) {
        const wp0 = waypoints[index];
        const wp1 = waypoints[index + 1];
        const segDist = distance * ((index + 1) / (waypoints.length - 1));
        const breakPx = (wp0.slope / 45) * W * 0.55 * (segDist / 15) * grain.breakMult;
        const cpx = ((wp0.x + wp1.x) / 2) - (breakPx * 0.45) + (grainLateralPx * 0.3);
        const cpy = (wp0.y + wp1.y) / 2;

        d += ` Q ${cpx} ${cpy} ${wp1.x} ${wp1.y}`;
        segments.push({
          p0: { x: wp0.x, y: wp0.y },
          cp: { x: cpx, y: cpy },
          p1: { x: wp1.x, y: wp1.y },
        });
      }

      pathD = d;
      const firstSeg = segments[0];
      const mid = quadBezierAt(0.5, firstSeg.p0.x, firstSeg.p0.y, firstSeg.cp.x, firstSeg.cp.y, firstSeg.p1.x, firstSeg.p1.y);
      midLabelX = mid.x;
      midLabelY = mid.y;
    } else {
      const breakPx = (slopeX / 45) * W * 0.55 * (distance / 15) * grain.breakMult;
      const ctrlX = ((ballX + holeX) / 2) - (breakPx * 0.45) + (grainLateralPx * 0.3);
      const ctrlY = (ballY + holeY) / 2;

      pathD = `M ${ballX} ${ballY} Q ${ctrlX} ${ctrlY} ${holeX} ${holeY}`;
      segments = [{ p0: { x: ballX, y: ballY }, cp: { x: ctrlX, y: ctrlY }, p1: { x: holeX, y: holeY } }];
      midLabelX = (0.25 * ballX) + (0.5 * ctrlX) + (0.25 * holeX);
      midLabelY = (0.25 * ballY) + (0.5 * ctrlY) + (0.25 * holeY);
    }
  }

  const breakPxAim = (slopeX / 45) * W * 0.55 * (distance / 15);
  const aimEndX = ballX - (breakPxAim * 0.38);
  const aimEndY = ballY - (H * 0.12);
  const aimAngle = Math.atan2(aimEndY - ballY, aimEndX - ballX);

  let animBall = null;
  if (animT != null && animT >= 0 && animT <= 1 && segments.length > 0) {
    const totalSegs = segments.length;
    const segIdx = Math.min(Math.floor(animT * totalSegs), totalSegs - 1);
    const segT = (animT * totalSegs) - segIdx;
    const seg = segments[segIdx];
    animBall = quadBezierAt(
      Math.min(1, segT),
      seg.p0.x,
      seg.p0.y,
      seg.cp.x,
      seg.cp.y,
      seg.p1.x,
      seg.p1.y,
    );
  }

  const isPreview = animT != null;

  return (
    <Svg width={W} height={H}>
      {showProjectedLine && isPreview && (
        <Line
          x1={ballX}
          y1={ballY}
          x2={holeX}
          y2={holeY}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1.5}
          strokeDasharray="6,6"
        />
      )}

      {showProjectedLine && pathD && (
        <>
          <Path d={pathD} stroke={GREEN} strokeWidth={3} fill="none" opacity={0.85} />
          <Path d={pathD} stroke="rgba(255,255,255,0.25)" strokeWidth={1} fill="none" />
        </>
      )}

      {showProjectedLine && !isPreview && (
        <G>
          <Line x1={ballX} y1={ballY} x2={aimEndX} y2={aimEndY} stroke={YELLOW} strokeWidth={3.5} />
          <Arrowhead x={aimEndX} y={aimEndY} angle={aimAngle} size={12} color={YELLOW} />
        </G>
      )}

      <Circle cx={ballX} cy={ballY} r={11} fill="white" />
      <Circle cx={ballX} cy={ballY} r={11} stroke="#4caf50" strokeWidth={2.5} fill="none" />

      {hole.position && <HoleMarker x={holeX} y={holeY} hole={hole} />}

      {!isPreview && showProjectedLine && (
        <G>
          <Label cx={(ballX + aimEndX) * 0.5 + 4} cy={(ballY + aimEndY) * 0.5 - 6} text="AIM HERE" color="#ffeb3b" />
          <Label
            cx={midLabelX}
            cy={midLabelY}
            text={readOutcome.aim?.dir ? readOutcome.aim.label : 'Straight'}
            color={readOutcome.aim?.dir ? '#4caf50' : '#90caf9'}
          />
          <Label
            cx={W * 0.5}
            cy={H * 0.12}
            text={`${readQuality.label}${readQuality.score ? ` ${readQuality.score}` : ''}`}
            color={qualityColor(readQuality.level)}
          />
        </G>
      )}

      {!isPreview && detectedMode && (
        <Label cx={holeX} cy={holeY + 38} text="Detected hole" color="#ffeb3b" />
      )}

      {!isPreview && hasSlope && !confirmedHole && !detectedMode && (
        <Label cx={W * 0.5} cy={H * 0.12} text="Set the hole to finish the read" color="#90a4ae" />
      )}

      {!isPreview && !hasSlope && confirmedHole && (
        <Label cx={W * 0.5} cy={H * 0.12} text="Capture slope to finish the read" color="#90a4ae" />
      )}

      {isPreview && showProjectedLine && readOutcome.aim?.dir && (
        <Label cx={midLabelX} cy={midLabelY} text={readOutcome.aim.label} color="#4caf50" />
      )}

      {animBall && (
        <G>
          <Circle cx={animBall.x} cy={animBall.y} r={8} fill={ANIM_CLR} />
          <Circle cx={animBall.x} cy={animBall.y} r={12} stroke={ANIM_CLR} strokeWidth={1.5} fill="none" opacity={0.4} />
        </G>
      )}
    </Svg>
  );
}
