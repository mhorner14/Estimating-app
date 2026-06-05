import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerIntakeForm } from "@/components/intake/customer-intake-form";

export default async function IntakePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const company = await prisma.company.findUnique({
    where: { intakeFormSlug: slug },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      serviceArea: true,
    },
  });

  if (!company) notFound();

  return <CustomerIntakeForm company={company} />;
}
