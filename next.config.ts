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
};

export default nextConfig;
