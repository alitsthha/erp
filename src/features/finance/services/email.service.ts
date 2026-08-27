import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/firebase/config";

const MAIL_COLLECTION = "mail";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: "base64";
    contentType: string;
  }>;
}

export async function queueEmail(message: EmailMessage): Promise<string> {
  const recipient = message.to.trim();
  if (!recipient) {
    throw new Error("A recipient email address is required.");
  }

  const reference = await addDoc(collection(db, MAIL_COLLECTION), {
    to: recipient,
    message: {
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
      ...(message.attachments ? { attachments: message.attachments } : {}),
    },
    status: "queued",
    createdAt: serverTimestamp(),
  });

  return reference.id;
}
