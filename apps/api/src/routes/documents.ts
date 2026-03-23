import { Router } from "express";
import {
  getUploadUrl,
  createDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  reAnalyzeDocument,
} from "../controllers/documents.controller";

const router = Router();

router.get("/upload-url", getUploadUrl);
router.post("/", createDocument);
router.get("/", getDocuments);
router.get("/:id", getDocumentById);
router.delete("/:id", deleteDocument);
router.post("/:id/analyze", reAnalyzeDocument);

export default router;
