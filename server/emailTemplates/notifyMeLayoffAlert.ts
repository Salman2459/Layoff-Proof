import moment from "moment";

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type NotifyMeLayoffAlertTemplateParams = {
  selectedCompanyName: string;
  detectedCompanyName: string;
  date: Date;
  details?: string | null;
  sourceUrl?: string | null;
};

export function renderNotifyMeLayoffAlertEmail(params: NotifyMeLayoffAlertTemplateParams) {
  const selectedCompanyName = escapeHtml(params.selectedCompanyName);
  const detectedCompanyName = escapeHtml(params.detectedCompanyName);
  const dateStr = moment(params.date).format("MMM D, YYYY");
  const details = params.details ? escapeHtml(params.details) : "";
  const sourceUrl = params.sourceUrl ? String(params.sourceUrl) : "";

  const subject = `Layoff alert: ${params.selectedCompanyName}`;

  const text =
    `Layoff alert for ${params.selectedCompanyName}\n\n` +
    `We detected a layoff-related update for your selected company.\n\n` +
    `Selected company: ${params.selectedCompanyName}\n` +
    `Detected company: ${params.detectedCompanyName}\n` +
    `Date: ${moment(params.date).format("YYYY-MM-DD")}\n` +
    (params.details ? `Details: ${params.details}\n` : "") +
    (params.sourceUrl ? `Source: ${params.sourceUrl}\n` : "") +
    `\nYou’re receiving this email because you asked us to notify you.\n`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      We detected a layoff-related update for ${selectedCompanyName}.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;box-shadow:0 6px 24px rgba(18,22,33,0.08);">
            <tr>
              <td style="padding:22px 22px 10px 22px;">
                <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:13px;color:#6b7280;letter-spacing:0.2px;">
                  Layoff Proof
                </div>
                <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:22px;line-height:1.25;color:#111827;font-weight:700;margin-top:6px;">
                  Layoff alert: ${selectedCompanyName}
                </div>
                <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.5;color:#374151;margin-top:10px;">
                  We detected a layoff-related update matching your selected company.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 22px 18px 22px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 14px 6px 14px;">
                      <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#6b7280;">Selected company</div>
                      <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#111827;font-weight:600;margin-top:2px;">${selectedCompanyName}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 14px 6px 14px;">
                      <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#6b7280;">Detected company</div>
                      <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#111827;font-weight:600;margin-top:2px;">${detectedCompanyName}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 14px 14px 14px;">
                      <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#6b7280;">Date</div>
                      <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#111827;font-weight:600;margin-top:2px;">${escapeHtml(dateStr)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${details ? `<tr>
              <td style="padding:0 22px 18px 22px;">
                <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;color:#6b7280;margin-bottom:6px;">Details</div>
                <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;line-height:1.55;color:#111827;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;">
                  ${details}
                </div>
              </td>
            </tr>` : ""}

            ${sourceUrl ? `<tr>
              <td style="padding:0 22px 22px 22px;">
                <a href="${escapeHtml(sourceUrl)}" style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#4f46e5;text-decoration:none;">
                  View source
                </a>
              </td>
            </tr>` : ""}

            <tr>
              <td style="padding:16px 22px 22px 22px;border-top:1px solid #eef2f7;">
                <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
                  You’re receiving this email because you requested notifications for your selected company.
                </div>
              </td>
            </tr>
          </table>

          <div style="font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;font-size:11px;color:#9ca3af;margin-top:14px;">
            © ${new Date().getFullYear()} Layoff Proof
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

