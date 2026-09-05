import { useState, useEffect, useCallback, useRef } from 'react';

export type VoiceServerConnectionStatus =
  | 'checking'
  | 'connected'
  | 'model_missing'
  | 'unreachable';

export interface HealthResponse {
  ok: boolean;
  model_loaded: boolean;
  reason?: string;
  model_dir?: string;
  model_name?: string;
  index_name?: string;
}

export interface UseVoiceServerStatusOptions {
  serverUrl: string;
  enabled: boolean;
  intervalMs?: number;
}

export interface UseVoiceServerStatusReturn {
  status: VoiceServerConnectionStatus;
  isChecking: boolean;
  errorMessage: string | null;
  modelDir: string | null;
  modelName: string | null;
  checkHealth: () => Promise<boolean>;
  reloadModel: () => Promise<boolean>;
}

export function useVoiceServerStatus({
  serverUrl,
  enabled,
  intervalMs = 6000,
}: UseVoiceServerStatusOptions): UseVoiceServerStatusReturn {
  const [status, setStatus] = useState<VoiceServerConnectionStatus>('checking');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelDir, setModelDir] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
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
        const data = (await res.json()) as HealthResponse;
        if (data) {
          if (data.ok && data.model_loaded) {
            setStatus('connected');
            setModelDir(data.model_dir || null);
            setModelName(data.model_name || null);
            setErrorMessage(null);
            setIsChecking(false);
            return true;
          } else if (data.reason === 'model_missing' || !data.model_loaded) {
            setStatus('model_missing');
            setModelDir(data.model_dir || null);
            setModelName(null);
            setErrorMessage('Chưa có file model (.pth) trong thư mục');
            setIsChecking(false);
            return false;
          }
        }
      }
      setStatus('unreachable');
      setModelDir(null);
      setModelName(null);
      setErrorMessage('Server phản hồi nhưng trạng thái không sẵn sàng');
      setIsChecking(false);
      return false;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
      setStatus('unreachable');
      setModelDir(null);
      setModelName(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể kết nối đến server'
      );
      setIsChecking(false);
      return false;
    }
  }, [enabled, serverUrl]);

  const reloadModel = useCallback(async (): Promise<boolean> => {
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/model/reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await checkHealth();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [serverUrl, checkHealth]);

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
    modelDir,
    modelName,
    checkHealth,
    reloadModel,
  };
}

