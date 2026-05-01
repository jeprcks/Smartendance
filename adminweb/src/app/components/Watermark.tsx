"use client";

import { useEffect, useState } from "react";
import { settingsService } from "@/app/services/settingsService";

export default function Watermark() {
  const [watermarkSrc, setWatermarkSrc] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // getImages() fetches only logo + watermarkLogo (~4.4 MB)
        // and is cached + deduplicated, so sharing this call with Navbar
        // costs nothing extra.
        const imgs = await settingsService.getImages();
        setWatermarkSrc(settingsService.resolveImageUrl(imgs.watermarkLogo));
      } catch {
        setWatermarkSrc(null);
      }
    };

    load();
    const handler = () => load();
    window.addEventListener("settingsUpdated", handler);
    return () => window.removeEventListener("settingsUpdated", handler);
  }, []);

  if (!watermarkSrc) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 dark:opacity-60"
      style={{ opacity: 0.08 }}
      aria-hidden
    >
      <img
        src={watermarkSrc}
        alt=""
        className="w-[800px] h-[800px] object-contain dark:brightness-300 dark:contrast-150 dark:drop-shadow-2xl"
      />
    </div>
  );
}
