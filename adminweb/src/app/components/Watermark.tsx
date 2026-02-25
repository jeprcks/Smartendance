'use client';

import { useEffect, useState } from 'react';
import { settingsService } from '@/app/services/settingsService';

const SETTINGS_UPDATED_EVENT = 'settingsUpdated';

export default function Watermark() {
  const [watermarkSrc, setWatermarkSrc] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await settingsService.getSettings();
        setWatermarkSrc(s.watermarkLogo || null);
      } catch {
        setWatermarkSrc(null);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener(SETTINGS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, handler);
  }, []);

  if (!watermarkSrc) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
      style={{ opacity: 0.08 }}
      aria-hidden
    >
      <img src={watermarkSrc} alt="" className="w-[800px] h-[800px] object-contain" />
    </div>
  );
}
