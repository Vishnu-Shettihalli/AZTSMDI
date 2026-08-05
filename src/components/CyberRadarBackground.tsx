import React from "react";
import { motion } from "motion/react";

export default function CyberRadarBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Clean background grid */}
      <div 
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
          backgroundSize: "28px 28px"
        }}
      />

      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[140px] pointer-events-none" />
    </div>
  );
}
