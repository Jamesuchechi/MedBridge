import { Request, Response } from "express";
import { db, medicalDocuments } from "@medbridge/db";
import { eq, desc } from "drizzle-orm";
import { supabase } from "../config/supabase";
import { documentAnalysisQueue } from "../lib/queue";
import { z } from "zod";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "medical-documents";

const createDocumentSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  docType: z.enum(["lab_result", "prescription", "radiology", "report", "unknown"]),
  fileUrl: z.string().url(),
});

export const getUploadUrl = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { fileName } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!fileName) return res.status(400).json({ error: "fileName is required" });

  const path = `${userId}/${Date.now()}_${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path);

    if (error) throw error;

    res.status(200).json({
      uploadUrl: data.signedUrl,
      fileUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`,
      path,
    });
  } catch (err) {
    console.error("[GET UPLOAD URL ERROR]:", err);
    res.status(500).json({ error: "Failed to generate upload URL", message: err instanceof Error ? err.message : String(err) });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const validation = createDocumentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: "Invalid request data", details: validation.error.format() });
  }

  const { docType, fileUrl } = validation.data;

  try {
    const [doc] = await db
      .insert(medicalDocuments)
      .values({
        userId,
        type: docType,
        fileUrl,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    // Add to analysis queue
    await documentAnalysisQueue.add("analyze-document", {
      documentId: doc.id,
      fileUrl,
      docType,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("[CREATE DOCUMENT ERROR]:", err);
    res.status(500).json({ error: "Failed to create document record", message: err instanceof Error ? err.message : String(err) });
  }
};

export const getDocuments = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const docs = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.userId, userId))
      .orderBy(desc(medicalDocuments.createdAt));

    const formatted = docs.map(d => ({
      ...d,
      result: d.extraction ? JSON.parse(d.extraction) : null,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("[GET DOCUMENTS ERROR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, id))
      .limit(1);

    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.status(200).json({
      ...doc,
      result: doc.extraction ? JSON.parse(doc.extraction) : null,
    });
  } catch (err) {
    console.error("[GET DOCUMENT BY ID ERROR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Check ownership
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, id))
      .limit(1);

    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: "Document not found" });
    }

    await db.delete(medicalDocuments).where(eq(medicalDocuments.id, id));
 
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE DOCUMENT ERROR]:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
 
export const reAnalyzeDocument = async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  const { id } = req.params;
 
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
 
  try {
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, id))
      .limit(1);
 
    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: "Document not found" });
    }
 
    // Add back to analysis queue
    await documentAnalysisQueue.add("analyze-document", {
      documentId: doc.id,
      fileUrl: doc.fileUrl,
      docType: doc.type,
    });
 
    // Update status to pending
    await db
      .update(medicalDocuments)
      .set({ status: "pending" })
      .where(eq(medicalDocuments.id, id));
 
    res.status(200).json({ message: "Analysis re-triggered", status: "pending" });
  } catch (err) {
    console.error("[RE-ANALYZE DOCUMENT ERROR]:", err);
    res.status(500).json({ error: "Failed to re-trigger analysis", message: err instanceof Error ? err.message : String(err) });
  }
};
