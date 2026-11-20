import { env } from "@/lib/env";

// Dev-only stand-in for the storage upload URL. The fake video adapter points uploads here; we read and discard the
// body so the browser's PUT (and its progress bar) behaves like a real upload. 404 anywhere else.
export async function PUT(request: Request) {
  if (env.VIDEO_PROVIDER !== "fake" || env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  await request.arrayBuffer();
  return new Response(null, { status: 200 });
}
