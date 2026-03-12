import React from 'react';
import Svg, { Path, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import { elevationPoints } from '../utils/puttingPhysics';

const H = 44;   // component height
const PAD_X = 28;
const PAD_Y = 8;

/**
 * Compact side-view elevation profile from ball to hole.
 *
 * Props:
 *   width          – available width (pixels)
 *   slopeReadings  – [{slopeX, slopeY, pos}]
 *   distance       – putt distance in feet
 */
export default function ElevationProfile({ width, slopeReadings, distance }) {
  if (!slopeReadings?.length || !width) return null;

  const pts = elevationPoints(slopeReadings, distance);
  if (pts.length < 2) return null;

  const W = width;
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_Y * 2;

  // Find elevation range
  const elevs = pts.map((p) => p.elevFt);
  const minE = Math.min(...elevs);
  const maxE = Math.max(...elevs);
  const range = Math.max(maxE - minE, 0.3); // at least 0.3 ft range
  const mid = (maxE + minE) / 2;

  // Map data → SVG coords
  const toX = (x) => PAD_X + x * plotW;
  const toY = (e) => PAD_Y + plotH / 2 - ((e - mid) / range) * (plotH * 0.8);

  // Build path
  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x).toFixed(1)} ${toY(p.elevFt).toFixed(1)}`)
    .join(' ');

  const ballX = toX(0);
  const ballY = toY(pts[0].elevFt);
  const holeX = toX(1);
  const holeY = toY(pts[pts.length - 1].elevFt);
  const totalDrop = pts[pts.length - 1].elevFt - pts[0].elevFt;
  const dropLabel =
    Math.abs(totalDrop) < 0.05
      ? 'Flat'
      : `${totalDrop > 0 ? '+' : ''}${totalDrop.toFixed(1)} ft`;

  return (
    <Svg width={W} height={H}>
      {/* Background */}
      <Rect x={0} y={0} width={W} height={H} rx={8} fill="rgba(0,0,0,0.55)" />

      {/* Baseline */}
      <Line
        x1={PAD_X} y1={H - PAD_Y}
        x2={W - PAD_X} y2={H - PAD_Y}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1}
      />

      {/* Elevation line */}
      <Path d={pathD} stroke="#4caf50" strokeWidth={2} fill="none" />

      {/* Reading dots */}
      {pts.slice(1, -1).map((p, i) => (
        <Circle key={i} cx={toX(p.x)} cy={toY(p.elevFt)} r={3} fill="#ff9800" />
      ))}

      {/* Ball */}
      <Circle cx={ballX} cy={ballY} r={4} fill="#fff" />
      <SvgText x={ballX} y={H - 1} fontSize={8} fill="#9e9e9e" textAnchor="middle">
        Ball
      </SvgText>

      {/* Hole */}
      <Circle cx={holeX} cy={holeY} r={4} fill="#f44336" />
      <SvgText x={holeX} y={H - 1} fontSize={8} fill="#9e9e9e" textAnchor="middle">
        Hole
      </SvgText>

      {/* Drop label */}
      <SvgText
        x={W / 2} y={10}
        fontSize={9} fontWeight="bold" fill="#90a4ae" textAnchor="middle"
      >
        {dropLabel}
      </SvgText>
    </Svg>
  );
}
