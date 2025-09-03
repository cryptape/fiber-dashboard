"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { NetworkSwitcher } from "@/features/networks/components/NetworkSwitcher";
import { Zap, Menu, X, ExternalLink, Search, Keyboard } from "lucide-react";
import { useState } from "react";
import { APP_CONFIG } from "@/lib/const";

const navigation: { name: string; href: string; icon: React.ElementType }[] =
  [];

const externalLinks = [
  { name: "FIBER", href: "https://fiber.world", icon: ExternalLink },
  {
    name: "GitHub",
    href: "https://github.com/nervosnetwork/fiber",
    icon: ExternalLink,
  },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all duration-200 group-hover:scale-105">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {APP_CONFIG.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {APP_CONFIG.shortDescription}
                </p>
              </div>
            </Link>
            <Badge
              variant="secondary"
              className="hidden md:inline-flex bg-primary/10 text-primary border-primary/20 text-xs font-medium"
            >
              Beta
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  size="sm"
                  asChild
                  className="flex items-center space-x-2 hover:bg-primary/5 hover:text-primary transition-all duration-200 font-medium"
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-200"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search</span>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <Keyboard className="h-3 w-3" />
                <span>⌘K</span>
              </div>
            </Button>

            {/* External Links */}
            <div className="flex items-center space-x-2">
              {externalLinks.map(item => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.name}
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex items-center space-x-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-medium"
                  >
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </a>
                  </Button>
                );
              })}
            </div>

            {/* Network Switcher */}
            <NetworkSwitcher />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hover:bg-primary/5 hover:text-primary transition-all duration-200"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-white/95 backdrop-blur-md shadow-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map(item => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className="w-full justify-start flex items-center space-x-3 hover:bg-primary/5 hover:text-primary transition-all duration-200 font-medium"
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </Button>
                );
              })}
              <div className="pt-2 border-t border-border/50">
                {externalLinks.map(item => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.name}
                      variant="outline"
                      className="w-full justify-start flex items-center space-x-3 mt-1 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-medium"
                      asChild
                    >
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </a>
                    </Button>
                  );
                })}
                <Button className="w-full justify-start flex items-center space-x-3 mt-2 btn-zed-primary">
                  <span>Testnet</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
