import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

// Valid MIME types for receipts and statements
const ALLOWED_IMAGE_MIMES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
]);
const ALLOWED_PDF_MIMES = new Set(["application/pdf"]);

export const ourFileRouter = {
	// Route for receipt images (JPG, PNG, WEBP) — max 4 MB
	receipt: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(async () => {
			const session = await auth();
			if (!session?.user?.id) throw new Error("Unauthorized");
			return { userId: session.user.id as string };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// Server-side MIME type validation
			if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
				throw new Error(`Invalid file type: ${file.type}. Only JPEG, PNG, and WebP allowed.`);
			}
			return { url: file.ufsUrl, uploadedBy: metadata.userId };
		}),

	// Route for PDF bank statements — max 4 MB
	statement: f({ pdf: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(async () => {
			const session = await auth();
			if (!session?.user?.id) throw new Error("Unauthorized");
			return { userId: session.user.id as string };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			// Server-side MIME type validation
			if (!ALLOWED_PDF_MIMES.has(file.type)) {
				throw new Error(`Invalid file type: ${file.type}. Only PDF allowed.`);
			}
			return { url: file.ufsUrl, uploadedBy: metadata.userId };
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
