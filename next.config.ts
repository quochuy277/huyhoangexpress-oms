import type { NextConfig } from "next";

// Content-Security-Policy (Report-Only)
// Start in Report-Only to collect violations for 1-2 weeks before enforcing.
// Next.js bootstraps React with inline scripts, and Tailwind injects inline
// styles, so both 'unsafe-inline' are required until we switch to nonce-based.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // Browsers POST violation reports here. We log them server-side so we can
  // watch for 1-2 weeks before tightening 'unsafe-inline'/'unsafe-eval'.
  // report-uri is deprecated but still supported in all major browsers;
  // report-to requires a separate Report-To header and Reporting API setup.
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  devIndicators: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy-Report-Only",
          value: cspDirectives,
        },
      ],
    },
  ],
};

export default nextConfig;

