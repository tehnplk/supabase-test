import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy Function
 * Replaces deprecated middleware naming convention
 *
 * Handles:
 * 1. External proxy requests (/proxy/*)
 * 2. Authentication & session management
 * 3. Member status validation
 */
export async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const path = request.nextUrl.pathname;

	// ─────────────────────────────────────────────────────────
	// Route Configuration
	// ─────────────────────────────────────────────────────────
	const PROXY_PREFIX = "/proxy/";
	const PUBLIC_ROUTES = ["/", "/login", "/signup", "/auth", "/favicon.ico"];

	const isPublicRoute = PUBLIC_ROUTES.some(
		(route) => path === route || path.startsWith(`${route}/`)
	);

	// ─────────────────────────────────────────────────────────
	// External Proxy: Rewrite /proxy/* to PROXY_TARGET_URL
	// ─────────────────────────────────────────────────────────
	if (path.startsWith(PROXY_PREFIX)) {
		const targetBase = process.env.PROXY_TARGET_URL;

		if (targetBase) {
			const suffix = path.slice(PROXY_PREFIX.length);
			const targetUrl = new URL(targetBase);

			// Append suffix path
			targetUrl.pathname = targetUrl.pathname.replace(/\/$/, "") + "/" + suffix;
			targetUrl.search = request.nextUrl.search;

			return NextResponse.rewrite(targetUrl);
		}
		// No target configured, continue without proxying
	}

	// ─────────────────────────────────────────────────────────
	// Supabase Auth
	// ─────────────────────────────────────────────────────────
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		return supabaseResponse;
	}

	const supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value } of cookiesToSet) {
					request.cookies.set(name, value);
				}
				supabaseResponse = NextResponse.next({
					request,
				});
				for (const { name, value, options } of cookiesToSet) {
					supabaseResponse.cookies.set(name, value, options);
				}
			},
		},
	});

	// IMPORTANT: Avoid writing any logic between createServerClient and auth.getUser()
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// ─────────────────────────────────────────────────────────
	// Public Routes: Allow without auth
	// ─────────────────────────────────────────────────────────
	if (isPublicRoute) {
		return supabaseResponse;
	}

	// ─────────────────────────────────────────────────────────
	// API Routes: Allow (handle auth in route handlers)
	// ─────────────────────────────────────────────────────────
	if (path.startsWith("/api")) {
		return supabaseResponse;
	}

	// ─────────────────────────────────────────────────────────
	// Protected Routes: Require authenticated user
	// ─────────────────────────────────────────────────────────
	if (!user) {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = "/login";
		redirectUrl.searchParams.set("next", path);
		redirectUrl.searchParams.set("error", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
		return NextResponse.redirect(redirectUrl);
	}

	// ─────────────────────────────────────────────────────────
	// Member Status: Check if user is active
	// ─────────────────────────────────────────────────────────
	const { data: member } = await supabase
		.from("members")
		.select("status")
		.eq("id", user.id)
		.single();

	if (!member || member.status !== "active") {
		const redirectUrl = request.nextUrl.clone();
		redirectUrl.pathname = "/login";
		redirectUrl.searchParams.set("error", "บัญชีของคุณถูกระงับหรือไม่ใช้งาน");
		return NextResponse.redirect(redirectUrl);
	}

	return supabaseResponse;
}

// ─────────────────────────────────────────────────────────
// Matcher Configuration
// Excludes static assets from proxy processing
// ─────────────────────────────────────────────────────────
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico
		 * - Static assets (svg, png, jpg, jpeg, gif, webp)
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
