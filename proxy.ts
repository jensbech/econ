import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isSignInPage = pathname === "/";
	const userId = request.cookies.get("userId")?.value;

	if (!userId && !isSignInPage) {
		return NextResponse.redirect(new URL("/", request.url));
	}
	if (userId && isSignInPage) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
