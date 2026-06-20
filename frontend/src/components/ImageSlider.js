import React, { useState, useEffect } from "react";

const images = [
  "/slider-images/slide1.jpeg",
  "/slider-images/slide2.jpg.webp",
  "/slider-images/slide3.jpg",
  "/slider-images/slide4.png",
  "/slider-images/slide5.jpg",
  "/slider-images/slide6.webp",
  "/slider-images/slide7.jpg",
  "/slider-images/slide8.jpg",
  "/slider-images/slide9.webp",
  "/slider-images/slide10.webp",
  "/slider-images/slide11.jpg",
];

function ImageSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // returns the shortest circular distance between two indices
  const getOffset = (index) => {
    const len = images.length;
    let diff = index - activeIndex;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  };

  return (
    <div style={styles.container}>
      <div style={styles.label}></div>
      <div style={styles.stage}>
        {images.map((img, index) => {
          const offset = getOffset(index);
          const isCenter = offset === 0;
          const abs = Math.abs(offset);

          // only render nearby cards for performance + a cleaner look
          if (abs > 4) return null;

          const translateX = offset * 290;
          const scale = isCenter ? 1.12 : 1 - abs * 0.13;
          const rotateY = offset * -25;
          const zIndex = 100 - abs;
          const opacity = abs > 4 ? 0 : 1 - abs * 0.16;
          const blur = isCenter ? 0 : abs * 0.5;

          return (
            <div
              key={index}
              style={{
                ...styles.card,
                transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
                zIndex,
                opacity,
                filter: `blur(${blur}px)`,
                boxShadow: isCenter
                  ? "0 24px 48px rgba(0,0,0,0.35)"
                  : "0 12px 24px rgba(0,0,0,0.2)",
              }}
            >
              <img src={img} alt={`slide-${index}`} style={styles.image} />
              {isCenter && <div style={styles.shine} />}
            </div>
          );
        })}
      </div>

      <div style={styles.dots}>
        {images.map((_, index) => (
          <span
            key={index}
            onClick={() => setActiveIndex(index)}
            style={{
              ...styles.dot,
              width: index === activeIndex ? "22px" : "8px",
              backgroundColor: index === activeIndex ? "#C0392B" : "#ddd",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: "24px",
    backgroundColor: "var(--bg-card, #fff)",
    borderRadius: "16px",
    padding: "32px 16px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  label: {
    fontSize: "13px",
    fontWeight: "700",
    color: "var(--text-muted, #888)",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    marginBottom: "20px",
    textAlign: "center",
  },
  stage: {
    position: "relative",
    height: "320px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    perspective: "1200px",
  },
  card: {
    position: "absolute",
    width: "420px",
    height: "260px",
    borderRadius: "16px",
    overflow: "hidden",
    transition: "transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.6s ease, filter 0.6s ease",
    backgroundColor: "#000",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%)",
    pointerEvents: "none",
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: "6px",
    marginTop: "22px",
  },
  dot: {
    height: "8px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};

export default ImageSlider;
