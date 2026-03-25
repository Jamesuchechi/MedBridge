import { db, insuranceProviders } from "@medbridge/db";

async function seedHMOs() {
  const hmos = [
    {
      name: "NHIS (National Health Insurance Authority)",
      code: "NHIS-NG-001",
      type: "public",
      portalUrl: "https://nhia.gov.ng"
    },
    {
      name: "Reliance HMO",
      code: "REL-HMO-002",
      type: "private",
      portalUrl: "https://reliancehmo.com"
    },
    {
      name: "Hygeia HMO",
      code: "HYG-HMO-003",
      type: "private",
      portalUrl: "https://hygeiahmo.com"
    }
  ];

  console.log("Seeding Insurance Providers...");
  for (const hmo of hmos) {
    await db.insert(insuranceProviders).values(hmo).onConflictDoNothing();
  }
  console.log("Seeding complete.");
  process.exit(0);
}

seedHMOs();
