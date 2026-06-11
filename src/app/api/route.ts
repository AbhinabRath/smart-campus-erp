// This route is intentionally empty.
// All API requests are proxied to the Express backend on port 3001
// via Next.js rewrites configured in next.config.ts.
// The Express backend handles all business logic and data access.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "API proxy active. Backend is on port 3001." });
}
