import * as xlsx from "xlsx";
import * as mammoth from "mammoth";
import { parse as csvParse } from "csv-parse/sync";
import { parseStringPromise } from "xml2js";
import axios from "axios";

export interface ExtractedPatient {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
}

export class ImportService {
  /** Main extraction entry point. Routes to specific parsers based on MIME/Extension. */
  static async extract(buffer: Buffer, mimeType: string, filename: string): Promise<ExtractedPatient[]> {
    const ext = filename.split(".").pop()?.toLowerCase();

    if (mimeType === "text/csv" || ext === "csv") {
      return this.parseCSV(buffer);
    }
    if (mimeType.includes("spreadsheet") || ext === "xlsx" || ext === "xls") {
      return this.parseExcel(buffer);
    }
    if (mimeType === "application/json" || ext === "json") {
      return JSON.parse(buffer.toString());
    }
    if (mimeType.includes("xml") || ext === "xml") {
      return this.parseXML(buffer);
    }
    if (mimeType === "application/pdf" || ext === "pdf") {
      return this.extractWithAI(buffer, mimeType);
    }
    if (mimeType.includes("word") || ext === "docx" || ext === "doc") {
      return this.parseWord(buffer);
    }
    if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "bmp", "tiff", "gif"].includes(ext || "")) {
      return this.extractWithAI(buffer, mimeType);
    }
    if (mimeType === "text/plain" || ext === "txt" || mimeType === "text/html" || ext === "html") {
      return this.extractWithAI(buffer, mimeType);
    }

    throw new Error(`Unsupported file format: ${mimeType}`);
  }

  private static parseCSV(buffer: Buffer): ExtractedPatient[] {
    const records = csvParse(buffer, { columns: true, skip_empty_lines: true });
    return records.map((r: unknown) => this.mapToPatient(r as Record<string, unknown>));
  }

  private static parseExcel(buffer: Buffer): ExtractedPatient[] {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records = xlsx.utils.sheet_to_json(sheet);
    return records.map((r: unknown) => this.mapToPatient(r as Record<string, unknown>));
  }

  private static async parseXML(buffer: Buffer): Promise<ExtractedPatient[]> {
    const result = (await parseStringPromise(buffer.toString())) as Record<string, Record<string, unknown>>;
    const rootKey = Object.keys(result)[0];
    const patientData = result[rootKey]?.["patient"];
    const records = Array.isArray(patientData) ? patientData : [patientData || result[rootKey]];
    return records.map((r: unknown) => this.mapToPatient(r as Record<string, unknown>));
  }

  private static async parseWord(buffer: Buffer): Promise<ExtractedPatient[]> {
    const result = await mammoth.extractRawText({ buffer });
    return this.extractFromUnstructuredText(result.value);
  }

  /** AI-powered extraction for unstructured documents (PDF, Images, etc.) */
  private static async extractWithAI(buffer: Buffer, mimeType: string): Promise<ExtractedPatient[]> {
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
    
    try {
      const response = await axios.post(`${aiServiceUrl}/import/extract`, {
        file_content: buffer.toString("base64"),
        mimetype: mimeType,
      }, {
        headers: { "Content-Type": "application/json" }
      });

      return response.data.patients || [];
    } catch (err) {
      console.error("[extractWithAI] AI extraction failed:", err);
      // Fallback: try raw text extraction if it's text/html
      if (mimeType.includes("text") || mimeType.includes("html")) {
        return this.extractFromUnstructuredText(buffer.toString());
      }
      return [];
    }
  }

  /** Simple regex-based fallback for unstructured text if AI is unavailable. */
  private static extractFromUnstructuredText(text: string): ExtractedPatient[] {
    // This is a naive implementation; AI is preferred.
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\+?[\d\s-]{10,}/g;
    
    const emails = text.match(emailRegex) || [];
    const phones = text.match(phoneRegex) || [];
    
    // Attempt to pair them (naive)
    const results: ExtractedPatient[] = [];
    const count = Math.max(emails.length, phones.length);
    
    for (let i = 0; i < count; i++) {
      results.push({
        email: emails[i],
        phone: phones[i]?.trim(),
        name: "Extracted Patient"
      });
    }
    
    return results;
  }

  private static mapToPatient(record: Record<string, unknown>): ExtractedPatient {
    // Normalization logic: handles common variations in field names
    const findValue = (keys: string[]) => {
      for (const k of keys) {
        const foundKey = Object.keys(record).find(rk => rk.toLowerCase().includes(k.toLowerCase()));
        if (foundKey) return record[foundKey] as string;
      }
      return undefined;
    };

    return {
      name: findValue(["name", "full name", "patient"]),
      email: findValue(["email", "mail"]),
      phone: findValue(["phone", "tel", "mobile", "contact"]),
      dob: findValue(["dob", "birth", "birthday"]),
      gender: findValue(["gender", "sex"])
    };
  }
}
