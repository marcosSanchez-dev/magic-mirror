import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

function App() {
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [mirrored, setMirrored] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

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
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: mirrored ? "scaleX(-1)" : "none",
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
