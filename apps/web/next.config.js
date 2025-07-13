/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects: async () => {
    // Disable redirects for desktop build (static export)
    if (process.env.BUILD_MODE === 'desktop') {
      return [];
    }
    
    return [
      {
        source: "/github",
        destination: "https://github.com/steven-tey/novel",
        permanent: true,
      },
      {
        source: "/sdk",
        destination: "https://www.npmjs.com/package/novel",
        permanent: true,
      },
      {
        source: "/npm",
        destination: "https://www.npmjs.com/package/novel",
        permanent: true,
      },
      {
        source: "/svelte",
        destination: "https://github.com/tglide/novel-svelte",
        permanent: false,
      },
      {
        source: "/vue",
        destination: "https://github.com/naveennaidu/novel-vue",
        permanent: false,
      },
      {
        source: "/vscode",
        destination:
          "https://marketplace.visualstudio.com/items?itemName=bennykok.novel-vscode",
        permanent: false,
      },
      {
        source: "/feedback",
        destination: "https://github.com/steven-tey/novel/issues",
        permanent: true,
      },
      {
        source: "/deploy",
        destination: "https://vercel.com/templates/next.js/novel",
        permanent: true,
      },
    ];
  },
  productionBrowserSourceMaps: true,
  // Support for static export (needed for Tauri desktop app build, not dev)
  output: process.env.BUILD_MODE === 'desktop' && process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: process.env.BUILD_MODE === 'desktop' && process.env.NODE_ENV === 'production' ? true : false,
  images: {
    unoptimized: process.env.BUILD_MODE === 'desktop' && process.env.NODE_ENV === 'production' ? true : false,
  },
  // Skip dynamic route validation for static export
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
