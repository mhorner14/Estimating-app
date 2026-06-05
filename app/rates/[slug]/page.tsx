import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RateCardView } from "@/components/public/rate-card-view";

export default async function RateCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const company = await prisma.company.findUnique({
    where: { intakeFormSlug: slug },
    select: {
      id: true,
      name: true,
      logo: true,
      phone: true,
      email: true,
      website: true,
      licenseNumber: true,
      insuranceInfo: true,
      accentColor: true,
      serviceArea: true,
      intakeFormSlug: true,
      services: {
        where: { isActive: true, showOnRateCard: true },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          pricingType: true,
          minCharge: true,
          category: true,
        },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      },
    },
  });

  if (!company) notFound();

  return <RateCardView company={company as any} slug={slug} />;
}
