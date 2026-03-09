import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import type { NextAuthConfig } from 'next-auth';
import bcrypt from 'bcryptjs';

const isSecure = process.env.NODE_ENV === 'production';

// Root domain for cookie sharing and redirect validation
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lvh.me:3000';
const rootHostname = rootDomain.split(':')[0]; // e.g. "lvh.me"

// Derive cookie domain from root domain so session cookies are shared across subdomains
const cookieDomain = (() => {
  if (rootHostname === 'localhost') return '.localhost';
  return '.' + rootHostname; // e.g. ".lvh.me" or ".portl.com"
})();

export const config = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Construct full name from firstName and lastName
        const fullName = user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.lastName || null;

        return {
          id: user.id,
          email: user.email,
          name: fullName,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same origin
      if (url.startsWith(baseUrl)) return url;
      // Allow any subdomain of root domain (e.g. acme.lvh.me:3000)
      try {
        const target = new URL(url);
        const targetHostname = target.hostname;
        if (
          targetHostname === rootHostname ||
          targetHostname.endsWith(`.${rootHostname}`)
        ) {
          return url;
        }
      } catch {}
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.roleCheckedAt = Date.now();
      }

      // Re-fetch role from DB every 5 minutes to pick up changes
      const ROLE_REFRESH_MS = 5 * 60 * 1000;
      if (
        !token.roleCheckedAt ||
        Date.now() - (token.roleCheckedAt as number) > ROLE_REFRESH_MS
      ) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          token.role = dbUser?.role ?? 'USER';
        } catch {
          // Keep existing role on DB failure
        }
        token.roleCheckedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt', // Must use JWT for Credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Cookie domain for cross-subdomain sharing (admin.domain.com needs access)
  // .localhost in dev, .portl.com (or similar) in production
  cookies: {
    sessionToken: {
      name: isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isSecure,
        domain: cookieDomain,
      },
    },
    callbackUrl: {
      name: isSecure ? '__Secure-authjs.callback-url' : 'authjs.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: isSecure,
        domain: cookieDomain,
      },
    },
  },
  trustHost: true,
  useSecureCookies: isSecure,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
