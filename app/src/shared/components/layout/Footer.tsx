import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  Zap,
  Github,
  Twitter,
  ExternalLink,
  Heart,
  Mail,
  MessageCircle,
} from "lucide-react";
import { APP_CONFIG } from "@/lib";

const footerLinks = {
  product: [
    { name: "Dashboard", href: "/" },
    { name: "Awesome Fiber", href: "https://docs.fiber.world/showcase" },
  ],
  resources: [
    { name: "Documentation", href: "https://docs.fiber.world" },
    { name: "Official website", href: "https://fiber.world" },
    {
      name: "GitHub",
      href: "https://github.com/nervosnetwork/fiber",
      external: true,
    },
  ],
  community: [
    { name: "Discord", href: "https://discord.gg", external: true },
    { name: "Twitter", href: "https://x.com/FiberDevs", external: true },
    { name: "Blog", href: "https://docs.fiber.world/blog" },
  ],
};

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/driftluo/fiber-dashboard",
    icon: Github,
  },
  { name: "Twitter", href: "https://x.com/FiberDevs", icon: Twitter },
  { name: "Discord", href: "https://discord.gg", icon: MessageCircle },
  { name: "Email", href: "mailto:contact@example.com", icon: Mail },
];

export default function Footer() {
  return (
    <footer className="bg-white/50 backdrop-blur-sm border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all duration-200 group-hover:scale-105">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {APP_CONFIG.name}
                </h3>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {APP_CONFIG.description}
            </p>
            <div className="flex items-center space-x-4">
              {socialLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.name}
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                  >
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.name}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-6 text-lg">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-6 text-lg">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map(link => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center space-x-2 font-medium"
                    >
                      <span>{link.name}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-6 text-lg">
              Community
            </h4>
            <ul className="space-y-3">
              {footerLinks.community.map(link => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center space-x-2 font-medium"
                    >
                      <span>{link.name}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="mb-8 bg-border/50" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Copyright */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>© 2025 {APP_CONFIG.name}. Made with</span>
            <Heart className="h-4 w-4 text-red-500 animate-pulse" />
            <span>for the Fiber community.</span>
          </div>

          {/* Additional Links */}
          <div className="flex items-center space-x-6 text-sm">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <Link
              href="/status"
              className="text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
