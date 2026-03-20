"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const schema_1 = require("./schema");
async function main() {
    console.log("🌱 Seeding database...");
    // 1. Seed Drugs
    const initialDrugs = [
        {
            name: "Panadol",
            genericName: "Paracetamol",
            manufacturer: "GSK",
            category: "Analgesic",
            form: "Tablet",
            strength: "500mg",
            priceRange: "₦500 - ₦800",
        },
        {
            name: "Amatem Softgel",
            genericName: "Artemether + Lumefantrine",
            manufacturer: "Elbe Pharma",
            category: "Antimalarial",
            form: "Softgel",
            strength: "20mg/120mg",
            priceRange: "₦1,800 - ₦2,500",
        },
        {
            name: "Emzor Paracetamol",
            genericName: "Paracetamol",
            manufacturer: "Emzor",
            category: "Analgesic",
            form: "Syrup",
            strength: "125mg/5ml",
            priceRange: "₦400 - ₦600",
        },
        {
            name: "Augmentin",
            genericName: "Amoxicillin + Clavulanic Acid",
            manufacturer: "GSK",
            category: "Antibiotic",
            form: "Tablet",
            strength: "625mg",
            priceRange: "₦12,000 - ₦15,000",
        },
    ];
    console.log("Inserting drugs...");
    for (const drug of initialDrugs) {
        await index_1.db.insert(schema_1.drugs).values(drug).onConflictDoNothing();
    }
    // 2. Seed Symptom Taxonomy
    const initialSymptoms = [
        { name: "Fever", category: "General", prevalence: 80 },
        { name: "Headache", category: "Neurological", prevalence: 70 },
        { name: "Cough", category: "Respiratory", prevalence: 60 },
        { name: "Malaria Parasite", category: "Infection", prevalence: 90 },
        { name: "Abdominal Pain", category: "Gastrointestinal", prevalence: 50 },
    ];
    console.log("Inserting symptoms...");
    for (const symptom of initialSymptoms) {
        await index_1.db.insert(schema_1.symptomTaxonomy).values(symptom).onConflictDoNothing();
    }
    console.log("✅ Seeding complete!");
    process.exit(0);
}
main().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
