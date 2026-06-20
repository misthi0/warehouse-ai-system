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

function BackgroundSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.wrapper}>
      {images.map((img, index) => (
        <img
          key={index}
          src={img}
          alt=""
          style={{
            ...styles.image,
            opacity: index === activeIndex ? 0.5 : 0,
          }}
        />
      ))}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "opacity 2.5s ease-in-out",
  },
};

export default BackgroundSlider;
