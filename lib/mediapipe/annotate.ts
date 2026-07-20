import { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { ZONE_LANDMARKS } from "./zoneLandmarkMap";
import { AnalysisResult } from "../types";

export function drawAnnotation(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | HTMLVideoElement,
  landmarkerResult: FaceLandmarkerResult,
  analysis: AnalysisResult,
  drawLabels: boolean = true
): Record<string, { x: number, y: number, w: number, h: number }> {
  const zoneCoords: Record<string, { x: number, y: number, w: number, h: number }> = {};

  const ctx = canvas.getContext("2d");
  if (!ctx) return zoneCoords;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Reset collision tracker for each render frame
  // @ts-expect-error: Custom property injected on canvas
  canvas.__boxPositions = { left: [], right: [] };
  
  // Draw base image
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (!landmarkerResult || !landmarkerResult.faceLandmarks || landmarkerResult.faceLandmarks.length === 0) {
    return zoneCoords;
  }

  const landmarks = landmarkerResult.faceLandmarks[0];
  const w = canvas.width;
  const h = canvas.height;

  // Draw zones based on analysis
  if (analysis.zones) {
    Object.entries(analysis.zones).forEach(([zoneName, observation]) => {
      if (!observation || !observation.observations || observation.observations.length === 0) return;

      const indices = ZONE_LANDMARKS[zoneName as keyof typeof ZONE_LANDMARKS];
      if (!indices) return;

      let cx = 0, cy = 0, count = 0;
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      
      indices.forEach(index => {
        const pt = landmarks[index];
        if (pt) { 
          cx += pt.x * w; cy += pt.y * h; count++; 
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      });
      
      if (count > 0) {
        cx /= count; cy /= count;
        
        // Fix the math for U-shaped jawline: pull the center down to the actual chin
        if (zoneName === "chin_jawline") {
          cy = (minY + (maxY - minY) * 0.85) * h;
        }
        
        // Fix the math for under_eye: it averages both eyes resulting in the nose bridge.
        // We will point the label to the left eye (screen left) for clarity.
        if (zoneName === "under_eye") {
          let lx = 0, ly = 0, lCount = 0;
          // The first 9 indices in the under_eye map correspond to the screen-left eye
          const leftEyeIndices = indices.slice(0, 9);
          leftEyeIndices.forEach(index => {
            const pt = landmarks[index];
            if (pt) {
              lx += pt.x * w;
              ly += pt.y * h;
              lCount++;
            }
          });
          if (lCount > 0) {
            cx = lx / lCount;
            cy = ly / lCount;
          }
        }
        
        zoneCoords[zoneName] = {
          x: cx / w,
          y: cy / h,
          w: maxX - minX,
          h: maxY - minY
        };
      }

      // Highlight the zone delicately (Heatmap style instead of wireframe)
      // Only draw the polygon if it's severe or moderate
      if (observation.severity !== "none") {
        let fillColor = "rgba(255, 255, 255, 0.05)";
        if (observation.severity === "severe") fillColor = "rgba(224, 122, 95, 0.15)"; // Terracotta
        else if (observation.severity === "moderate") fillColor = "rgba(233, 184, 59, 0.15)"; // Gold
        
        ctx.fillStyle = fillColor;

        if (zoneName === "under_eye") {
          // Draw left eye polygon
          ctx.beginPath();
          indices.slice(0, 9).forEach((index, i) => {
            const pt = landmarks[index];
            if (pt) {
              if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
              else ctx.lineTo(pt.x * w, pt.y * h);
            }
          });
          ctx.closePath();
          ctx.fill();

          // Draw right eye polygon
          ctx.beginPath();
          indices.slice(9).forEach((index, i) => {
            const pt = landmarks[index];
            if (pt) {
              if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
              else ctx.lineTo(pt.x * w, pt.y * h);
            }
          });
          ctx.closePath();
          ctx.fill();
        } else {
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
          ctx.fill();
        }
      }

      if (count > 0 && observation.severity !== "none") {
        let text = observation.observations[0]; 
        
        // Premium Keyword Extraction
        const lower = text.toLowerCase();
        if (lower.includes("dark circle") || lower.includes("puffi")) text = "Dark Circles";
        else if (lower.includes("pore")) text = "Pores";
        else if (lower.includes("oil") || lower.includes("shine")) text = "Oily";
        else if (lower.includes("acne") || lower.includes("breakout")) text = "Acne";
        else if (lower.includes("dehydrat") || lower.includes("dry")) text = "Dryness";
        else if (lower.includes("uneven") || lower.includes("tone") || lower.includes("dull")) text = "Uneven Tone";
        else if (lower.includes("line") || lower.includes("wrinkle")) text = "Fine Lines";
        else if (lower.includes("scar") || lower.includes("pigment")) text = "Pigmentation";
        else if (lower.includes("sag") || lower.includes("elastic")) text = "Elasticity";
        else text = text.split(" ").slice(0, 2).join(" ");
        
        ctx.font = "600 13px system-ui, -apple-system, sans-serif";
        const textWidth = ctx.measureText(text).width;
        const paddingX = 24; // Generous padding for pill
        const boxHeight = 28; // Slimmer, elegant pill
        const boxWidth = textWidth + paddingX;
        
        const isLeft = cx < w / 2;
        const edgeMargin = 12;
        
        // Calculate target positions closer to the face
        const offset = 60; // Push further out for clean spacing
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
            if (Math.abs(boxY - targetY) < boxHeight + 12) { // More breathing room
              targetY = boxY + boxHeight + 12;
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
        
        // 2. Draw glowing dot on the face
        const severityColor = observation.severity === "severe" ? "#E07A5F" : "#E9B83B";
        ctx.shadowColor = severityColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow so it doesn't affect everything else

        if (!drawLabels) return;

        // 1. Draw elegant bezier curve pointer
        const endX = isLeft ? targetX + boxWidth : targetX;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        
        // Control points for a sweeping S-curve
        const cp1x = cx + (isLeft ? -40 : 40);
        const cp1y = cy;
        const cp2x = endX + (isLeft ? 40 : -40);
        const cp2y = targetY;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, targetY);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 3. Draw Dark Glassmorphism Pill Label
        const boxYOffset = targetY - (boxHeight / 2);
        
        // The background
        ctx.fillStyle = "rgba(20, 20, 25, 0.85)"; 
        ctx.strokeStyle = severityColor; // Colored thin border based on severity
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.roundRect(targetX, boxYOffset, boxWidth, boxHeight, boxHeight / 2); // Pill shape
        ctx.fill();
        ctx.stroke();
        
        // 4. Draw crisp white text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // +1 to y to perfectly optical-center standard fonts
        ctx.fillText(text, targetX + (boxWidth / 2), targetY + 1);

      }
    });
  }
  return zoneCoords;
}
