/**
 * useVLLMChat - React Hook for vLLM AI Assistant Integration
 * 
 * Features:
 * - Conversation history management
 * - Streaming support for real-time responses
 * - Medical safety escalation handling
 * - Session persistence
 * - Multi-language support
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMQueryResponse {
  response: string;
  session_id: string;
  escalation_level: 'green' | 'yellow' | 'red' | 'block';
  escalation_reason: string;
  model: string;
  language: string;
}

export interface UseVLLMChatOptions {
  baseUrl?: string;
  sessionId?: string;
  userId?: string;
  language?: 'en' | 'vi';
  onStream?: (chunk: string) => void;
}

export interface UseVLLMChatReturn {
  messages: ChatMessage[];
  sessionId: string;
  loading: boolean;
  error: string | null;
  escalationLevel: string | null;
  escalationReason: string | null;
  sendMessage: (message: string, stream?: boolean) => Promise<void>;
  clearHistory: () => void;
  isStreaming: boolean;
}

export function useVLLMChat(options: UseVLLMChatOptions = {}): UseVLLMChatReturn {
  const {
    baseUrl = 'http://localhost:8000',
    sessionId: initialSessionId,
    userId = 'patient-default',
    language = 'en',
    onStream,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>(
    initialSessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalationLevel, setEscalationLevel] = useState<string | null>(null);
  const [escalationReason, setEscalationReason] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Health check on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/llm/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          console.warn('vLLM engine health check failed');
        }
      } catch (err) {
        console.warn('Could not connect to vLLM engine:', err);
      }
    };

    checkHealth();
  }, [baseUrl]);

  const sendMessage = useCallback(
    async (message: string, stream: boolean = false) => {
      if (!message.trim()) {
        setError('Message cannot be empty');
        return;
      }

      setLoading(true);
      setError(null);
      setEscalationLevel(null);
      setEscalationReason(null);

      // Add user message to history
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message },
      ]);

      try {
        const endpoint = stream ? '/api/llm/query/stream' : '/api/llm/query';
        const url = `${baseUrl}${endpoint}`;

        const requestBody = {
          message,
          session_id: sessionId,
          user_id: userId,
          language,
          history: messages,
          stream,
        };

        if (stream) {
          // Streaming mode
          abortControllerRef.current = new AbortController();
          setIsStreaming(true);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: abortControllerRef.current.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              assistantMessage += chunk;

              if (onStream) {
                onStream(chunk);
              }

              // Update messages with streaming content
              setMessages((prev) => {
                const updated = [...prev];
                if (
                  updated.length > 0 &&
                  updated[updated.length - 1].role === 'assistant'
                ) {
                  updated[updated.length - 1].content = assistantMessage;
                } else {
                  updated.push({
                    role: 'assistant',
                    content: assistantMessage,
                  });
                }
                return updated;
              });
            }
          } finally {
            reader.releaseLock();
          }

          setIsStreaming(false);
        } else {
          // Non-streaming mode
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data: LLMQueryResponse = await response.json();

          // Store escalation info
          setEscalationLevel(data.escalation_level);
          setEscalationReason(data.escalation_reason);

          // Update session ID if provided
          if (data.session_id) {
            setSessionId(data.session_id);
          }

          // Add assistant message to history
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.response },
          ]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';

        // Only set error if it's not an abort
        if (errorMessage !== 'AbortError') {
          setError(errorMessage);
          console.error('vLLM error:', err);
        }
      } finally {
        setLoading(false);
        setIsStreaming(false);
      }
    },
    [messages, sessionId, userId, language, baseUrl, onStream]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
    setEscalationLevel(null);
    setEscalationReason(null);
  }, []);

  return {
    messages,
    sessionId,
    loading,
    error,
    escalationLevel,
    escalationReason,
    sendMessage,
    clearHistory,
    isStreaming,
  };
}

/**
 * Example usage in a React component:
 *
 * export function ChatComponent() {
 *   const {
 *     messages,
 *     loading,
 *     error,
 *     escalationLevel,
 *     escalationReason,
 *     sendMessage,
 *     isStreaming,
 *   } = useVLLMChat({
 *     baseUrl: 'http://localhost:8000',
 *     language: 'en',
 *     onStream: (chunk) => console.log('Streaming:', chunk),
 *   });
 *
 *   const handleSend = async (message: string) => {
 *     // Use streaming for long responses
 *     await sendMessage(message, true);
 *   };
 *
 *   return (
 *     <div className="chat-container">
 *       {/* Display escalation warning if needed */}
 *       {escalationLevel === 'red' && (
 *         <div className="alert alert-danger">
 *           ⚠️ {escalationReason}
 *         </div>
 *       )}
 *
 *       {escalationLevel === 'yellow' && (
 *         <div className="alert alert-warning">
 *           ℹ️ {escalationReason}
 *         </div>
 *       )}
 *
 *       {/* Display error if any */}
 *       {error && <div className="alert alert-danger">Error: {error}</div>}
 *
 *       {/* Display chat messages */}
 *       <div className="messages">
 *         {messages.map((msg, idx) => (
 *           <div key={idx} className={`message message-${msg.role}`}>
 *             {msg.content}
 *           </div>
 *         ))}
 *       </div>
 *
 *       {/* Streaming indicator */}
 *       {isStreaming && <div className="typing-indicator">AI is typing...</div>}
 *
 *       {/* Input form */}
 *       <ChatInput
 *         onSend={handleSend}
 *         disabled={loading || isStreaming}
 *       />
 *     </div>
 *   );
 * }
 */
