import { useEffect } from "react";

const useGestureDetection = (poseLandmarks, callback) => {
  useEffect(() => {
    if (!poseLandmarks) return;

    // Landmarks indices (MediaPipe Pose)
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;
    const LEFT_ELBOW = 13;
    const RIGHT_ELBOW = 14;
    const LEFT_WRIST = 15;
    const RIGHT_WRIST = 16;
    const NOSE = 0;
    const LEFT_EYE = 2;
    const RIGHT_EYE = 5;

    // Obtener puntos
    const leftShoulder = poseLandmarks[LEFT_SHOULDER];
    const rightShoulder = poseLandmarks[RIGHT_SHOULDER];
    const leftWrist = poseLandmarks[LEFT_WRIST];
    const rightWrist = poseLandmarks[RIGHT_WRIST];
    const nose = poseLandmarks[NOSE];
    const leftEye = poseLandmarks[LEFT_EYE];
    const rightEye = poseLandmarks[RIGHT_EYE];

    if (
      !leftShoulder ||
      !rightShoulder ||
      !leftWrist ||
      !rightWrist ||
      !nose ||
      !leftEye ||
      !rightEye
    )
      return;

    // Detectar gestos
    const gestures = [];

    // 1. Mano derecha levantada
    if (rightWrist.y < rightShoulder.y) {
      gestures.push("RIGHT_HAND_UP");
    }

    // 2. Mano izquierda levantada
    if (leftWrist.y < leftShoulder.y) {
      gestures.push("LEFT_HAND_UP");
    }

    // 3. Cabeza girada a la izquierda
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    if (nose.x < leftEye.x - eyeDistance * 0.3) {
      gestures.push("HEAD_LEFT");
    }

    // 4. Cabeza girada a la derecha
    if (nose.x > rightEye.x + eyeDistance * 0.3) {
      gestures.push("HEAD_RIGHT");
    }

    // 5. Ambos brazos levantados
    if (
      gestures.includes("RIGHT_HAND_UP") &&
      gestures.includes("LEFT_HAND_UP")
    ) {
      gestures.push("BOTH_HANDS_UP");
    }

    if (gestures.length > 0) {
      callback(gestures);
    }
  }, [poseLandmarks, callback]);
};

export default useGestureDetection;
