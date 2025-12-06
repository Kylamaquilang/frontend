/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic production optimizations
  compress: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '5000',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  // Keep your webpack customizations
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.jsx'],
    };
    return config;
  },

  // Add empty Turbopack config to avoid errors
  turbopack: {},
};

export default nextConfig;
