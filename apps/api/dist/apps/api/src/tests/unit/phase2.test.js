"use strict";
/**
 * Phase 2.6 — Unit Tests (Jest)
 * ================================
 * Tests pure logic functions without any network calls or DB.
 */
describe("Drug interaction severity ranking", () => {
    const SEVERITY_RANK = {
        none: 0,
        minor: 1,
        moderate: 2,
        severe: 3,
        contraindicated: 4,
    };
    function highestSeverity(severities) {
        if (!severities.length)
            return "none";
        return severities.reduce((a, b) => SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b);
    }
    test("returns none for empty array", () => {
        expect(highestSeverity([])).toBe("none");
    });
    test("returns the single element", () => {
        expect(highestSeverity(["moderate"])).toBe("moderate");
    });
    test("returns contraindicated over severe", () => {
        expect(highestSeverity(["severe", "contraindicated", "minor"])).toBe("contraindicated");
    });
    test("returns severe over moderate", () => {
        expect(highestSeverity(["moderate", "severe", "none"])).toBe("severe");
    });
    test("returns moderate when all are moderate or lower", () => {
        expect(highestSeverity(["none", "minor", "moderate"])).toBe("moderate");
    });
});
describe("Price outlier detection", () => {
    function isPriceOutlier(price, minPrice, maxPrice) {
        const low = minPrice * 0.15;
        const high = maxPrice * 4;
        return price < low || price > high;
    }
    test("normal price within range is not an outlier", () => {
        expect(isPriceOutlier(800, 500, 2000)).toBe(false);
    });
    test("price just inside upper threshold (4x max)", () => {
        expect(isPriceOutlier(7999, 500, 2000)).toBe(false);
    });
    test("price at 4x max is not an outlier", () => {
        expect(isPriceOutlier(8000, 500, 2000)).toBe(false);
    });
    test("price above 4x max is an outlier", () => {
        expect(isPriceOutlier(8001, 500, 2000)).toBe(true);
    });
    test("price below 15% of min is an outlier", () => {
        expect(isPriceOutlier(60, 500, 2000)).toBe(true);
    });
    test("price at exactly 15% of min is not an outlier", () => {
        expect(isPriceOutlier(75, 500, 2000)).toBe(false);
    });
    test("zero price is always an outlier", () => {
        expect(isPriceOutlier(0, 100, 1000)).toBe(true);
    });
    test("extremely high price (counterfeit detection scenario)", () => {
        expect(isPriceOutlier(50000, 200, 800)).toBe(true);
    });
});
describe("OSM state extraction from address strings", () => {
    function extractNigerianState(text) {
        const STATES = [
            "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
            "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Abuja",
            "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
            "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
            "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
        ];
        const lower = text.toLowerCase();
        return STATES.find((s) => lower.includes(s.toLowerCase())) || null;
    }
    test("extracts Lagos from full address", () => {
        expect(extractNigerianState("15 Allen Avenue, Ikeja, Lagos")).toBe("Lagos");
    });
    test("extracts FCT from Abuja address", () => {
        expect(extractNigerianState("Wuse Zone 5, Abuja, FCT")).toBe("FCT");
    });
    test("extracts Rivers from Port Harcourt address", () => {
        expect(extractNigerianState("GRA Phase 2, Port Harcourt, Rivers State")).toBe("Rivers");
    });
    test("returns null for non-Nigerian address", () => {
        expect(extractNigerianState("10 Downing Street, London, UK")).toBeNull();
    });
    test("is case-insensitive", () => {
        expect(extractNigerianState("KANO STATE, NIGERIA")).toBe("Kano");
    });
});
describe("Known dangerous drug interactions database", () => {
    const KNOWN_PAIRS = {
        "warfarin+aspirin": { severity: "severe", mechanism: "Additive antiplatelet and anticoagulant effects" },
        "metronidazole+alcohol": { severity: "severe", mechanism: "Disulfiram-like reaction" },
        "artemether+halofantrine": { severity: "contraindicated", mechanism: "Both prolong QT interval" },
        "ciprofloxacin+antacids": { severity: "moderate", mechanism: "Chelation reduces absorption" },
        "diazepam+alcohol": { severity: "severe", mechanism: "Synergistic CNS depression" },
        "metformin+alcohol": { severity: "moderate", mechanism: "Increased lactic acidosis risk" },
        "atorvastatin+clarithromycin": { severity: "severe", mechanism: "CYP3A4 inhibition" },
    };
    function checkKnownPair(drug1, drug2) {
        const key1 = [drug1, drug2].sort().join("+").toLowerCase();
        return KNOWN_PAIRS[key1] || null;
    }
    test("warfarin + aspirin returns severe", () => {
        const result = checkKnownPair("warfarin", "aspirin");
        expect(result).not.toBeNull();
        expect(result?.severity).toBe("severe");
    });
    test("order-independent: aspirin + warfarin same result", () => {
        const result = checkKnownPair("aspirin", "warfarin");
        expect(result?.severity).toBe("severe");
    });
    test("artemether + halofantrine is contraindicated", () => {
        const result = checkKnownPair("artemether", "halofantrine");
        expect(result?.severity).toBe("contraindicated");
    });
    test("unknown pair returns null", () => {
        const result = checkKnownPair("paracetamol", "orange juice");
        expect(result).toBeNull();
    });
    test("metronidazole + alcohol returns severe", () => {
        const result = checkKnownPair("metronidazole", "alcohol");
        expect(result?.severity).toBe("severe");
    });
});
