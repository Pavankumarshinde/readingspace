"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRDisplayProps {
  roomId: string;
  roomName: string;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
  qrVersion?: number;
  onRegenerate?: () => void;
}

export default function QRDisplay({
  roomId,
  roomName,
  latitude,
  longitude,
  radius,
  qrVersion = 0,
  onRegenerate,
}: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Permanent payload: roomId + qrVersion
    const payload = `${roomId}|v${qrVersion}`;

    QRCode.toCanvas(canvasRef.current, payload, {
      width: 160,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  }, [roomId, qrVersion]);

  return (
    <div className="printable-pass flex flex-col items-center gap-5 p-6 bg-surface-container-lowest rounded-[32px] border border-outline-variant/10 shadow-xl shadow-primary/5 max-w-[320px] mx-auto">
      <div className="printable-pass-content flex flex-col items-center gap-5 w-full">
        <div className="flex flex-col items-center text-center gap-1.5">
          <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-full">
            Station Card
          </span>
          <h2 className="font-headline text-on-surface mt-1 text-base font-medium">
            {roomName}
          </h2>
          <div className="flex flex-col gap-1 mt-1">
            <p className="text-[9px] text-on-surface-variant/70 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span className="opacity-60">Location:</span>
              {latitude && longitude
                ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                : "Not Set"}
            </p>
            <p className="text-[9px] text-on-surface-variant/70 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
              <span className="opacity-60">Range:</span>
              {radius ? `${radius} meters` : "Global"}
            </p>
          </div>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm print:border-none print:shadow-none">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        <div className="flex flex-col items-center w-full px-2">
          <div className="w-full py-2.5 px-3 bg-secondary/5 rounded-xl border border-secondary/10">
            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest text-center leading-relaxed">
              Scan only within range.
              <br />
              Ensure GPS is enabled.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full mt-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full bg-on-surface text-surface py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "16px" }}
          >
            print
          </span>
          Print Station Card
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="w-full text-[10px] font-bold text-primary/70 hover:text-primary hover:bg-primary/5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors uppercase tracking-widest"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
            >
              refresh
            </span>
            Regenerate QR Code
          </button>
        )}
      </div>
    </div>
  );
}
