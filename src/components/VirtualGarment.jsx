import { useEffect, useRef, useState } from "react";

const VirtualGarment = ({
  poseLandmarks,
  garmentType = "shirt",
  color = "red",
  mirrored = false,
  videoSize = { width: 0, height: 0 },
}) => {
  const canvasRef = useRef(null);
  const [images, setImages] = useState({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Cargar imágenes de prendas
  useEffect(() => {
    const loadImages = async () => {
      //   const types = ["shirt", "jacket", "dress", "hat", "glasses", "scarf"];
      //   const colors = ["red", "blue", "green", "black"];
      const types = ["shirt"];
      const colors = ["red"];
      const newImages = {};

      const loadPromises = [];

      for (const type of types) {
        for (const color of colors) {
          const img = new Image();
          img.src = `/garments/${type}_${color}.png`;
          newImages[`${type}_${color}`] = img;
          loadPromises.push(
            new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = () => {
                console.error(`Error loading image: ${type}_${color}`);
                resolve(); // Resuelve incluso si hay error
              };
            })
          );
        }
      }

      // Esperar a que todas las imágenes carguen o fallen
      await Promise.all(loadPromises);
      setImages(newImages);
      setImagesLoaded(true);
    };

    loadImages();
  }, []);

  useEffect(() => {
    if (
      !poseLandmarks ||
      !canvasRef.current ||
      !videoSize.width ||
      !videoSize.height ||
      !imagesLoaded
    )
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoSize.width;
    canvas.height = videoSize.height;
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

    // Calcular centro del torso (punto de anclaje)
    const centerX = (ls.x + rs.x) / 2;
    const centerY = (ls.y + rs.y) / 2 + torsoHeight * 0.2; // Ajuste vertical

    // Calcular ángulo de rotación basado en hombros
    const angle = Math.atan2(rs.y - ls.y, rs.x - ls.x);

    // Obtener imagen
    const imgKey = `${garmentType}_${color}`;
    const img = images[imgKey];

    if (img && img.complete) {
      // Tamaño de la imagen (ajustar según landmarks)
      const width = shoulderWidth * 2.5;
      const height = (img.naturalHeight / img.naturalWidth) * width;

      ctx.save();

      // Aplicar transformación de espejo si es necesario
      if (mirrored) {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }

      // Aplicar rotación alrededor del centro del torso
      ctx.translate(centerX, centerY);
      ctx.rotate(mirrored ? -angle : angle);
      ctx.translate(-centerX, -centerY);

      // Dibujar imagen
      ctx.drawImage(
        img,
        centerX - width / 2,
        centerY - height * 0.5, // Centrar verticalmente
        width,
        height
      );

      ctx.restore();
    } else {
      // Fallback a dibujo básico si no hay imagen
      ctx.fillStyle = `rgba(255, 0, 0, 0.6)`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [
    poseLandmarks,
    garmentType,
    color,
    mirrored,
    videoSize,
    images,
    imagesLoaded,
  ]);

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
