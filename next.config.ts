import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tofuu.getjusto.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'st.depositphotos.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.yoquiero.com.ar',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yyphmsxxzgjdvblfrfpv.supabase.co',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
};

export default nextConfig;
