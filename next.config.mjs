/** @type {import('next').NextConfig} */
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          ...baseSecurityHeaders,
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        source: "/:path*",
        headers: baseSecurityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.bags.fm" },
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "**.ipfs.io" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "cdn.dexscreener.com" },
      { protocol: "https", hostname: "dd.dexscreener.com" },
      { protocol: "https", hostname: "pump.mypinata.cloud" },
      { protocol: "https", hostname: "shdw-drive.genesysgo.net" },
      { protocol: "https", hostname: "**.cloudflare-ipfs.com" },
      { protocol: "https", hostname: "**.digitaloceanspaces.com" },
      { protocol: "https", hostname: "img.bags.fm" },
    ],
  },
  webpack: (config, { isServer }) => {
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "bufferutil",
      "utf-8-validate"
    );
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
