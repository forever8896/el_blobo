import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { useTantoModal } from '@sky-mavis/tanto-widget';

/**
 * Custom hook that provides easy access to wallet connection state and actions
 * Wraps Wagmi's useAccount and Tanto Widget's useTantoModal
 */
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { show: showConnectModal, hide: hideConnectModal, open: isModalOpen } = useTantoModal();

  return {
    // Wallet state
    address,
    isConnected,
    isConnecting,
    chainId,

    // Actions
    connect: showConnectModal,
    disconnect,

    // Modal state
    isModalOpen,
    hideConnectModal,

    // Computed values
    shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
    isRoninMainnet: chainId === 2020,
    isRoninTestnet: chainId === 2021,
  };
}
