import { clearSessionCookie } from "@/lib/auth-utils";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     description: Clears the session cookie and invalidates the session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export async function POST() {
  await clearSessionCookie();
  return Response.json({ message: "Logged out successfully" });
}

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current session user
 *     description: Returns the currently authenticated user's info from the session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Not authenticated
 */
export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  const role = request.headers.get("x-user-role");
  const name = request.headers.get("x-user-name");

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user: { id: userId, email, role, name } });
}
