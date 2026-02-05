import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [
    "@towns-protocol/generated",
    "@towns-protocol/web3",
    "@towns-protocol/react-sdk",
    "@towns-protocol/rpc-connector",
    "@towns-protocol/sdk",
    "@towns-protocol/sdk-crypto",
    "@towns-protocol/utils",
    "@towns-protocol/encryption",
  ],
};

export default nextConfig;
