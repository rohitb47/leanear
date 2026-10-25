import { auth } from "@/lib/better";

export async function GET(req: Request) {
  return (await auth()).handler(req);
}

export const POST = GET;
