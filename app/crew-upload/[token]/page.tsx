import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CrewUploadView } from "@/components/crew/crew-upload-view";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function CrewUploadPage({ params }: Props) {
  const { token } = await params;
  const estimate = await prisma.estimate.findFirst({
    where: { crewPhotoToken: token },
    include: {
      project: { include: { customer: true } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) notFound();

  return (
    <CrewUploadView
      token={token}
      estimateNumber={estimate.estimateNumber}
      customerName={estimate.project.customer.name}
      address={estimate.project.address || estimate.project.customer.projectAddress || ""}
      crewNotes={estimate.crewNotes || ""}
      initialPhotos={estimate.photos.map((p) => ({
        id: p.id,
        url: p.url,
        caption: p.caption || "",
        photoType: p.photoType,
      }))}
    />
  );
}
