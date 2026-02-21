import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
	// Route for receipt images (JPG, PNG, WEBP) — max 4 MB
	receipt: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
		.middleware(async () => {
			const session = await auth();
			if (!session?.user?.id) throw new Error("Unauthorized");
			return { userId: session.user.id as string };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			return { url: file.ufsUrl, uploadedBy: metadata.userId };
		}),

	// Route for PDF bank statements — max 16 MB
	statement: f({ pdf: { maxFileSize: "16MB", maxFileCount: 1 } })
		.middleware(async () => {
			const session = await auth();
			if (!session?.user?.id) throw new Error("Unauthorized");
			return { userId: session.user.id as string };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			return { url: file.ufsUrl, uploadedBy: metadata.userId };
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
