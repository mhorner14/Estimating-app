import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(body.logo !== undefined && { logo: body.logo }),
      name: body.name,
      phone: body.phone,
      email: body.email,
      website: body.website,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      serviceArea: body.serviceArea,
      licenseNumber: body.licenseNumber,
      insuranceInfo: body.insuranceInfo,
      defaultTerms: body.defaultTerms,
      defaultPaymentTerms: body.defaultPaymentTerms,
      depositPercentage: body.depositPercentage,
      taxRate: body.taxRate,
      taxEnabled: body.taxEnabled,
      proposalFooter: body.proposalFooter,
      proposalEmailSubject: body.proposalEmailSubject,
      proposalEmailBody: body.proposalEmailBody,
      followUpEmailSubject: body.followUpEmailSubject,
      followUpEmailBody: body.followUpEmailBody,
      ...(body.monthlyRevenueGoal !== undefined && { monthlyRevenueGoal: body.monthlyRevenueGoal || null }),
      ...(body.intakeFormSlug !== undefined && { intakeFormSlug: body.intakeFormSlug || null }),
      ...(body.googleReviewUrl !== undefined && { googleReviewUrl: body.googleReviewUrl || null }),
      ...(body.yelpReviewUrl !== undefined && { yelpReviewUrl: body.yelpReviewUrl || null }),
    },
  });

  return NextResponse.json(updated);
}
