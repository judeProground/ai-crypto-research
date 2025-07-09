import { google } from "googleapis";
import { authorize } from "./auth.js";
import fs from "fs/promises";
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const PROCESSED_DIR = path.join(process.cwd(), "data/processed");

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

async function isProcessed(messageId) {
  try {
    const dateFolders = await fs.readdir(PROCESSED_DIR);
    for (const folder of dateFolders) {
      const folderPath = path.join(PROCESSED_DIR, folder);
      const stats = await fs.stat(folderPath);
      if (stats.isDirectory()) {
        const filePath = path.join(folderPath, `${messageId}.json`);
        try {
          await fs.access(filePath);
          return true; // File exists
        } catch (e) {
          // File does not exist, continue checking other folders
        }
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      return false; // Processed directory doesn't exist, so nothing is processed
    }
    throw error;
  }
  return false;
}

const GMAIL_QUERY = "in:inbox";

export async function fetchLatestNewsletters({ days = 1 } = {}) {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });
  if (!auth) {
    console.log("No Gmail authentication found.");
    return [];
  }

  // --- KST Timezone Logic with dayjs ---
  const timeZone = "Asia/Seoul";
  const nowInKST = dayjs().tz(timeZone);

  const startDateKST = nowInKST.subtract(days - 1, "day").startOf("day");
  const endDateKST = nowInKST.endOf("day");

  const afterTimestamp = startDateKST.unix();
  const beforeTimestamp = endDateKST.unix();

  const dateQuery = `after:${afterTimestamp} before:${beforeTimestamp}`;
  // --- End KST Timezone Logic ---

  const finalQuery = `${GMAIL_QUERY} ${dateQuery}`;
  console.log(`Using Gmail query: "${finalQuery}"`);
  console.log(
    `Fetching emails from ${startDateKST.format("YYYY-MM-DD HH:mm:ss")} to ${endDateKST.format(
      "YYYY-MM-DD HH:mm:ss"
    )} (KST)`
  );

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
    if (await isProcessed(message.id)) {
      console.log(`Skipping already processed message ID: ${message.id}`);
      continue;
    }
    console.log(`Fetching details for new message ID: ${message.id}`);
    const details = await getMessageDetails(auth, message.id);
    newsletters.push(details);
  }

  return newsletters;
}
