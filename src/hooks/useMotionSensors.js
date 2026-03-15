import { useState, useEffect, useRef } from 'react';
import { DeviceMotion } from 'expo-sensors';
import { toDeg } from '../utils/puttingPhysics';

const UPDATE_INTERVAL_MS = 100; // 10 Hz is plenty for slope reading

/**
 * Provides live device tilt in degrees.
 *
 * gamma = left/right tilt  (positive = right side lower)
 * beta  = front/back tilt  (positive = far side lower / downhill)
 *
 * DeviceMotion rotation values are in radians; we convert to degrees here.
 * When the phone is flat (face-up), both values are near 0.
 */
export function useMotionSensors() {
  const [gamma, setGamma] = useState(0); // left/right
  const [beta,  setBeta]  = useState(0); // front/back
  const [available, setAvailable] = useState(true);
  const subRef = useRef(null);

  useEffect(() => {
    DeviceMotion.isAvailableAsync().then((ok) => {
      if (!ok) { setAvailable(false); return; }

      DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MS);
      subRef.current = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        // rotation: { alpha, beta, gamma } in radians
        setGamma(toDeg(rotation.gamma ?? 0));
        setBeta(-toDeg(rotation.beta  ?? 0)); // negated: phone tilting forward = uphill
      });
    });

    return () => {
      subRef.current?.remove();
    };
  }, []);

  return { gamma, beta, available };
}
