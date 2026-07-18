"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api";

interface UseSTTReturn {
  supported: boolean;
  listening: boolean;
  isProcessing: boolean;
  realTimeTranscript: string;
  errorMessage: string | null;
  toggleListening: () => void;
  stopListening: () => void;
  clearError: () => void;
}

export function useSTT(): UseSTTReturn {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [realTimeTranscript, setRealTimeTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // STEP 1: Use Refs for Mutable Instances
  // By storing these instances in refs, their creation/mutation does not trigger
  // React re-render cycles, and we avoid the infinite connection recreation loops.
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Check browser capability on mount
  useEffect(() => {
    mountedRef.current = true;
    const hasMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    setSupported(hasMedia);
    
    return () => {
      mountedRef.current = false;
      // STEP 3: Cleanup is mandatory on unmount
      cleanup();
    };
  }, []);

  // STEP 1: Stable Callback for silence timeout
  // Wrapped in useCallback to prevent startStreaming/stopListening from constantly being recreated.
  const resetSilenceTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log("[STT] 3s silence detected, auto-stopping.");
      stopListening();
    }, 3000);
  }, []);

  // STEP 3: Cleanup implementation to release resources
  const cleanup = useCallback(() => {
    // 1. Clear silence timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // 2. Close WebSocket connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    // 3. Stop MediaRecorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      mediaRecorderRef.current = null;
    }
    // 4. Release Microphone stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    cleanup();
    setListening(false);
  }, [cleanup]);

  const startStreaming = useCallback(async () => {
    // STEP 1: Single Connection Logic Guard Clause
    // If the socket is already connecting or open, exit immediately.
    // This blocks rapid multi-clicks or state-change re-renders from opening duplicate sockets.
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.CONNECTING ||
        wsRef.current.readyState === WebSocket.OPEN)
    ) {
      console.log("[STT] Connection already active or opening. Ignoring request.");
      return;
    }

    setErrorMessage(null);
    setRealTimeTranscript("");
    cleanup();

    try {
      // 1. Construct WebSocket endpoint
      const baseUrl = getApiBaseUrl();
      const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      let hostAndPort = "";
      if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
        const urlObj = new URL(baseUrl);
        hostAndPort = urlObj.host;
      } else {
        hostAndPort = window.location.host;
      }
      
      const wsUrl = `${wsScheme}//${hostAndPort}/api/v1/stt/stream`;
      console.log("[STT] Establishing WebSocket connection:", wsUrl);
      
      // Store the WebSocket inside the ref strictly
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onerror = (err) => {
        console.error("[STT] WebSocket error event:", err);
        if (mountedRef.current) {
          setErrorMessage("Không thể kết nối với máy chủ ghi âm.");
        }
      };

      socket.onclose = (event) => {
        console.log("[STT] WebSocket closed event:", event.code);
        if (mountedRef.current) {
          setListening(false);
        }
      };

      socket.onmessage = (event) => {
        if (!mountedRef.current) return;
        const deltaText = event.data;
        if (deltaText) {
          setRealTimeTranscript((prev) => {
            const next = prev ? prev + " " + deltaText : deltaText;
            return next;
          });
        }
      };

      // 2. Acquire microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Setup MediaRecorder only when connection opens successfully
      socket.onopen = () => {
        console.log("[STT] WebSocket connected. Initializing MediaRecorder.");
        if (!mountedRef.current || !streamRef.current) return;

        setListening(true);
        resetSilenceTimeout();

        let options = {};
        if (typeof MediaRecorder !== "undefined") {
          if (MediaRecorder.isTypeSupported("audio/webm")) {
            options = { mimeType: "audio/webm" };
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            options = { mimeType: "audio/mp4" };
          }
        }

        try {
          const mediaRecorder = new MediaRecorder(streamRef.current, options);
          mediaRecorderRef.current = mediaRecorder;

          // STEP 2: Only send audio chunks if WebSocket is fully OPEN
          mediaRecorder.ondataavailable = (event) => {
            if (
              event.data &&
              event.data.size > 0 &&
              wsRef.current?.readyState === WebSocket.OPEN
            ) {
              wsRef.current.send(event.data);
              resetSilenceTimeout();
            }
          };

          // Timeslice of 250ms triggers dataavailable events periodically
          mediaRecorder.start(250);
        } catch (recorderErr) {
          console.error("[STT] MediaRecorder init error:", recorderErr);
          setErrorMessage("Lỗi cấu hình thiết bị thu âm.");
          stopListening();
        }
      };

    } catch (err: any) {
      console.error("[STT] Microphone access failed:", err);
      if (mountedRef.current) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setErrorMessage("Vui lòng cấp quyền sử dụng Micro cho trình duyệt.");
        } else {
          setErrorMessage("Lỗi khởi tạo micro thu âm thời gian thực.");
        }
        setListening(false);
      }
      cleanup();
    }
  }, [cleanup, resetSilenceTimeout, stopListening]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      void startStreaming();
    }
  }, [listening, startStreaming, stopListening]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    supported,
    listening,
    isProcessing,
    realTimeTranscript,
    errorMessage,
    toggleListening,
    stopListening,
    clearError,
  };
}
