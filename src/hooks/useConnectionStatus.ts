import { useState, useEffect, useCallback } from 'react'
import { supabase, checkSupabaseConnectionWithRetry } from '@/lib/supabase'
import { globalConnectionRecovery } from '@/lib/connection-recovery'
import { performanceLogger } from '@/lib/performance'

interface ConnectionStatus {
  isConnected: boolean;
  isRetrying: boolean;
  retryAttempt: number;
  lastError?: string;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: true,
    isRetrying: false,
    retryAttempt: 0,
  });

  const checkConnection = useCallback(async () => {
    performanceLogger.start('connection.check');
    
    const isConnected = await checkSupabaseConnectionWithRetry();
    
    performanceLogger.end('connection.check', { isConnected });
    
    setStatus(prev => ({
      ...prev,
      isConnected,
      isRetrying: globalConnectionRecovery.isCurrentlyRetrying(),
      retryAttempt: globalConnectionRecovery.getRetryAttempt(),
    }));
    
    return isConnected;
  }, []);

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      checkConnection();
    }, 30000); // Check every 30 seconds

    // Listen for Supabase connection state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkConnection();
      }
    });

    // Monitor online/offline status
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      setStatus(prev => ({ ...prev, lastError: undefined }));
      checkConnection();
    };

    const handleOffline = () => {
      console.log('📵 Network connection lost');
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        lastError: 'Network connection lost',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(healthCheckInterval);
      authListener?.subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      globalConnectionRecovery.stop();
    };
  }, [checkConnection]);

  return {
    ...status,
    checkConnection,
  };
}