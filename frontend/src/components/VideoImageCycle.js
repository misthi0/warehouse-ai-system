import React, { useState, useEffect, useRef } from "react";
import ImageSlider from "./ImageSlider";

const VIDEO_DURATION_MS = 4000;   // 4 seconds of video
const PHOTO_DURATION_MS = 15000;  // 15 seconds of photo transitions

const VIDEO_SRC = "/videos/dispatch-video.MOV";

function VideoImageCycle() {
  const [mode, setMode] = useState("video"); // "video" | "photo"
  const videoRef = useRef(null);

  // Master cycle: video -> photo -> video -> ...
  useEffect(() => {
    const duration = mode === "video" ? VIDEO_DURATION_MS : PHOTO_DURATION_MS;
    const timer = setTimeout(() => {
      setMode((prev) => (prev === "video" ? "photo" : "video"));
    }, duration);
    return () => clearTimeout(timer);
  }, [mode]);

  // Always restart the video from the beginning when entering video mode
  useEffect(() => {
    if (mode === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  if (mode === "photo") {
    // Exactly the original, untouched coverflow carousel
    return <ImageSlider />;
  }

  // Video mode: separate, clean box at the video's own natural dimensions
  return (
    <div style={styles.videoContainer}>
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
