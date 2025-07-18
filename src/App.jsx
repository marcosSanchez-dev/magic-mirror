import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Pose } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [poseResults, setPoseResults] = useState(null);
  const [showDebug, setShowDebug] = useState(true); // Modo debug activado por defecto
  const [fps, setFps] = useState(0);
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
            key={selectedDevice}
            ref={webcamRef}
            audio={false}
            videoConstraints={{
              deviceId: selectedDevice,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: 16 / 9,
            }}
            mirrored={mirrored}
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
              zIndex: 2,
              display: showDebug ? "block" : "none",
            }}
          />

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
              zIndex: 3,
            }}
          >
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

            <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
              <button onClick={() => setMirrored(!mirrored)}>
                {mirrored ? "Desactivar espejo" : "Activar espejo"}
              </button>
              <button onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? "Ocultar debug" : "Mostrar debug"}
              </button>
            </div>

            <div style={{ marginTop: "10px" }}>
              FPS: {fps} | Landmarks: {poseResults?.poseLandmarks?.length || 0}
            </div>
          </div>
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
