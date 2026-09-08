import sgMail from "@sendgrid/mail";
import { config } from "../config/env";

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

interface SendEmailOptions {
  email: string;
  templateId: string;
  data?: Record<string, unknown>; // dynamic template data
}

const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const msg = {
    to: options.email,
    from: config.sendgrid.mail as string,
    templateId: options.templateId,
    dynamic_template_data: options.data,
  };

  try {
    await sgMail.send(msg);
    console.log("Email Sent");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email could not be sent";
    console.error("SendGrid Error:", message);
    throw new Error(message);
  }
};

export default sendEmail;
