import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Lora, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const lora = Lora({
	variable: "--font-serif",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
	variable: "--font-sans",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
	title: "Jeg vil ha pengene mine!",
	description: "Personal household finance application",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${lora.variable} ${outfit.variable} antialiased`}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					{children}
					<Toaster richColors position="bottom-right" />
				</ThemeProvider>
			</body>
		</html>
	);
}
