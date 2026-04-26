import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// ============================================================================
// 1. GLOBAL INITIALIZATION
// ============================================================================

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================================================
// 2. INTERNAL HELPER FUNCTIONS
// ============================================================================

/**
 * Helper: Slices text into overlapping chunks for AI embeddings
 */
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex > text.length) endIndex = text.length;
    
    chunks.push(text.slice(startIndex, endIndex));
    startIndex += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Helper: Verifies Admin privileges for Workspace Management
 */
async function verifyAdminStatus(uid: string, orgId: string) {
  const membershipQuery = await db
    .collection("users")
    .doc(uid)
    .collection("memberships")
    .where("orgId", "==", orgId)
    .where("role", "==", "admin")
    .get();

  if (membershipQuery.empty) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You do not have Admin privileges for this workspace."
    );
  }
}

// ============================================================================
// 3. AI & STORAGE FUNCTIONS
// ============================================================================
const EMBEDDING_MODEL = "gemini-embedding-001"; 
const CHAT_MODEL = "gemini-3-flash-preview";    

const EMBEDDING_DIMENSIONS = 768;

/**
 * Triggers on PDF upload. Extracts text, generates embeddings, and saves to Firestore Vector DB.
 */

export const processUploadedPDF = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  if (!filePath || !filePath.endsWith(".pdf") || !filePath.includes("organizations/")) {
    return;
  }

  const pathSegments = filePath.split("/");
  const orgId = pathSegments[1];
  const announcementId = pathSegments[3];

  console.log(`Processing PDF for Org: ${orgId}, Announcement: ${announcementId}`);

  try {
    const bucket = admin.storage().bucket(object.bucket);
    const [fileBuffer] = await bucket.file(filePath).download();

    // ========================================================================
    // MODERN EXTRACTION (Mozilla pdfjs-dist)
    // ========================================================================
    const uint8Array = new Uint8Array(fileBuffer);
    const loadingTask = pdfjsLib.getDocument(uint8Array);
    const pdfDocument = await loadingTask.promise;
    
    let fullText = "";
    
    // Extract text page by page (Highly memory efficient for 6MB+ PDFs)
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + " ";
    }
    // ========================================================================

    const rawText = fullText.replace(/\s+/g, ' ').trim(); 

    if (!rawText) {
      console.log("PDF is empty or unreadable.");
      return;
    }

    const chunks = chunkText(rawText);
    console.log(`Generated ${chunks.length} chunks from ${pdfDocument.numPages} pages.`);

    const MAX_BATCH_SIZE = 499;
    if (chunks.length > MAX_BATCH_SIZE) {
      console.warn(`Chunk count ${chunks.length} exceeds batch limit. Truncating to first 499 chunks.`);
      chunks.splice(MAX_BATCH_SIZE);
    }

    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const batch = db.batch();

    for (let i = 0; i < chunks.length; i++) {
      const textChunk = chunks[i];
      const result = await embeddingModel.embedContent(textChunk);
      
      const vectorValues = result.embedding.values.slice(0, EMBEDDING_DIMENSIONS);

      const chunkRef = db.collection("organizations").doc(orgId)
                         .collection("announcements").doc(announcementId)
                         .collection("chunks").doc(`chunk_${i}`);

      batch.set(chunkRef, {
        orgId: orgId,
        announcementId: announcementId,
        text: textChunk,
        embedding: admin.firestore.FieldValue.vector(vectorValues), 
        chunkIndex: i,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    console.log("Successfully embedded and saved all chunks!");

  } catch (error) {
    console.error("Critical Ingestion Failure:", error);
  }
});

// ============================================================================
// 4. WORKSPACE & AUTHENTICATION FUNCTIONS
// ============================================================================

export const verifyCaptcha = functions.https.onCall(async (data, context) => {
  const token = data?.token;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY; 

  if (!token) {
    throw new functions.https.HttpsError("invalid-argument", "Missing captcha token.");
  }

  if (!secretKey) {
    throw new functions.https.HttpsError("internal", "Server configuration error: Secret key missing.");
  }

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      { method: 'POST' }
    );
    
    const verificationData: any = await response.json();

    if (!verificationData.success || verificationData.score < 0.5) {
      throw new functions.https.HttpsError("permission-denied", "Bot activity detected.");
    }

    return { success: true, score: verificationData.score };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message || "Captcha verification failed.");
  }
});

export const generateInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const { orgId, role } = data;
  await verifyAdminStatus(context.auth.uid, orgId);

  const inviteRef = await db.collection("invites").add({
    orgId,
    role,
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true, 
  });

  return { inviteCode: inviteRef.id };
});

export const directAssignUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const { email, orgId, role } = data;
  await verifyAdminStatus(context.auth.uid, orgId);

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const targetUid = userRecord.uid;

    const membershipRef = db.collection("users").doc(targetUid).collection("memberships");
    const existing = await membershipRef.where("orgId", "==", orgId).get();

    if (!existing.empty) {
      throw new functions.https.HttpsError("already-exists", "User is already in this organization.");
    }

    await membershipRef.doc(orgId).set({
      orgId,
      role,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedByAdmin: context.auth.uid,
    });

    return { success: true, message: `Successfully added ${email} to ${orgId}` };

  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", "No user found with that email address.");
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const updateMemberRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  
  const { targetUid, orgId, newRole } = data;
  await verifyAdminStatus(context.auth.uid, orgId);

  if (targetUid === context.auth.uid) {
     throw new functions.https.HttpsError("invalid-argument", "You cannot demote yourself.");
  }

  const membershipRef = db.collection("users").doc(targetUid).collection("memberships");
  const existing = await membershipRef.where("orgId", "==", orgId).get();

  if (existing.empty) throw new functions.https.HttpsError("not-found", "User is not in this org.");

  await existing.docs[0].ref.update({ role: newRole });
  return { success: true, message: `Role updated to ${newRole}` };
});

export const removeMember = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  
  const { targetUid, orgId } = data;
  await verifyAdminStatus(context.auth.uid, orgId);

  if (targetUid === context.auth.uid) {
    throw new functions.https.HttpsError("invalid-argument", "You cannot remove yourself.");
  }

  const membershipRef = db.collection("users").doc(targetUid).collection("memberships");
  const existing = await membershipRef.where("orgId", "==", orgId).get();

  if (!existing.empty) {
    await existing.docs[0].ref.delete();
  }
  return { success: true, message: "User removed from workspace." };
});

// ============================================================================
// 5. Q&A PIPELINE
// ============================================================================

export const askDocumentQuestion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");

  const { orgId, announcementId, question } = data;

  try {
    const embeddingModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

    const qResult = await embeddingModel.embedContent(question);
    const questionVector = qResult.embedding.values.slice(0, EMBEDDING_DIMENSIONS);

    const chunksRef = db.collection("organizations").doc(orgId)
                        .collection("announcements").doc(announcementId)
                        .collection("chunks");

    const vectorQuery = chunksRef.findNearest('embedding', admin.firestore.FieldValue.vector(questionVector), {
      limit: 5,
      distanceMeasure: 'COSINE'
    });

    const chunkSnapshots = await vectorQuery.get();
    let contextText = chunkSnapshots.docs.map(doc => doc.data().text).join("\n\n---\n\n");

    const chatModel = genAI.getGenerativeModel({ model: CHAT_MODEL });
    const prompt = `You are Donna, a professional AI assistant. Use the following context to answer: ${contextText}\n\nQuestion: ${question}`;

    const aiResponse = await chatModel.generateContent(prompt);
    return { answer: aiResponse.response.text() };

  } catch (error: any) {
    console.error("Q&A Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});