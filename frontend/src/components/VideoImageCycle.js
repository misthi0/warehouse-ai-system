import React, { useState, useEffect, useRef } from "react";
import ImageSlider from "./ImageSlider";

const VIDEO_DURATION_MS = 4000;
const PHOTO_DURATION_MS = 15000;
const FADE_MS = 500;

const VIDEO_SRC = "/videos/dispatch-video.MOV";

function VideoImageCycle() {
  const [mode, setMode] = useState("video"); // "video" | "photo"
  const [visible, setVisible] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const duration = mode === "video" ? VIDEO_DURATION_MS : PHOTO_DURATION_MS;

    const fadeOutTimer = setTimeout(() => {
      setVisible(false);
    }, duration - FADE_MS);

    const switchTimer = setTimeout(() => {
      setMode((prev) => (prev === "video" ? "photo" : "video"));
      setVisible(true);
    }, duration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(switchTimer);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  const fadeStyle = {
    opacity: visible ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-in-out`,
  };

  if (mode === "photo") {
    return (
      <div style={fadeStyle}>
        <ImageSlider />
      </div>
    );
  }

  return (
    <div style={{ ...styles.videoContainer, ...fadeStyle }}>
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        style={styles.video}
      />
    </div>
  );
}

const styles = {
  videoContainer: {
    marginTop: "24px",
    borderRadius: "16px",
    overflow: "hidden",
    backgroundColor: "#000",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  video: {
    width: "100%",
    height: "auto",
    display: "block",
  },
};

export default VideoImageCycle;
