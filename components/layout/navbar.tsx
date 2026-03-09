import Link from 'next/link';
import Image from 'next/image';
import { HeaderActions } from './header-actions';

export default async function Navbar() {
  return (
    <nav className="bg-background fixed top-0 w-full px-6 md:px-12 py-4 flex items-center justify-between z-50">
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
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <Link
          href="#about"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          About Us
        </Link>
        <Link
          href="#services"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Services
        </Link>
        <Link
          href="#faq"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          FAQ
        </Link>
      </div>

      {/* Action Buttons */}
      <HeaderActions />
    </nav>
  );
}
