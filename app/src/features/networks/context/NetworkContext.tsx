"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  // Initialize with null to indicate not yet loaded
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType | null>(null);

  // Load saved network from localStorage on client-side mount
  useEffect(() => {
    const savedNetwork = localStorage.getItem("fiber-dashboard-network");
    if (savedNetwork && (savedNetwork === "mainnet" || savedNetwork === "testnet")) {
      setCurrentNetwork(savedNetwork as NetworkType);
    } else {
      setCurrentNetwork("mainnet");
    }
  }, []);

  // Save network selection to localStorage whenever it changes
  useEffect(() => {
    if (currentNetwork !== null) {
      localStorage.setItem("fiber-dashboard-network", currentNetwork);
    }
  }, [currentNetwork]);

  // Don't render until network is loaded from localStorage
  if (currentNetwork === null) {
    return null;
  }

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
