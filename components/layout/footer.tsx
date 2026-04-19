import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/images/logo/portl-logo-white.svg"
            alt="Portl Logo"
            width={64}
            height={24}
            className="h-6 w-auto opacity-60"
          />
        </Link>

        {/* Copyright */}
        <p className="text-muted-foreground text-xs">
          &copy; {new Date().getFullYear()} Portl. All rights reserved.
        </p>

        {/* Legal Links */}
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
