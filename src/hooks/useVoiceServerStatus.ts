import { useState, useEffect, useCallback, useRef } from 'react';

export type VoiceServerConnectionStatus = 'checking' | 'connected' | 'unreachable';

export interface UseVoiceServerStatusOptions {
  serverUrl: string;
  enabled: boolean;
  intervalMs?: number;
}

export interface UseVoiceServerStatusReturn {
  status: VoiceServerConnectionStatus;
  isChecking: boolean;
  errorMessage: string | null;
  checkHealth: () => Promise<boolean>;
}

export function useVoiceServerStatus({
  serverUrl,
  enabled,
  intervalMs = 6000,
}: UseVoiceServerStatusOptions): UseVoiceServerStatusReturn {
  const [status, setStatus] = useState<VoiceServerConnectionStatus>('checking');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    // Cancel any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsChecking(true);
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/health`, {
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          setStatus('connected');
          setErrorMessage(null);
          setIsChecking(false);
          return true;
        }
      }
      setStatus('unreachable');
      setErrorMessage('Server phản hồi nhưng trạng thái không sẵn sàng');
      setIsChecking(false);
      return false;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
      setStatus('unreachable');
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể kết nối đến server'
      );
      setIsChecking(false);
      return false;
    }
  }, [enabled, serverUrl]);

  useEffect(() => {
    if (!enabled) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsChecking(false);
      return;
    }

    // Immediately check health when enabled is true
    checkHealth();

    const timerId = setInterval(() => {
      checkHealth();
    }, intervalMs);

    return () => {
      clearInterval(timerId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, intervalMs, checkHealth]);

  return {
    status,
    isChecking,
    errorMessage,
    checkHealth,
  };
}
