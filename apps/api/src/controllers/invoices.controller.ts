import { Request, Response } from "express";
import { db, invoices, invoiceItems } from "@medbridge/db";
import { eq, desc, and } from "drizzle-orm";

export class InvoicesController {
  /**
   * Create a new invoice
   */
  static async createInvoice(req: Request, res: Response) {
    const { clinicId } = req;
    const { 
      patientId, 
      encounterId, 
      dueDate, 
      notes, 
      items 
    } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Patient ID and at least one item are required." });
    }

    try {
      // 1. Calculate total amount
      let total = 0;
      const itemsToInsert = items.map((item: { description: string; quantity?: number; unitPrice: number }) => {
        const qty = item.quantity || 1;
        const lineTotal = qty * item.unitPrice;
        total += lineTotal;
        return {
          description: item.description,
          quantity: qty.toString(),
          unitPrice: item.unitPrice.toString(),
          totalPrice: lineTotal.toString()
        };
      });

      // 2. Generate invoice number (Basic: INV-YYYY-RANDOM)
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${year}-${random}`;

      // 3. Create invoice header
      const [newInvoice] = await db.insert(invoices).values({
        clinicId,
        patientId,
        encounterId: encounterId || null,
        invoiceNumber,
        totalAmount: total.toString(),
        dueAmount: total.toString(),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        status: "pending"
      }).returning();

      // 4. Create invoice items
      const itemsWithInvoiceId = itemsToInsert.map(item => ({
        ...item,
        invoiceId: newInvoice.id
      }));

      await db.insert(invoiceItems).values(itemsWithInvoiceId);

      return res.status(201).json({ ...newInvoice, items: itemsWithInvoiceId });
    } catch (error) {
      console.error("Failed to create invoice:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get invoice details
   */
  static async getInvoice(req: Request, res: Response) {
    const { id } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const [invoice] = await db.select().from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.clinicId, clinicId)))
        .limit(1);

      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      return res.status(200).json({ ...invoice, items });
    } catch (error) {
      console.error("Failed to get invoice:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * List invoices for a patient
   */
  static async getPatientInvoices(req: Request, res: Response) {
    const { patientId } = req.params;
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const results = await db.select().from(invoices)
        .where(and(eq(invoices.patientId, patientId), eq(invoices.clinicId, clinicId)))
        .orderBy(desc(invoices.createdAt));

      return res.status(200).json(results);
    } catch (error) {
      console.error("Failed to get patient invoices:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * List all clinic invoices (for financial dashboard)
   */
  static async getClinicInvoices(req: Request, res: Response) {
    const { clinicId } = req;
    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });

    try {
      const results = await db.select().from(invoices)
        .where(eq(invoices.clinicId, clinicId))
        .orderBy(desc(invoices.createdAt));

      return res.status(200).json(results);
    } catch (error) {
      console.error("Failed to get clinic invoices:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
