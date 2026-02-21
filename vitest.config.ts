import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: [
				"lib/format.ts",
				"lib/csv-detect.ts",
				"lib/loan-math.ts",
				"lib/utils.ts",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
		},
	},
});
