import { Request, Response } from "express";
import { db, invoices, payments } from "@medbridge/db";
import { eq, and } from "drizzle-orm";

export class PaymentsController {
  /**
   * Record a payment for an invoice
   */
  static async recordPayment(req: Request, res: Response) {
    const { clinicId } = req;
    const { invoiceId, amount, method, reference, notes } = req.body;

    if (!clinicId) return res.status(403).json({ error: "Clinic access required." });
    if (!invoiceId || !amount || !method) {
      return res.status(400).json({ error: "Invoice ID, amount, and method are required." });
    }

    try {
      // 1. Get the invoice
      const [invoice] = await db.select().from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinicId)))
        .limit(1);

      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      // 2. Create payment record
      const [newPayment] = await db.insert(payments).values({
        invoiceId,
        amount: amount.toString(),
        method,
        reference,
        notes,
        paidAt: new Date()
      }).returning();

      // 3. Update invoice status and amounts
      const currentPaid = parseFloat(invoice.paidAmount || "0");
      const currentDue = parseFloat(invoice.dueAmount || "0");
      const paymentAmount = parseFloat(amount.toString());

      const newPaid = currentPaid + paymentAmount;
      const newDue = Math.max(0, currentDue - paymentAmount);
      
      let status: "pending" | "partial" | "paid" | "void" = "partial";
      if (newDue <= 0) {
        status = "paid";
      }

      await db.update(invoices).set({
        paidAmount: newPaid.toString(),
        dueAmount: newDue.toString(),
        status,
        updatedAt: new Date()
      }).where(eq(invoices.id, invoiceId));

      return res.status(201).json(newPayment);
    } catch (error) {
      console.error("Failed to record payment:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get payments for an invoice
   */
  static async getInvoicePayments(req: Request, res: Response) {
    const { invoiceId } = req.params;
    try {
      const records = await db.select().from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .orderBy(payments.paidAt);
      
      return res.status(200).json(records);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
