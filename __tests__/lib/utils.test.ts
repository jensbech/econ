import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (className merger)", () => {
	it("returns empty string for no arguments", () => {
		expect(cn()).toBe("");
	});

	it("returns a single class unchanged", () => {
		expect(cn("foo")).toBe("foo");
	});

	it("merges multiple classes with a space", () => {
		const result = cn("foo", "bar");
		expect(result).toBe("foo bar");
	});

	it("filters out falsy values (undefined, false, null)", () => {
		expect(cn("foo", undefined, "bar")).toBe("foo bar");
		expect(cn("foo", false, "bar")).toBe("foo bar");
		expect(cn("foo", null, "bar")).toBe("foo bar");
	});

	it("handles conditional classes via object syntax", () => {
		const result = cn({ "bg-blue-500": true, "text-white": false });
		expect(result).toBe("bg-blue-500");
	});

	it("handles array of classes", () => {
		const result = cn(["foo", "bar"]);
		expect(result).toBe("foo bar");
	});

	it("deduplicates conflicting Tailwind classes (twMerge behaviour)", () => {
		// twMerge should resolve: last one wins for same property
		const result = cn("p-4", "p-8");
		expect(result).toBe("p-8");
	});

	it("resolves conflicting Tailwind color utilities", () => {
		const result = cn("bg-red-500", "bg-blue-500");
		expect(result).toBe("bg-blue-500");
	});

	it("preserves non-conflicting classes", () => {
		const result = cn("p-4", "m-2", "text-lg");
		expect(result).toContain("p-4");
		expect(result).toContain("m-2");
		expect(result).toContain("text-lg");
	});

	it("handles mixed object and string inputs", () => {
		const result = cn("base-class", {
			"active-class": true,
			"inactive-class": false,
		});
		expect(result).toContain("base-class");
		expect(result).toContain("active-class");
		expect(result).not.toContain("inactive-class");
	});

	it("returns a string", () => {
		expect(typeof cn("foo", "bar")).toBe("string");
	});
});
