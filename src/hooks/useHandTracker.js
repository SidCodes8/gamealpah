import { useEffect } from 'react';
import { Hands } from '@mediapipe/hands';

export default function useHandTracker(onResults) {
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);
  }, [onResults]);
}
