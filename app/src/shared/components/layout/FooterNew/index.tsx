import Image from 'next/image';
import './index.css';

const footerLinks = {
  social: [
    { name: 'GitHub', href: 'https://github.com/driftluo/fiber-dashboard', icon: '/github.svg' },
    { name: 'Twitter', href: 'https://x.com/FiberDevs', icon: '/x.svg' },
    { name: 'Email', href: 'mailto:contact@example.com', icon: '/mail.svg' },
  ],
  resources: [
    { name: 'Documentation', href: 'https://docs.fiber.world' },
    { name: 'Official Fiber Website', href: 'https://fiber.world' },
    { name: 'Awesome Fiber', href: 'https://docs.fiber.world/showcase' },
    { name: 'Fiber Dashboard Github', href: 'https://github.com/nervosnetwork/fiber' },
  ],
  community: [
    { name: 'Discord', href: 'https://discord.gg' },
    { name: 'Twitter', href: 'https://x.com/FiberDevs' },
    { name: 'Blog', href: 'https://docs.fiber.world/blog' },
  ],
};

export default function FooterNew() {
  return (
    <footer className="footer-responsive glass-card glass-card-border w-full">
      <div className="flex flex-col gap-5">
        {/* Main content */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-0">
          {/* Left section - Brand */}
          <div className="w-full md:w-80 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Image src="/logo_m.svg" alt="Fiber" width={17} height={24} />
                <Image src="/logo_text.svg" alt="Fiber Dashboard" width={140} height={40} />
              </div>
              <div className="text-secondary type-body">
                Real-time insights into the CKB Lightning Network - Fiber
              </div>
            </div>
            <div className="flex gap-2">
              {footerLinks.social.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="w-10 h-10 rounded-lg flex justify-center items-center hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid #FFF', background: 'rgba(255, 255, 255, 0.30)' }}
                >
                  <Image src={link.icon} alt={link.name} width={16} height={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Right section - Links */}
          <div className="grid grid-cols-2 gap-12 sm:flex sm:flex-row sm:gap-20">
            {/* Resources */}
            <div className="w-full sm:w-48 flex flex-col gap-6">
              <div className="type-subheader text-primary">Resources</div>
              <div className="flex flex-col gap-4">
                {footerLinks.resources.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-caption text-secondary hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Community */}
            <div className="w-full sm:w-48 flex flex-col gap-6">
              <div className="type-subheader text-primary">Community</div>
              <div className="flex flex-col gap-4">
                {footerLinks.community.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-caption text-secondary hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: '#D9D9D9' }} />

        {/* Copyright */}
        <div className="type-caption text-secondary">
          © 2025 Fiber Dashboard. Made with ❤ for the Fiber community.️
        </div>
      </div>
    </footer>
  );
}