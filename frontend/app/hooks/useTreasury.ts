import { useState, useEffect } from 'react';
import { getTreasuryInfo } from '@/app/lib/contractUtils';
import { DEPLOYED_CONTRACTS } from '@/app/config/contracts';

interface TreasuryInfo {
  totalAssets: number;
  allocatedAssets: number;
  availableAssets: number;
  totalShares: number;
  allocatedShares: number;
  unallocatedShares: number;
  utilizationRate: number;
}

export function useTreasury() {
  const [treasuryInfo, setTreasuryInfo] = useState<TreasuryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTreasury = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await getTreasuryInfo();
      setTreasuryInfo(info);
    } catch (err) {
      console.error('Error fetching treasury:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch treasury info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasury();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTreasury, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    treasuryInfo,
    vaultAddress: DEPLOYED_CONTRACTS.nativeRewardVault,
    isLoading,
    error,
    refresh: fetchTreasury,
  };
}
