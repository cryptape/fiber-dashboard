"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { MainnetAPIClient, TestnetAPIClient } from "@/lib/client";

export type NetworkType = "mainnet" | "testnet";

interface NetworkContextType {
  currentNetwork: NetworkType;
  apiClient: MainnetAPIClient | TestnetAPIClient;
  switchNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>("mainnet");

  // Initialize API clients
  const mainnetClient = new MainnetAPIClient();
  const testnetClient = new TestnetAPIClient();

  // Get current API client based on network
  const apiClient =
    currentNetwork === "mainnet" ? mainnetClient : testnetClient;

  const switchNetwork = (network: NetworkType) => {
    setCurrentNetwork(network);
  };

  return (
    <NetworkContext.Provider
      value={{
        currentNetwork,
        apiClient,
        switchNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
