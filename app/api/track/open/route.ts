import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");

  if (token) {
    try {
      const proposal = await prisma.proposal.findFirst({ where: { publicToken: token } });
      if (proposal) {
        await prisma.estimate.updateMany({
          where: {
            id: proposal.estimateId,
            status: "SENT",
            viewedAt: null,
          },
          data: { status: "VIEWED", viewedAt: new Date() },
        });
      }
    } catch {
      // Never break email rendering
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
