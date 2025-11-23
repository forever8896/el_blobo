"use client";

import { getDefaultConfig, TantoProvider } from '@sky-mavis/tanto-widget';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ReactNode, useEffect, useState } from 'react';

// Singleton pattern to prevent recreation during hot reloads
let globalConfig: ReturnType<typeof getDefaultConfig> | undefined;
let globalQueryClient: QueryClient | undefined;

function getConfig() {
  if (!globalConfig) {
    globalConfig = getDefaultConfig({
      keylessWalletConfig: {
        enable: false,
        clientId: '', // Empty string since it's disabled
      },
    });
  }
  return globalConfig;
}

function getQueryClient() {
  if (!globalQueryClient) {
    globalQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: false,
        },
      },
    });
  }
  return globalQueryClient;
}

const config = getConfig();
const queryClient = getQueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <TantoProvider
          theme="dark"
          config={{
            initialChainId: 2021, // Ronin Testnet
            hideConnectSuccessPrompt: false,
            disableProfile: false,
          }}
        >
          {children}
        </TantoProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
