import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActionsBodySizeLimit: "25mb",
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
		],
	},
};

export default nextConfig;
