import { useEffect, useRef } from "react";

const VirtualGarment = ({
  poseLandmarks,
  garmentType = "shirt",
  color = "red",
}) => {
  const canvasRef = useRef(null);

  // Colores disponibles
  const colorMap = {
    red: "rgba(255, 0, 0, 0.6)",
    blue: "rgba(0, 0, 255, 0.6)",
    green: "rgba(0, 255, 0, 0.6)",
    black: "rgba(0, 0, 0, 0.6)",
  };

  useEffect(() => {
    if (!poseLandmarks || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Obtener landmarks clave
    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const leftHip = poseLandmarks[23];
    const rightHip = poseLandmarks[24];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

    // Convertir coordenadas normalizadas a píxeles
    const toPixels = (landmark) => ({
      x: landmark.x * canvas.width,
      y: landmark.y * canvas.height,
    });

    const ls = toPixels(leftShoulder);
    const rs = toPixels(rightShoulder);
    const lh = toPixels(leftHip);
    const rh = toPixels(rightHip);

    // Calcular dimensiones
    const shoulderWidth = Math.abs(rs.x - ls.x);
    const torsoHeight = Math.abs((lh.y + rh.y) / 2 - (ls.y + rs.y) / 2);

    // Dibujar prenda básica
    ctx.fillStyle = colorMap[color];

    if (garmentType === "shirt") {
      // Camiseta básica
      ctx.beginPath();
      ctx.moveTo(ls.x, ls.y);
      ctx.lineTo(rs.x, rs.y);
      ctx.lineTo(rs.x + shoulderWidth * 0.2, rs.y + torsoHeight * 0.3);
      ctx.lineTo(rs.x, (ls.y + lh.y) / 2);
      ctx.lineTo(rs.x, (ls.y + lh.y) / 2 + torsoHeight * 0.8);
      ctx.lineTo(ls.x, (ls.y + lh.y) / 2 + torsoHeight * 0.8);
      ctx.lineTo(ls.x, (ls.y + lh.y) / 2);
      ctx.lineTo(ls.x - shoulderWidth * 0.2, ls.y + torsoHeight * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (garmentType === "jacket") {
      // Chaqueta básica
      ctx.beginPath();
      ctx.moveTo(ls.x - shoulderWidth * 0.1, ls.y - torsoHeight * 0.1);
      ctx.lineTo(rs.x + shoulderWidth * 0.1, rs.y - torsoHeight * 0.1);
      ctx.lineTo(rs.x + shoulderWidth * 0.3, rs.y + torsoHeight * 0.4);
      ctx.lineTo(rs.x, (ls.y + lh.y) / 2 + torsoHeight * 0.8);
      ctx.lineTo(ls.x, (ls.y + lh.y) / 2 + torsoHeight * 0.8);
      ctx.lineTo(ls.x - shoulderWidth * 0.3, ls.y + torsoHeight * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (garmentType === "dress") {
      // Vestido básico
      ctx.beginPath();
      ctx.moveTo(ls.x, ls.y);
      ctx.lineTo(rs.x, rs.y);
      ctx.lineTo(rs.x + shoulderWidth * 0.1, rs.y + torsoHeight * 0.8);
      ctx.lineTo(rs.x, (ls.y + lh.y) / 2 + torsoHeight * 1.5);
      ctx.lineTo(ls.x, (ls.y + lh.y) / 2 + torsoHeight * 1.5);
      ctx.lineTo(ls.x - shoulderWidth * 0.1, ls.y + torsoHeight * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }, [poseLandmarks, garmentType, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 3,
        pointerEvents: "none",
      }}
    />
  );
};

export default VirtualGarment;
