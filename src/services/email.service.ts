// services/emailService.ts
import { Resend } from "resend";

export const sendEmail = async ({
  to,
  subject,
  htmlContent,
  from = "onboarding@medium.dev",
  resendKey,
}: {
  to: string;
  subject: string;
  htmlContent: string;
  from: string;
  resendKey: string;
}) => {
  try {
    const resend = new Resend(resendKey);
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html: htmlContent,
    });

    return { success: true, response };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};
