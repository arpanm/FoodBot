/**
 * useNotificationSound hook - Manages audio playback for new order alerts
 */

import { useRef, useCallback, useEffect } from 'react';

const NEW_ORDER_SOUND_URL = '/sounds/new-order.mp3';

export function useNotificationSound(): {
  playNewOrderSound: () => Promise<void>;
  setVolume: (volume: number) => void;
} {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NEW_ORDER_SOUND_URL);
    audioRef.current.volume = 0.7;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playNewOrderSound = useCallback(async (): Promise<void> => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }
    } catch {
      // Autoplay blocked by browser
    }
  }, []);

  const setVolume = useCallback((volume: number): void => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  return { playNewOrderSound, setVolume };
}
