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
        hostname: 'st.depositphotos.com', // El dominio que causaba el error
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.yoquiero.com.ar', // El dominio que causaba el error
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com', // El dominio de Google Images
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com', // El dominio de Wix para la nueva imagen
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com', // El dominio de Wix para la nueva imagen
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yyphmsxxzgjdvblfrfpv.supabase.co', // Tu instancia de Supabase
        pathname: '/**',
      },
            
    ],
  },
  /* config options here */
};

export default nextConfig;