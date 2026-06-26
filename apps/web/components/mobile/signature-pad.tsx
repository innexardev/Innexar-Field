"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@fieldforge/ui";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

function getPoint(event: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function SignaturePad({ onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0f172a";
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const startStroke = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      event.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const point = canvas ? getPoint(event, canvas) : null;
      if (!ctx || !point) return;
      drawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [disabled],
  );

  const continueStroke = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!drawingRef.current || disabled) return;
      event.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const point = canvas ? getPoint(event, canvas) : null;
      if (!ctx || !point) return;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    [disabled],
  );

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setHasStroke(true);
    emitChange();
  }, [emitChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    setHasStroke(false);
    onChange(null);
  }, [onChange]);

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        className="signature-pad__canvas"
        aria-label="Signature pad"
        onMouseDown={startStroke}
        onMouseMove={continueStroke}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={startStroke}
        onTouchMove={continueStroke}
        onTouchEnd={endStroke}
      />
      <div className="signature-pad__actions">
        <Button type="button" variant="secondary" size="sm" disabled={disabled || !hasStroke} onClick={clear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
