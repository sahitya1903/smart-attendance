import React from "react";

export default function FaceOverlay({ faces, videoRef }) {
  if (!videoRef.current) return null;

  const video = videoRef.current.video;
  if (!video || !video.videoWidth) return null;

  const rect = video.getBoundingClientRect();
  const scaleX = rect.width / video.videoWidth;
  const scaleY = rect.height / video.videoHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {faces.map((f, idx) => {
        const { top, right, bottom, left } = f.box;

        const boxWidth = (right - left) * scaleX;
        const boxHeight = (bottom - top) * scaleY;

        // mirror fix
        const mirroredLeft = rect.width - right * scaleX;

        // status-based UI
        const color =
          f.status === "present"
            ? "#22c55e" // green
            : f.status === "uncertain"
            ? "#f59e0b" // amber
            : "#ef4444"; // red

        const label =
          f.status === "present"
            ? `${f.student?.name} (${Math.round(f.confidence * 100)}%)`
            : f.status === "uncertain"
            ? "Check ID"
            : "Unknown";

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: mirroredLeft,
              top: top * scaleY,
              width: boxWidth,
              height: boxHeight,
              border: `2px solid ${color}`,
              borderRadius: "8px",
              background: `${color}20`,
            }}
          >
            {/* Label */}
            <div
              style={{
                position: "absolute",
                top: "-18px",
                left: 0,
                background: color,
                color: "#fff",
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
