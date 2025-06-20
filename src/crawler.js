import { google } from "googleapis";
import { authorize } from "./auth.js";

function findPart(parts, mimeType) {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part.body.data;
    }
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findBodyData(payload) {
  if (payload.body.data) {
    return payload.body.data;
  }

  if (payload.parts) {
    const plainTextPart = findPart(payload.parts, "text/plain");
    if (plainTextPart) return plainTextPart;

    const htmlPart = findPart(payload.parts, "text/html");
    if (htmlPart) return htmlPart;
  }

  return null;
}

async function getMessageDetails(auth, messageId) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
  });

  const payload = res.data.payload;
  const headers = payload.headers;
  const subject = headers.find((header) => header.name === "Subject")?.value || "";
  const from = headers.find((header) => header.name === "From")?.value || "";
  const date = headers.find((header) => header.name === "Date")?.value || "";

  const bodyData = findBodyData(payload);
  const body = bodyData ? Buffer.from(bodyData, "base64").toString("utf8") : "";

  return { id: messageId, subject, from, date, body };
}

const GMAIL_QUERY = "in:inbox";

export async function fetchLatestNewsletters() {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });
  if (!auth) {
    console.log("No Gmail authentication found.");
    return [];
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  const yesterdayQuery = `after:${year}/${month}/${day}`;

  const finalQuery = `${GMAIL_QUERY} ${yesterdayQuery}`;
  console.log(`Using Gmail query: "${finalQuery}"`);

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: finalQuery,
  });

  const messages = listResponse.data.messages;
  if (!messages || messages.length === 0) {
    console.log("No messages found.");
    return [];
  }

  const newsletters = [];
  for (const message of messages) {
    console.log(`Fetching details for message ID: ${message.id}`);
    const details = await getMessageDetails(auth, message.id);
    newsletters.push(details);
  }

  return newsletters;
}
