"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api";

interface UseTTSReturn {
  /** Whether the browser supports audio playback */
  supported: boolean;
  /** Whether the audio is currently playing */
  speaking: boolean;
  /** Whether TTS is muted */
  muted: boolean;
  /** Toggle mute state */
  toggleMute: () => void;
  /** Synthesize and speak the given text */
  speak: (text: string) => void;
  /** Cancel/Stop ongoing audio playback */
  cancel: () => void;
}

const PHONETIC_DICT: Record<string, string> = {
  "RAG": "rắc",
  "BHYT": "bảo hiểm y tế",
  "BHXH": "bảo hiểm xã hội",
  "CCCD": "căn cước công dân",
  "CMND": "chứng minh nhân dân",
  "AI": "ây ai",
  "CLS": "cận lâm sàng",
  "SA": "siêu âm",
  "XQ": "quang",
  "X-Quang": "ích quang",
  "MRI": "em rai",
  "CT": "xi ti",
  "ECG": "ê xê giê",
  "BN": "bệnh nhân",
  "BS": "bác sĩ",
  "NV": "nhân viên",
  "PK": "phòng khám",
  "TCC": "tuyển chọn ca",
  "NĐT": "người điều trị",
  "KCB": "khám chữa bệnh",
};

function cleanTextForSpeech(text: string): string {
  let cleanText = text;

  // Replace abbreviations from dictionary
  Object.entries(PHONETIC_DICT).forEach(([key, value]) => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    cleanText = cleanText.replace(regex, value);
  });

  // Strip markdown formatting
  cleanText = cleanText
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[|\-]{3,}/g, "")
    .replace(/^\s*[-*]\s/gm, "")
    .replace(/`[^`]+`/g, "");

  // Remove emojis
  cleanText = cleanText.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ""
  );

  // Convert newlines to natural pauses
  cleanText = cleanText
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();

  return cleanText;
}

export function useTTS(): UseTTSReturn {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setSupported(typeof window !== "undefined" && typeof Audio !== "undefined");
    
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (e) {
        console.error("Error pausing audio:", e);
      }
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!supported || muted || !text.trim()) return;

      // Cancel any ongoing playback
      cancel();

      const cleanedText = cleanTextForSpeech(text);
      if (!cleanedText) return;

      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: cleanedText }),
        });

        if (!response.ok) {
          throw new Error(`TTS server returned status ${response.status}`);
        }

        const blob = await response.blob();
        if (!mountedRef.current) return;

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => {
          if (mountedRef.current) {
            setSpeaking(true);
          }
        };

        audio.onended = () => {
          if (mountedRef.current) {
            setSpeaking(false);
          }
          URL.revokeObjectURL(url);
          if (audioUrlRef.current === url) {
            audioUrlRef.current = null;
          }
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          if (mountedRef.current) {
            setSpeaking(false);
          }
          URL.revokeObjectURL(url);
          if (audioUrlRef.current === url) {
            audioUrlRef.current = null;
          }
        };

        await audio.play();
      } catch (err) {
        console.error("FPT VITs TTS generation or play error:", err);
        if (mountedRef.current) {
          setSpeaking(false);
        }
      }
    },
    [supported, muted, cancel]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      if (!prev) {
        cancel();
      }
      return !prev;
    });
  }, [cancel]);

  return { supported, speaking, muted, toggleMute, speak, cancel };
}
