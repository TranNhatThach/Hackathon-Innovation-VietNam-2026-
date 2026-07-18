"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

type RecognitionEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export function useSpeech(onTranscript: (text: string) => void) {
  const recognitionRef = useRef<Recognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState({ stt: false, tts: true });

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setSpeaking(false);
  }, []);

  useEffect(() => {
    setSupported({ stt: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), tts: true });
    return () => { recognitionRef.current?.stop(); stopAudio(); };
  }, [stopAudio]);

  const toggleListening = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const RecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionApi) {
      setError("Trình duyệt này chưa hỗ trợ Web Speech API. Hãy dùng Chrome hoặc Edge.");
      return;
    }
    setError("");
    const recognition = new RecognitionApi();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Bạn cần cho phép trình duyệt sử dụng micro." : "Không nhận được giọng nói. Vui lòng thử lại.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [listening, onTranscript]);

  const speak = useCallback(async (text: string) => {
    if (speaking) { stopAudio(); return; }
    setError("");
    try {
      const plainText = text.replace(/[#*_`>\[\]()~-]/g, " ").replace(/\s+/g, " ").trim();
      const response = await fetch(`${getApiBaseUrl()}/api/speech/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText }),
      });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stopAudio;
      audio.onerror = () => { stopAudio(); setError("Không thể phát âm thanh từ FPT.AI."); };
      setSpeaking(true);
      await audio.play();
    } catch {
      stopAudio();
      setError("FPT.AI không thể tạo giọng đọc. Vui lòng thử lại.");
    }
  }, [speaking, stopAudio]);

  return { supported, listening, processing: false, speaking, error, toggleListening, speak };
}
