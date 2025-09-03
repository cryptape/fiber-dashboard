"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ChevronDown, Globe, Users } from "lucide-react";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import type { NetworkType } from "@/features/networks/context/NetworkContext";

export function NetworkSwitcher() {
  const { currentNetwork, switchNetwork } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const networks: {
    value: NetworkType;
    icon: React.ElementType;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }[] = [
    {
      value: "mainnet",
      icon: Globe,
      badgeVariant: "default",
    },
    {
      value: "testnet",
      icon: Users,
      badgeVariant: "default",
    },
  ];

  const currentNetworkConfig = networks.find(n => n.value === currentNetwork);
  const CurrentIcon = currentNetworkConfig?.icon || Globe;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNetworkSwitch = (network: NetworkType) => {
    switchNetwork(network);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 hover:bg-primary/5 hover:text-primary transition-all duration-200 font-medium"
      >
        <Badge
          variant={currentNetworkConfig?.badgeVariant}
          className="text-xs font-medium"
        >
          <CurrentIcon className="h-4 w-4" />
          {currentNetwork.toUpperCase()}
        </Badge>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-border rounded-md shadow-lg z-50">
          {networks.map(network => {
            const Icon = network.icon;
            const isActive = currentNetwork === network.value;

            return (
              <button
                key={network.value}
                onClick={() => handleNetworkSwitch(network.value)}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Badge
                  variant={network.badgeVariant}
                  className="text-xs font-medium"
                >
                  <Icon className="h-4 w-4" />
                  {network.value.toUpperCase()}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
