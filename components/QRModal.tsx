"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { ThemeColors } from "@/lib/theme";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
}

const SITE_URL = "https://my-nikkaya.vercel.app";

export function QRModal({ isOpen, onClose, colors }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, SITE_URL, {
      width: 220,
      margin: 2,
      color: {
        dark: colors.text,
        light: colors.bgSecondary,
      },
    }).catch(console.error);
  }, [isOpen, colors]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>
          QR 코드
        </h2>
        <canvas ref={canvasRef} />
        <p className="text-xs" style={{ color: colors.textMuted }}>{SITE_URL}</p>
      </div>
    </>
  );
}
