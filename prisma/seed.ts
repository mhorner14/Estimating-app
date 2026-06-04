import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with Phantom Coatings data...");

  // Create company
  const company = await prisma.company.upsert({
    where: { id: "phantom-coatings" },
    update: {},
    create: {
      id: "phantom-coatings",
      name: "Phantom Coatings",
      phone: "(801) 555-0190",
      email: "info@phantomcoatings.com",
      website: "www.phantomcoatings.com",
      address: "1234 Industrial Way",
      city: "Draper",
      state: "UT",
      zip: "84020",
      serviceArea: "Salt Lake County, Utah County, Davis County",
      licenseNumber: "PC-2024-001",
      insuranceInfo: "Fully insured — $2M general liability. Workers' compensation coverage.",
      depositPercentage: 50,
      taxEnabled: false,
      defaultPaymentTerms:
        "50% deposit due upon acceptance. Remaining balance due upon project completion.",
      defaultTerms:
        "All work is performed by licensed, insured professionals. Customer is responsible for clearing the garage and surrounding area prior to installation. Pricing is valid for 30 days from proposal date. Work area must be accessible during installation. We are not responsible for pre-existing structural issues. Any changes to scope must be agreed upon in writing.",
      proposalFooter:
        "Thank you for choosing Phantom Coatings. We take pride in delivering premium, lasting results on every project. If you have any questions before signing, please don't hesitate to call or text us.",
    },
  });

  // Create owner account
  const hashedPassword = await bcrypt.hash("PhantomCoatings2024!", 12);
  const owner = await prisma.user.upsert({
    where: { email: "admin@phantomcoatings.com" },
    update: {},
    create: {
      name: "Phantom Admin",
      email: "admin@phantomcoatings.com",
      password: hashedPassword,
      role: "OWNER",
      companyId: company.id,
    },
  });

  // Create services
  const services = [
    {
      name: "Full Flake Polyaspartic System",
      description:
        "Our most popular residential system. A full-broadcast colored flake polyaspartic coating that delivers a seamless, high-gloss, slip-resistant finish. UV-stable, chemical-resistant, and built to last.",
      category: "FULL_FLAKE" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 3.75,
      minCharge: 1200,
      materialCost: 1.2,
      laborCost: 0.9,
      marginTarget: 42,
      defaultWarranty:
        "10-year warranty on delamination and peeling under normal residential use. Warranty is void if surface was not properly prepared per our standard protocol.",
      sortOrder: 0,
    },
    {
      name: "Epoxy Garage Coating",
      description:
        "Two-part epoxy base coat with anti-slip additive. Excellent for standard garages. Durable, chemical-resistant, and available in solid colors or light flake.",
      category: "EPOXY_GARAGE" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 2.75,
      minCharge: 900,
      materialCost: 0.9,
      laborCost: 0.7,
      marginTarget: 40,
      defaultWarranty:
        "5-year warranty against delamination under normal residential use. Not warranted for hot-tire pickup or chemical spills from automotive fluids.",
      sortOrder: 1,
    },
    {
      name: "Metallic Epoxy System",
      description:
        "Premium metallic epoxy with custom color blending. Creates a stunning, one-of-a-kind marble or swirl effect. Ideal for showrooms, man caves, or premium garages.",
      category: "METALLIC_EPOXY" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 6.5,
      minCharge: 1800,
      materialCost: 2.5,
      laborCost: 1.5,
      marginTarget: 45,
      defaultWarranty:
        "7-year warranty on delamination. Metallic finishes may show minor variation in appearance — this is characteristic of the system and not a defect.",
      sortOrder: 2,
    },
    {
      name: "Polished Concrete",
      description:
        "Multi-step mechanical grinding and polishing process. Creates a high-gloss, low-maintenance concrete floor with optional sealer. Commercial and residential.",
      category: "POLISHED_CONCRETE" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 4.5,
      minCharge: 1500,
      materialCost: 0.8,
      laborCost: 1.8,
      marginTarget: 38,
      defaultWarranty:
        "Sealer warranty 2 years. Re-seal recommended every 2-3 years depending on traffic. Polished surface is subject to normal wear and does not carry a defect warranty.",
      sortOrder: 3,
    },
    {
      name: "Waterproof Deck System",
      description:
        "Elastomeric deck coating system for balconies, patios, and decks. Waterproof membrane prevents moisture intrusion. Available in multiple textures and colors.",
      category: "WATERPROOF_DECK" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 8.5,
      minCharge: 2000,
      materialCost: 3.5,
      laborCost: 2.0,
      marginTarget: 43,
      defaultWarranty:
        "5-year waterproofing warranty. Warranty requires annual inspection and applies only when original installer performs all prep work. UV exposure and weather conditions may cause color variation — this is cosmetic and does not affect waterproofing.",
      sortOrder: 4,
    },
    {
      name: "Vuba Stone Overlay",
      description:
        "Resin-bound natural stone aggregate system. Permeable, decorative, and extremely durable. Ideal for driveways, patios, and pool surrounds.",
      category: "VUBA_STONE" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 12.0,
      minCharge: 2500,
      materialCost: 6.0,
      laborCost: 2.0,
      marginTarget: 42,
      defaultWarranty:
        "10-year warranty on resin bond failure. Not warranted against heavy vehicle damage or improper use. Permeable system — drainage capacity may be affected by organic debris accumulation.",
      sortOrder: 5,
    },
    {
      name: "Commercial Floor Coating",
      description:
        "Heavy-duty industrial coating systems for commercial and industrial floors. Custom spec based on traffic, chemical exposure, and compliance requirements.",
      category: "COMMERCIAL" as const,
      pricingType: "CUSTOM" as const,
      basePrice: 5.0,
      minCharge: 3000,
      materialCost: 2.0,
      laborCost: 1.5,
      marginTarget: 35,
      defaultWarranty:
        "Custom warranty per project scope. Commercial projects require site survey and may require additional prep. Payment terms are negotiated per project.",
      sortOrder: 6,
    },
    {
      name: "Stem Wall Coating",
      description:
        "Coating applied to garage stem walls (vertical concrete walls at perimeter). Typically applied as part of a full garage system.",
      category: "STEM_WALL" as const,
      pricingType: "PER_LINEAR_FT" as const,
      basePrice: 8.0,
      minCharge: 150,
      materialCost: 2.5,
      laborCost: 2.0,
      marginTarget: 38,
      defaultWarranty:
        "Covered under main coating warranty when installed as part of a full system.",
      sortOrder: 7,
    },
    {
      name: "Crack Repair",
      description:
        "Professional crack repair using polyurea or epoxy injection. Stabilizes cracks before coating to ensure proper adhesion and prevent future movement.",
      category: "CRACK_REPAIR" as const,
      pricingType: "FLAT_FEE" as const,
      basePrice: 75,
      minCharge: 75,
      materialCost: 15,
      laborCost: 25,
      marginTarget: 47,
      defaultWarranty:
        "Crack repairs carry no warranty against future cracking or movement. Concrete is a living material and may continue to shift. Crack fills prevent water intrusion and improve adhesion but do not eliminate the cause of cracking.",
      sortOrder: 8,
    },
    {
      name: "Existing Coating Removal",
      description:
        "Mechanical removal of existing coatings, paint, or failed epoxy using floor grinders and scarifiers. Required when existing coating is delaminating or incompatible.",
      category: "COATING_REMOVAL" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 1.5,
      minCharge: 400,
      materialCost: 0.2,
      laborCost: 0.8,
      marginTarget: 33,
      defaultWarranty:
        "Coating removal is a preparation service and carries no standalone warranty.",
      sortOrder: 9,
    },
    {
      name: "Moisture Mitigation System",
      description:
        "Two-component moisture vapor barrier applied before primary coating when moisture readings exceed threshold. Prevents hydrostatic pressure from causing delamination.",
      category: "MOISTURE_MITIGATION" as const,
      pricingType: "PER_SQFT" as const,
      basePrice: 2.0,
      minCharge: 600,
      materialCost: 0.8,
      laborCost: 0.6,
      marginTarget: 40,
      defaultWarranty:
        "Moisture mitigation barrier carries a limited 2-year warranty. Warranty is conditional on surface moisture levels remaining within standard tolerances. Extreme ground moisture or hydrostatic pressure may require specialized engineering solutions beyond this scope.",
      sortOrder: 10,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: {
        id: `phantom-${service.category.toLowerCase()}-${service.sortOrder}`,
      },
      update: {},
      create: {
        id: `phantom-${service.category.toLowerCase()}-${service.sortOrder}`,
        companyId: company.id,
        ...service,
      },
    });
  }

  // Warranty rules
  const warrantyRules = [
    {
      name: "Standard Residential — 10 Year",
      condition: "Standard residential garage coating, no moisture issues, no existing coating",
      warrantyText:
        "This installation is backed by our 10-year warranty against delamination and peeling under normal residential use. Warranty requires that the surface not be subjected to standing water, chemical damage, or physical impact beyond normal wear.",
      isDefault: true,
      sortOrder: 0,
    },
    {
      name: "Cracked Concrete — Limited Warranty",
      condition: "Cracks present in concrete slab",
      warrantyText:
        "Due to existing cracking in the concrete surface, this installation carries a limited 3-year warranty. Crack repairs have been made to stabilize the surface, but concrete movement may result in visible crack lines over time. This does not affect the coating adhesion warranty.",
      isDefault: false,
      sortOrder: 1,
    },
    {
      name: "Moisture Concern — Conditional Warranty",
      condition: "Elevated moisture readings detected",
      warrantyText:
        "Moisture mitigation has been applied as part of this installation. Warranty is conditional on moisture levels remaining within standard tolerances. If hydrostatic pressure increases due to drainage or grading issues, additional remediation may be required at customer expense.",
      isDefault: false,
      sortOrder: 2,
    },
    {
      name: "Existing Coating — Prep Disclaimer",
      condition: "Existing coating removed prior to installation",
      warrantyText:
        "Existing coating was mechanically removed prior to this installation. Every effort has been made to prepare the surface to manufacturer specifications. Warranty is standard for new installation from this point forward. Pre-existing substrate damage not caused by our work is excluded.",
      isDefault: false,
      sortOrder: 3,
    },
    {
      name: "Outdoor / Deck — Weather Disclaimer",
      condition: "Outdoor or deck system",
      warrantyText:
        "Outdoor coatings and waterproof deck systems are subject to UV exposure, temperature cycling, and weather. Color variation and minor surface wear are normal and cosmetic. The waterproofing membrane warranty is 5 years from installation date. Annual inspection is recommended.",
      isDefault: false,
      sortOrder: 4,
    },
    {
      name: "Commercial — Custom Review Required",
      condition: "Commercial project",
      warrantyText:
        "Commercial coating warranty terms are determined per project based on traffic volume, chemical exposure, and system specification. Please refer to your project-specific warranty documentation.",
      isDefault: false,
      sortOrder: 5,
    },
  ];

  for (const rule of warrantyRules) {
    await prisma.warrantyRule.upsert({
      where: { id: `phantom-warranty-${rule.sortOrder}` },
      update: {},
      create: {
        id: `phantom-warranty-${rule.sortOrder}`,
        companyId: company.id,
        ...rule,
      },
    });
  }

  console.log("✅ Phantom Coatings seed data created successfully");
  console.log(`   Company: ${company.name}`);
  console.log(`   Login: admin@phantomcoatings.com / PhantomCoatings2024!`);
  console.log(`   Services: ${services.length} created`);
  console.log(`   Warranty rules: ${warrantyRules.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
