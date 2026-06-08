import { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { ZONE_LANDMARKS } from "./zoneLandmarkMap";
import { AnalysisResult } from "../types";

export function drawAnnotation(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | HTMLVideoElement,
  landmarkerResult: FaceLandmarkerResult,
  analysis: AnalysisResult
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Reset collision tracker for each render frame
  // @ts-expect-error: Custom property injected on canvas
  canvas.__boxPositions = { left: [], right: [] };
  
  // Draw base image
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (!landmarkerResult || !landmarkerResult.faceLandmarks || landmarkerResult.faceLandmarks.length === 0) {
    return;
  }

  const landmarks = landmarkerResult.faceLandmarks[0];
  const w = canvas.width;
  const h = canvas.height;

  // Draw zones based on analysis
  if (analysis.zones) {
    Object.entries(analysis.zones).forEach(([zoneName, observation]) => {
      if (!observation || !observation.observations || observation.observations.length === 0) return;
      if (observation.severity === "none") return;

      const indices = ZONE_LANDMARKS[zoneName as keyof typeof ZONE_LANDMARKS];
      if (!indices) return;

      // Draw subtle highlight
      ctx.beginPath();
      indices.forEach((index, i) => {
        const pt = landmarks[index];
        if (!pt) return;
        if (i === 0) {
          ctx.moveTo(pt.x * w, pt.y * h);
        } else {
          ctx.lineTo(pt.x * w, pt.y * h);
        }
      });
      ctx.closePath();
      
      let fillColor = "rgba(255, 255, 255, 0.1)";
      if (observation.severity === "severe") fillColor = "rgba(224, 122, 95, 0.25)"; // Terracotta
      else if (observation.severity === "moderate") fillColor = "rgba(233, 184, 59, 0.25)"; // Gold
      
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw label (Callout)
      // Find center of the zone
      let cx = 0, cy = 0, count = 0;
      indices.forEach(index => {
        const pt = landmarks[index];
        if (pt) { cx += pt.x * w; cy += pt.y * h; count++; }
      });
      
      if (count > 0) {
        cx /= count; cy /= count;
        
        let text = observation.observations[0]; 
        // Truncate text if it's too long so it fits on mobile screens
        if (text.length > 18) {
          text = text.substring(0, 15) + "...";
        }
        
        ctx.font = "bold 16px sans-serif";
        const textWidth = ctx.measureText(text).width;
        const paddingX = 10;
        const boxHeight = 28;
        const boxWidth = textWidth + (paddingX * 2);
        
        const isLeft = cx < w / 2;
        const edgeMargin = 8;
        
        // Calculate target positions closer to the face
        const offset = 50; // pixels away from the face feature
        let targetX = isLeft ? cx - boxWidth - offset : cx + offset;
        
        // Keep within horizontal bounds
        if (targetX < edgeMargin) targetX = edgeMargin;
        if (targetX + boxWidth > w - edgeMargin) targetX = w - edgeMargin - boxWidth;
        
        // --- Collision Avoidance ---
        // (Hack: using a global/static-like object on the canvas element for this render pass)
        // @ts-expect-error: Custom property injected on canvas
        if (!canvas.__boxPositions) canvas.__boxPositions = { left: [], right: [] };
        // @ts-expect-error: Custom property injected on canvas
        const sideBoxes = isLeft ? canvas.__boxPositions.left : canvas.__boxPositions.right;
        
        let targetY = cy;
        let overlap = true;
        let attempts = 0;
        
        // Push the box down if it overlaps with an existing box
        while (overlap && attempts < 10) {
          overlap = false;
          for (const boxY of sideBoxes) {
            if (Math.abs(boxY - targetY) < boxHeight + 4) {
              targetY = boxY + boxHeight + 4;
              overlap = true;
              break;
            }
          }
          attempts++;
        }
        
        // Keep it within canvas bounds
        if (targetY + boxHeight / 2 > h) {
          targetY = h - boxHeight / 2 - 4;
        }
        
        sideBoxes.push(targetY);
        // ---------------------------
        
        // Draw the dot on the face
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw callout line (HUD style with elbow)
        const elbowX = isLeft ? targetX + boxWidth + 10 : targetX - 10;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(elbowX, cy);
        ctx.lineTo(isLeft ? targetX + boxWidth : targetX, targetY);
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw label background box
        const boxYOffset = targetY - (boxHeight / 2);
        ctx.fillStyle = observation.severity === "severe" ? "rgba(192, 83, 58, 0.9)" : "rgba(217, 160, 27, 0.9)";
        
        ctx.beginPath();
        ctx.roundRect(targetX, boxYOffset, boxWidth, boxHeight, 4);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, targetX + paddingX, targetY);
      }
    });
  }
}
