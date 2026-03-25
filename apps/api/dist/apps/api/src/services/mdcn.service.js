"use strict";
/**
 * MDCN Number Validation Service
 * =================================
 * The Medical and Dental Council of Nigeria issues registration numbers
 * in the format:  MDCN/NNNNN/YYYY
 * Examples:       MDCN/12345/2018
 *                 MDCN/98765/2023
 *
 * This service:
 *   1. Validates the format (regex)
 *   2. Checks the year is plausible (1960–current year)
 *   3. Checks for duplicates in our DB
 *
 * Note: MDCN does not currently expose a public API for real-time
 * verification. When one becomes available, add it as step 4.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMdcnFormat = validateMdcnFormat;
exports.checkMdcnDuplicate = checkMdcnDuplicate;
const db_1 = require("@medbridge/db");
const drizzle_orm_1 = require("drizzle-orm");
// MDCN/NNNNN/YYYY — 4–6 digit number, 4-digit year
const MDCN_REGEX = /^MDCN\/\d{4,6}\/\d{4}$/i;
function validateMdcnFormat(raw) {
    if (!raw?.trim()) {
        return { valid: false, error: "MDCN number is required." };
    }
    const trimmed = raw.trim().toUpperCase();
    if (!MDCN_REGEX.test(trimmed)) {
        return {
            valid: false,
            error: "MDCN number must be in the format MDCN/12345/2020. Please check and try again.",
        };
    }
    // Validate the year component
    const year = parseInt(trimmed.split("/")[2], 10);
    const currentYear = new Date().getFullYear();
    if (year < 1960) {
        return { valid: false, error: "Registration year appears to be invalid (before 1960)." };
    }
    if (year > currentYear) {
        return { valid: false, error: `Registration year cannot be in the future (${year}).` };
    }
    return { valid: true, normalized: trimmed };
}
/**
 * Check whether an MDCN number is already registered to another doctor.
 * Pass `excludeUserId` when updating an existing profile to skip self-matches.
 */
async function checkMdcnDuplicate(mdcnNumber, excludeUserId) {
    try {
        const normalized = mdcnNumber.trim().toUpperCase();
        const conditions = excludeUserId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.doctorProfiles.mdcnNumber, normalized), (0, drizzle_orm_1.ne)(db_1.doctorProfiles.userId, excludeUserId))
            : (0, drizzle_orm_1.eq)(db_1.doctorProfiles.mdcnNumber, normalized);
        const existing = await db_1.db
            .select({ id: db_1.doctorProfiles.id })
            .from(db_1.doctorProfiles)
            .where(conditions)
            .limit(1);
        if (existing.length > 0) {
            return {
                isDuplicate: true,
                error: "This MDCN number is already registered with another account. If this is an error, contact support.",
            };
        }
        return { isDuplicate: false };
    }
    catch (err) {
        console.error("[MDCN Duplicate Check Error]:", err);
        // Fail open — don't block registration on a DB error
        return { isDuplicate: false };
    }
}
