
const SUPABASE_URL              = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APP_URL                   = process.env.NEXT_PUBLIC_APP_URL || "https://medbridge.health";
const FROM_NAME                 = process.env.EMAIL_FROM_NAME || "MedBridge";
const ADMIN_EMAIL               = process.env.ADMIN_NOTIFICATION_EMAIL || "admin@medbridge.health";

// ─── Base HTML template ───────────────────────────────────────────────────────
function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f7f9;margin:0;padding:0}
    .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#00e5a0,#3d9bff);padding:32px 40px}
    .header-logo{font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#000}
    .body{padding:36px 40px;color:#0d1117;line-height:1.7}
    .body h2{font-size:20px;font-weight:700;margin:0 0 16px}
    .body p{font-size:15px;color:#444;margin:0 0 14px}
    .cta{display:inline-block;margin:20px 0;padding:14px 28px;background:linear-gradient(135deg,#00e5a0,#3d9bff);color:#000;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none}
    .info-box{background:#f0f7ff;border-left:4px solid #3d9bff;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;font-size:14px}
    .warn-box{background:#fff7f0;border-left:4px solid #ff7c2b;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;font-size:14px}
    .footer{padding:20px 40px;background:#f9fafb;font-size:12px;color:#888;border-top:1px solid #eee}
    .badge{display:inline-block;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700}
    .badge-pending{background:#fff8e0;color:#b8860b}
    .badge-approved{background:#e0fff4;color:#007a56}
    .badge-rejected{background:#ffe0e0;color:#c00}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><div class="header-logo">MedBridge</div></div>
    <div class="body">${content}</div>
    <div class="footer">
      MedBridge Health Technologies · Nigeria<br>
      Support: <a href="${APP_URL}/support">${APP_URL}/support</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Core send function using Supabase Auth Admin API.
 *
 * Note: `supabase.auth.admin.generateLink` + raw email is the most reliable
 * way to send custom HTML via Supabase without a separate email provider.
 * We use the lower-level fetch to the /admin/send-email endpoint which
 * Supabase exposes as part of the GoTrue Admin API.
 */
async function sendEmail(opts: {
  to:      string;
  subject: string;
  html:    string;
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Development: log to console instead of throwing
    console.log(`\n[EMAIL - DEV] ─────────────────────────────────`);
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to send real email)`);
    console.log(`────────────────────────────────────────────────\n`);
    return;
  }

  try {
    /**
     * Supabase GoTrue Admin API — send raw email
     * POST /auth/v1/admin/send-email
     *
     * This endpoint is part of GoTrue but not yet in the JS SDK as a
     * first-class method. We call it directly via fetch.
     *
     * Requires: service role key in Authorization header.
     */
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/send-email`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey":        SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email:      opts.to,
        subject:    opts.subject,
        html:       opts.html,
        from_name:  FROM_NAME,
        from_email: "noreply@medbridge.health",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Supabase Email] ${res.status} ${res.statusText}`, body);
    }
  } catch (err) {
    // Non-blocking — email failure should never crash the API
    console.error("[Email Service Error]:", err);
  }
}

// ─── Exported email functions ─────────────────────────────────────────────────

/** Sent immediately after a doctor submits their application. */
export async function sendSubmissionConfirmation(opts: {
  to:             string;
  doctorName:     string;
  mdcnNumber:     string;
  specialization: string;
}): Promise<void> {
  await sendEmail({
    to:      opts.to,
    subject: "MedBridge — Doctor application received",
    html:    baseTemplate(`
      <h2>Application Received ✓</h2>
      <p>Hi Dr. ${opts.doctorName},</p>
      <p>We've received your application to join MedBridge as a verified clinician. Our team will review your credentials within <strong>2–3 working days</strong>.</p>
      <div class="info-box">
        <strong>Application details</strong><br>
        MDCN Number: <strong>${opts.mdcnNumber}</strong><br>
        Specialization: <strong>${opts.specialization}</strong><br>
        Status: <span class="badge badge-pending">Pending Review</span>
      </div>
      <p>You'll receive an email as soon as a decision is made.</p>
      <a href="${APP_URL}/dashboard" class="cta">Track Application Status</a>
      <p style="font-size:13px;color:#888">Questions? Email us at doctors@medbridge.health</p>
    `),
  });
}

/** Sent when an admin opens the application for review. */
export async function sendUnderReviewNotice(opts: {
  to:         string;
  doctorName: string;
}): Promise<void> {
  await sendEmail({
    to:      opts.to,
    subject: "MedBridge — Your application is under review",
    html:    baseTemplate(`
      <h2>Under Review</h2>
      <p>Hi Dr. ${opts.doctorName},</p>
      <p>Our verification team has started reviewing your application. This usually takes less than 24 hours once review begins.</p>
      <p>We'll notify you immediately when a decision is made.</p>
      <a href="${APP_URL}/dashboard" class="cta">View Application</a>
    `),
  });
}

/** Sent on approval — unlocks Doctor Copilot. */
export async function sendApprovalEmail(opts: {
  to:             string;
  doctorName:     string;
  specialization: string;
}): Promise<void> {
  await sendEmail({
    to:      opts.to,
    subject: "🎉 MedBridge — You're verified! Doctor Copilot is now active",
    html:    baseTemplate(`
      <h2>Welcome to MedBridge, Dr. ${opts.doctorName}! 🎉</h2>
      <p>Your credentials have been verified. You now have full access to the <strong>Doctor Copilot</strong> — AI-powered differential diagnosis, SOAP note generation, and referral intelligence built for Nigerian clinical practice.</p>
      <div class="info-box">
        <strong>Your verified profile</strong><br>
        Specialization: <strong>${opts.specialization}</strong><br>
        Status: <span class="badge badge-approved">Verified Clinician</span>
      </div>
      <ul style="font-size:15px;color:#444;line-height:2">
        <li>AI-powered differential diagnoses</li>
        <li>SOAP note generation</li>
        <li>Structured referral packets</li>
        <li>Full patient management suite</li>
      </ul>
      <a href="${APP_URL}/dashboard" class="cta">Open Doctor Dashboard →</a>
    `),
  });
}

/** Sent on rejection with reason. */
export async function sendRejectionEmail(opts: {
  to:              string;
  doctorName:      string;
  rejectionReason: string;
}): Promise<void> {
  await sendEmail({
    to:      opts.to,
    subject: "MedBridge — Update on your doctor application",
    html:    baseTemplate(`
      <h2>Application Update</h2>
      <p>Hi Dr. ${opts.doctorName},</p>
      <p>After reviewing your application, we were unable to approve it at this time.</p>
      <div class="warn-box">
        <strong>Reason:</strong> ${opts.rejectionReason}
      </div>
      <p>You're welcome to reapply once the issue is resolved. Please ensure your MDCN number matches exactly what's on your registration certificate.</p>
      <a href="${APP_URL}/signup/doctor" class="cta">Reapply</a>
      <p style="font-size:13px;color:#888">
        If you believe this is an error, contact doctors@medbridge.health with your MDCN number and a copy of your certificate.
      </p>
    `),
  });
}

/** Internal admin alert when a new application arrives. */
export async function sendAdminNewApplicationAlert(opts: {
  doctorName:     string;
  mdcnNumber:     string;
  specialization: string;
  doctorId:       string;
}): Promise<void> {
  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: `[MedBridge] New doctor application — ${opts.doctorName}`,
    html:    baseTemplate(`
      <h2>New Doctor Application</h2>
      <div class="info-box">
        <strong>Name:</strong> ${opts.doctorName}<br>
        <strong>MDCN:</strong> ${opts.mdcnNumber}<br>
        <strong>Specialization:</strong> ${opts.specialization}<br>
        <strong>Doctor ID:</strong> ${opts.doctorId}
      </div>
      <a href="${APP_URL}/dashboard/admin/doctors" class="cta">Review in Admin Panel →</a>
    `),
  });
}
