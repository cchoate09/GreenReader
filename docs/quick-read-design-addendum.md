# GreenReader Quick-Read Addendum

This addendum captures the current product direction in a repo-friendly format.

## Positioning

- GreenReader is a practice and training aid.
- The app should not be described as a competition or rules-conforming green-reading tool.
- Onboarding, README copy, and in-app labels should reinforce that the read is guidance to compare against the golfer's own process.

## Default Flow

1. Read slope near the ball with a single capture.
2. Set the hole manually from the ball position.
3. Review the quick read: `Aim`, `Play As`, and `Read Quality`.
4. Use preview only after slope and hole are both confirmed.

## Advanced Flow

- Advanced controls are hidden behind a collapsed section.
- Advanced includes green speed presets, speed testing, grain, multi-point reads, elevation profile, and training mode.
- Training mode is session-scoped. The golfer guesses first, then compares against the measured read.

## Confidence Model

- Calibration stability comes from the standard deviation of the final 10-sample buffer.
- Sensor score: `100 - ((gammaStd + betaStd) * 60)`, clamped to `0..100`.
- Hole score: `90` for confirmed manual placement, `75` for confirmed auto-detect.
- Overall score: `round(sensorScore * 0.7 + holeScore * 0.3)`.
- Levels:
  - `high`: `80+`
  - `medium`: `60-79`
  - `low`: `<60`
  - `incomplete`: missing slope or confirmed hole

## Hole States

- `unset`: no hole in the session
- `placing`: manual tap-to-place is active
- `autoDetected`: a detected hole is waiting for confirmation
- `confirmed`: a hole is locked for the current read

Auto-detected holes must never become confirmed automatically. The user must explicitly tap `Use Detected`.
