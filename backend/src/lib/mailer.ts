import nodemailer, { type Transporter } from 'nodemailer';

// Configuration du transporteur SMTP (compatible Gmail, Brevo, Resend, Mailgun, OVH, etc.)
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"OnlyAdults" <contact@onlyadults.com>';

let transporter: Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  console.log(`[Mailer] SMTP Transporter configured on ${smtpHost}:${smtpPort}`);
} else {
  console.log('[Mailer] SMTP credentials not set. Emails will be logged to console.');
}

// Modèle de template HTML Dark & Gold haut de gamme
function getEmailLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#090a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#090a0f;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#12141c;border:1px solid #262938;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 24px 20px;border-bottom:1px solid #1e2230;">
              <div style="font-size:24px;font-weight:900;letter-spacing:1px;color:#ffffff;">
                ONLY<span style="color:#d97706;">ADULTS</span>
              </div>
              <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#9ca3af;text-transform:uppercase;margin-top:4px;">
                Plateforme &amp; Club Privé
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px;border-top:1px solid #1e2230;background-color:#0c0e14;font-size:11px;color:#6b7280;line-height:1.6;">
              <p style="margin:0 0 6px 0;">
                Cet email confidentiel s'adresse exclusivement au titulaire du compte OnlyAdults.
              </p>
              <p style="margin:0;font-size:10px;color:#4b5563;">
                &copy; 2026 OnlyAdults Inc. Accès strictement réservé aux personnes majeures (18+).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendMailSafely({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    if (transporter) {
      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });
      console.log(`[Mailer] Email sent successfully to ${to} (${subject})`);
      return true;
    } else {
      console.log(`[Mailer:DEV_MODE] Would send email to: ${to}`);
      console.log(`[Mailer:DEV_MODE] Subject: ${subject}`);
      return true;
    }
  } catch (error) {
    console.error(`[Mailer] Failed to send email to ${to}:`, error);
    return false;
  }
}

/**
 * 1. Email de confirmation de dépôt de demande de vérification
 */
export async function sendVerificationRequestReceivedEmail(
  toEmail: string,
  displayName: string,
  documentType: string
) {
  const subject = 'Demande de vérification de profil reçue - OnlyAdults';
  const html = getEmailLayout(
    subject,
    `
    <h1 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 16px 0;">
      Bonjour ${displayName},
    </h1>
    <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:0 0 16px 0;">
      Nous confirmons la bonne réception de votre demande de vérification de profil et de créateur officiel sur <strong style="color:#ffffff;">OnlyAdults</strong>.
    </p>

    <div style="background-color:#1a1e2a;border-left:4px solid #d97706;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;font-weight:700;">
        Détails de la demande :
      </p>
      <p style="margin:0;font-size:13px;color:#ffffff;">
        Pièce justificative : <strong>${documentType}</strong><br>
        Statut actuel : <span style="color:#fbbf24;font-weight:700;">En cours d'examen par les modérateurs</span>
      </p>
    </div>

    <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 24px 0;">
      Notre équipe de modération analyse votre dossier sous <strong>24h à 48h ouvrées</strong> en toute confidentialité. Dès validation, vous recevrez une notification et le badge bleu certifié apparaîtra sur votre profil.
    </p>

    <div align="center">
      <a href="https://onlyadults-frontend.vercel.app/settings" style="display:inline-block;padding:12px 28px;border-radius:14px;background-color:#ffffff;color:#000000;font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 4px 12px rgba(255,255,255,0.15);">
        Consulter mon compte
      </a>
    </div>
    `
  );

  return sendMailSafely({ to: toEmail, subject, html });
}

/**
 * 2. Email de félicitations : profil vérifié et approuvé
 */
export async function sendVerificationApprovedEmail(
  toEmail: string,
  displayName: string
) {
  const subject = '🎉 Félicitations ! Votre profil OnlyAdults est certifié';
  const html = getEmailLayout(
    subject,
    `
    <div align="center" style="margin-bottom:20px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:28px;background-color:rgba(16,185,129,0.15);line-height:56px;font-size:28px;text-align:center;">
        ✅
      </div>
    </div>

    <h1 style="font-size:20px;font-weight:800;color:#ffffff;text-align:center;margin:0 0 16px 0;">
      Profil Vérifié &amp; Approuvé !
    </h1>
    <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:0 0 16px 0;text-align:center;">
      Félicitations <strong>${displayName}</strong>, votre dossier de certification a été validé avec succès par notre équipe de sécurité.
    </p>

    <div style="background-color:#13251c;border:1px solid #166534;border-radius:16px;padding:18px;margin:24px 0;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#4ade80;font-weight:700;">
        Vos nouveaux avantages membres :
      </p>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#86efac;line-height:1.7;">
        <li>Badge bleu certifié affiché sur vos publications et votre profil</li>
        <li>Stories privées débloquées et éligibilité aux diffusions VIP</li>
        <li>Messagerie instantanée sécurisée prioritaire</li>
      </ul>
    </div>

    <div align="center" style="margin-top:28px;">
      <a href="https://onlyadults-frontend.vercel.app/profile" style="display:inline-block;padding:14px 32px;border-radius:14px;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 4px 16px rgba(16,185,129,0.3);">
        Accéder à mon profil certifié
      </a>
    </div>
    `
  );

  return sendMailSafely({ to: toEmail, subject, html });
}

/**
 * 3. Email de refus motivé : demande de vérification refusée
 */
export async function sendVerificationRejectedEmail(
  toEmail: string,
  displayName: string,
  rejectionNote?: string
) {
  const subject = 'Mise à jour concernant votre demande de vérification - OnlyAdults';
  const html = getEmailLayout(
    subject,
    `
    <h1 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 16px 0;">
      Bonjour ${displayName},
    </h1>
    <p style="font-size:14px;color:#d1d5db;line-height:1.6;margin:0 0 16px 0;">
      Nous avons examiné votre demande de vérification de profil. Malheureusement, celle-ci n&apos;a pas pu être validée en l&apos;état.
    </p>

    <div style="background-color:#211717;border-left:4px solid #ef4444;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px 0;font-size:12px;color:#fca5a5;text-transform:uppercase;font-weight:700;">
        Motif de la décision :
      </p>
      <p style="margin:0;font-size:13px;color:#fecaca;line-height:1.5;">
        ${rejectionNote || "La pièce d'identité fournie est illisible, incomplète ou ne correspond pas aux informations requises pour les profils 18+."}
      </p>
    </div>

    <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 24px 0;">
      Vous pouvez soumettre un nouveau justificatif directement depuis vos paramètres dès que vous le souhaitez.
    </p>

    <div align="center">
      <a href="https://onlyadults-frontend.vercel.app/settings" style="display:inline-block;padding:12px 28px;border-radius:14px;background-color:#ffffff;color:#000000;font-size:13px;font-weight:800;text-decoration:none;">
        Mettre à jour mes documents
      </a>
    </div>
    `
  );

  return sendMailSafely({ to: toEmail, subject, html });
}
