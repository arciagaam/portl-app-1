import Link from 'next/link';
import { Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Social Icons */}
        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Twitter"
          >
            <Twitter className="size-4" />
          </Link>
          <Link
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="size-4" />
          </Link>
          <Link
            href="#"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="size-4" />
          </Link>
        </div>

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
