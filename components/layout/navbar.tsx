import Link from 'next/link';
import Image from 'next/image';
import { HeaderActions } from './header-actions';

export default async function Navbar() {
  return (
    <nav className="fixed top-0 w-full px-6 md:px-12 py-4 flex items-center justify-between z-50 bg-background/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center">
        <Link href="/">
          <Image
            src="/images/logo/portl-logo-white.svg"
            alt="Portl Logo"
            width={80}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-6 text-sm">
        <Link
          href="#highlights"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Experiences
        </Link>
        <Link
          href="#highlights"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Events
        </Link>
        <Link
          href="#faq"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Venues
        </Link>
      </div>

      {/* Action Buttons */}
      <HeaderActions />
    </nav>
  );
}
