import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	// NOTE: serverActionsBodySizeLimit was removed in Next.js 16
	// Use API route middleware or request size limits in your runtime (Vercel, Docker, etc.)
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
		],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-XSS-Protection",
						value: "0",
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "geolocation=(), microphone=(), camera=()",
					},
					{
						key: "Content-Security-Policy",
						value: "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https://lh3.googleusercontent.com https://*.utfs.io https://*.uploadthing.com; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://*.uploadthing.com https://*.utfs.io; frame-ancestors 'none';",
					},
				],
			},
			{
				source: "/api/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store, no-cache, must-revalidate",
					},
				],
			},
			{
				source: "/:path*.(jpg|jpeg|png|gif|svg|webp|ico|js|css|woff|woff2)$",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
		];
	},
};

export default nextConfig;
