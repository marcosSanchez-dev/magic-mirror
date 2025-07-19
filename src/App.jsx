import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import VirtualGarment from "./components/VirtualGarment";

// Hook para detección de gestos (añadido en el mismo archivo)
const useGestureDetection = (poseLandmarks, callback) => {
  useEffect(() => {
    if (!poseLandmarks) return;

    // Landmarks indices (MediaPipe Pose)
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;
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

    // 1. Mano derecha levantada: muñeca por encima del hombro
    if (rightWrist.y < rightShoulder.y) {
      gestures.push("RIGHT_HAND_UP");
    }

    // 2. Mano izquierda levantada
    if (leftWrist.y < leftShoulder.y) {
      gestures.push("LEFT_HAND_UP");
    }

    // 3. Cabeza girada a la izquierda: nariz más a la izquierda que el ojo izquierdo
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    if (nose.x < leftEye.x - eyeDistance * 0.3) {
      gestures.push("HEAD_LEFT");
    }

    // 4. Cabeza girada a la derecha: nariz más a la derecha que el ojo derecho
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

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [poseResults, setPoseResults] = useState(null);
  const [showDebug, setShowDebug] = useState(true);
  const [fps, setFps] = useState(0);
  const [garmentColor, setGarmentColor] = useState("red");
  const [garmentType, setGarmentType] = useState("shirt");
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [activeGestures, setActiveGestures] = useState([]);
  const [gestureCooldown, setGestureCooldown] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState("");
  const pose = useRef(null);

  // Configurar MediaPipe Pose
  useEffect(() => {
    const initializePose = () => {
      const poseInstance = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      poseInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseInstance.onResults(onPoseResults);
      pose.current = poseInstance;
    };

    initializePose();

    return () => {
      if (pose.current) {
        pose.current.close();
      }
    };
  }, []);

  // Manejar resultados de pose
  const onPoseResults = (results) => {
    setPoseResults(results);

    // Dibujar landmarks en el canvas si está en modo debug
    if (showDebug && canvasRef.current && webcamRef.current) {
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (mirrored) {
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-canvas.width, 0);
      }

      // Dibujar video de fondo
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      // Dibujar landmarks y conexiones
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 4,
        });
        drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: "#FF0000",
          lineWidth: 2,
          radius: 3,
        });
      }

      canvasCtx.restore();
    }
  };

  // Procesar cada frame del video
  useEffect(() => {
    let frameCount = 0;
    let startTime = performance.now();
    let animationFrameId;

    const processFrame = async () => {
      if (
        !webcamRef.current ||
        !pose.current ||
        !webcamRef.current.video ||
        webcamRef.current.video.readyState < 2
      ) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      try {
        await pose.current.send({ image: webcamRef.current.video });

        // Calcular FPS
        frameCount++;
        const elapsed = performance.now() - startTime;
        if (elapsed > 1000) {
          setFps(Math.round((frameCount * 1000) / elapsed));
          frameCount = 0;
          startTime = performance.now();
        }
      } catch (error) {
        console.error("Error processing frame:", error);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showDebug]);

  // Detectar dispositivos disponibles y solicitar permisos
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Paso 1: Solicitar permisos primero
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setPermissionGranted(true);

        // Paso 2: Enumerar dispositivos después de obtener permisos
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);

        // Paso 3: Seleccionar la cámara virtual de OBS si existe
        const obsCamera = videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes("obs") ||
            device.label.toLowerCase().includes("virtual")
        );

        setSelectedDevice(
          obsCamera?.deviceId || videoDevices[0]?.deviceId || ""
        );

        // Detener el stream de previsualización
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Error al acceder a dispositivos:", error);
        setPermissionGranted(false);
      }
    };

    getDevices();
  }, []);

  // Actualizar tamaño del video cuando cambia
  useEffect(() => {
    if (webcamRef.current?.video) {
      setVideoSize({
        width: webcamRef.current.video.videoWidth,
        height: webcamRef.current.video.videoHeight,
      });
    }
  }, [
    selectedDevice,
    webcamRef.current?.video?.videoWidth,
    webcamRef.current?.video?.videoHeight,
  ]);

  // Configurar detección de gestos
  useGestureDetection(poseResults?.poseLandmarks, (gestures) => {
    if (!gestureCooldown) {
      setActiveGestures(gestures);
      setGestureCooldown(true);

      // Resetear cooldown después de 1 segundo
      setTimeout(() => setGestureCooldown(false), 1000);
    }
  });

  // Cambiar color basado en gestos
  useEffect(() => {
    if (activeGestures.length === 0) return;

    const colors = ["red", "blue", "green", "black"];
    const currentIndex = colors.indexOf(garmentColor);

    if (activeGestures.includes("RIGHT_HAND_UP")) {
      const nextIndex = (currentIndex + 1) % colors.length;
      setGarmentColor(colors[nextIndex]);
      setGestureFeedback("Color cambiado");
      setTimeout(() => setGestureFeedback(""), 1000);
    }

    if (activeGestures.includes("LEFT_HAND_UP")) {
      const prevIndex = (currentIndex - 1 + colors.length) % colors.length;
      setGarmentColor(colors[prevIndex]);
      setGestureFeedback("Color cambiado");
      setTimeout(() => setGestureFeedback(""), 1000);
    }
  }, [activeGestures, garmentColor]);

  // Cambiar tipo de prenda basado en gestos
  useEffect(() => {
    if (activeGestures.length === 0) return;

    const types = ["shirt", "jacket", "dress", "hat", "glasses", "scarf"];
    const currentIndex = types.indexOf(garmentType);

    if (activeGestures.includes("HEAD_RIGHT")) {
      const nextIndex = (currentIndex + 1) % types.length;
      setGarmentType(types[nextIndex]);
      setGestureFeedback("Prenda cambiada");
      setTimeout(() => setGestureFeedback(""), 1000);
    }

    if (activeGestures.includes("HEAD_LEFT")) {
      const prevIndex = (currentIndex - 1 + types.length) % types.length;
      setGarmentType(types[prevIndex]);
      setGestureFeedback("Prenda cambiada");
      setTimeout(() => setGestureFeedback(""), 1000);
    }
  }, [activeGestures, garmentType]);

  return (
    <div
      style={{
        width: "1280px",
        height: "720px",
        backgroundColor: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {selectedDevice && permissionGranted ? (
        <>
          <Webcam
            key={selectedDevice} // Fuerza reinicio al cambiar cámara
            ref={webcamRef}
            audio={false}
            videoConstraints={{
              deviceId: selectedDevice,
              // Restricciones más flexibles:
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: 16 / 9,
            }}
            mirrored={mirrored}
            onUserMedia={() => {
              const video = webcamRef.current.video;
              setVideoSize({
                width: video.videoWidth,
                height: video.videoHeight,
              });
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: mirrored ? "scaleX(-1)" : "none",
              position: "absolute",
              zIndex: 1,
            }}
          />

          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              zIndex: 2, // Debajo de la prenda virtual
              display: showDebug ? "block" : "none",
            }}
          />

          {/* Componente de prenda virtual */}
          {videoSize.width > 0 && videoSize.height > 0 && (
            <VirtualGarment
              poseLandmarks={poseResults?.poseLandmarks}
              garmentType={garmentType}
              color={garmentColor}
              mirrored={mirrored}
              videoSize={videoSize}
            />
          )}

          {/* Selector de cámaras flotante */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "10px",
              borderRadius: "5px",
              color: "white",
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "300px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Seleccionar cámara:
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                style={{ width: "100%" }}
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Cámara ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setMirrored(!mirrored)}
                style={{ flex: 1, padding: "5px" }}
              >
                {mirrored ? "✗ Espejo" : "✓ Espejo"}
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                style={{ flex: 1, padding: "5px" }}
              >
                {showDebug ? "✗ Debug" : "✓ Debug"}
              </button>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Color de prenda:
              </label>
              <select
                value={garmentColor}
                onChange={(e) => setGarmentColor(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="red">Rojo</option>
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="black">Negro</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px" }}>
                Tipo de prenda:
              </label>
              <select
                value={garmentType}
                onChange={(e) => setGarmentType(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="shirt">Camiseta</option>
                <option value="jacket">Chaqueta</option>
                <option value="dress">Vestido</option>
                <option value="hat">Sombrero</option>
                <option value="glasses">Gafas</option>
                <option value="scarf">Bufanda</option>
              </select>
            </div>

            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <div>FPS: {fps}</div>
              <div>Landmarks: {poseResults?.poseLandmarks?.length || 0}</div>
            </div>
          </div>

          {/* Panel de gestos detectados */}
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "10px",
              borderRadius: "5px",
              color: "white",
              zIndex: 4,
              maxWidth: "300px",
            }}
          >
            <h4>Gestos detectados:</h4>
            {activeGestures.length > 0 ? (
              <ul>
                {activeGestures.map((gesture, i) => (
                  <li key={i}>{gesture}</li>
                ))}
              </ul>
            ) : (
              <p>Ningún gesto detectado</p>
            )}
            <p>Instrucciones:</p>
            <ul>
              <li>Mano derecha arriba: Siguiente color</li>
              <li>Mano izquierda arriba: Color anterior</li>
              <li>Girar cabeza derecha: Siguiente prenda</li>
              <li>Girar cabeza izquierda: Prenda anterior</li>
            </ul>
          </div>

          {/* Feedback visual para gestos */}
          {gestureFeedback && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0,0,0,0.8)",
                color: "white",
                padding: "20px",
                borderRadius: "10px",
                fontSize: "24px",
                zIndex: 5,
                animation: "fadeOut 1s forwards",
              }}
            >
              {gestureFeedback}
            </div>
          )}

          {/* Estilos para la animación de feedback */}
          <style jsx>{`
            @keyframes fadeOut {
              0% {
                opacity: 1;
              }
              70% {
                opacity: 1;
              }
              100% {
                opacity: 0;
              }
            }
          `}</style>
        </>
      ) : (
        <div style={{ color: "white", textAlign: "center" }}>
          <h2>Configuración requerida</h2>
          <p>
            1. Abre OBS y activa la Cámara Virtual (Herramientas → Cámara
            Virtual)
          </p>
          <p>2. Asegúrate de permitir acceso a la cámara en el navegador</p>
          <p>3. Recarga esta página</p>

          <button
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              fontSize: "1.2em",
              cursor: "pointer",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
            }}
            onClick={async () => {
              try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                window.location.reload();
              } catch (error) {
                alert(
                  "Permiso denegado. Por favor habilita los permisos de cámara."
                );
              }
            }}
          >
            Dar permisos de cámara
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
