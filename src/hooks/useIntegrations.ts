import { debugLogger } from '@/lib/debug';
import { AdminService, IntegrationDisplay, TestResult } from '@/services/admin/adminService';
import { useCallback, useState } from 'react';

export interface UseIntegrationsReturn {
  integrations: IntegrationDisplay[];
  loading: boolean;
  connecting: Record<string, boolean>;
  testing: Record<string, boolean>;
  testResults: Record<string, TestResult>;
  loadIntegrations: () => Promise<void>;
  connectIntegration: (platform: string) => Promise<void>;
  disconnectIntegration: (platform: string) => Promise<void>;
  testConnection: (platform: string) => Promise<TestResult>;
  setConnecting: (platform: string, isConnecting: boolean) => void;
  setTesting: (platform: string, isTesting: boolean) => void;
}

export const useIntegrations = (): UseIntegrationsReturn => {
  const [integrations, setIntegrations] = useState<IntegrationDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const integrationsData = await AdminService.loadIntegrations();
      setIntegrations(integrationsData);
    } catch (error) {
      debugLogger.error('useIntegrations', 'Failed to load integrations', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectIntegration = useCallback(async (platform: string) => {
    try {
      setConnecting(prev => ({ ...prev, [platform]: true }));
      await AdminService.connectIntegration(platform);
      await loadIntegrations(); // Refresh the list
    } catch (error) {
      debugLogger.error('useIntegrations', `Failed to connect ${platform}`, error);
      throw error;
    } finally {
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  }, [loadIntegrations]);

  const disconnectIntegration = useCallback(async (platform: string) => {
    try {
      setConnecting(prev => ({ ...prev, [platform]: true }));
      await AdminService.disconnectIntegration(platform);
      await loadIntegrations(); // Refresh the list
    } catch (error) {
      debugLogger.error('useIntegrations', `Failed to disconnect ${platform}`, error);
      throw error;
    } finally {
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  }, [loadIntegrations]);

  const testConnection = useCallback(async (platform: string): Promise<TestResult> => {
    try {
      setTesting(prev => ({ ...prev, [platform]: true }));
      const result = await AdminService.testConnection(platform);
      setTestResults(prev => ({ ...prev, [platform]: result }));
      return result;
    } catch (error) {
      debugLogger.error('useIntegrations', `Failed to test ${platform}`, error);
      const errorResult: TestResult = { success: false, message: `Test failed: ${error}` };
      setTestResults(prev => ({ ...prev, [platform]: errorResult }));
      return errorResult;
    } finally {
      setTesting(prev => ({ ...prev, [platform]: false }));
    }
  }, []);

  const setConnectingState = useCallback((platform: string, isConnecting: boolean) => {
    setConnecting(prev => ({ ...prev, [platform]: isConnecting }));
  }, []);

  const setTestingState = useCallback((platform: string, isTesting: boolean) => {
    setTesting(prev => ({ ...prev, [platform]: isTesting }));
  }, []);

  return {
    integrations,
    loading,
    connecting,
    testing,
    testResults,
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    testConnection,
    setConnecting: setConnectingState,
    setTesting: setTestingState
  };
};
