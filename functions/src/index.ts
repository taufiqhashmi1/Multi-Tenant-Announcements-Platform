import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper: Verifies Admin privileges
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

/**
 * Function: Verify reCAPTCHA v3 Token
 */
export const verifyCaptcha = functions.https.onCall(async (request) => {
  const token = request.data?.token;
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

/**
 * Function 1: Generate an Invite Link
 */
export const generateInvite = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const { orgId, role } = request.data;
  await verifyAdminStatus(request.auth.uid, orgId);

  const inviteRef = await db.collection("invites").add({
    orgId,
    role,
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true, 
  });

  return { inviteCode: inviteRef.id };
});

/**
 * Function 2: Directly Assign a User via Email
 */
export const directAssignUser = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const { email, orgId, role } = request.data;
  await verifyAdminStatus(request.auth.uid, orgId);

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const targetUid = userRecord.uid;

    const membershipRef = db.collection("users").doc(targetUid).collection("memberships");
    const existing = await membershipRef.where("orgId", "==", orgId).get();

    if (!existing.empty) {
      throw new functions.https.HttpsError("already-exists", "User is already in this organization.");
    }

    await membershipRef.add({
      orgId,
      role,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedByAdmin: request.auth.uid,
    });

    return { success: true, message: `Successfully added ${email} to ${orgId}` };

  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found", "No user found with that email address.");
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Function 3: Change Member Role
 */
export const updateMemberRole = functions.https.onCall(async (request) => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  
  const { targetUid, orgId, newRole } = request.data;
  await verifyAdminStatus(request.auth.uid, orgId);

  if (targetUid === request.auth.uid) {
     throw new functions.https.HttpsError("invalid-argument", "You cannot demote yourself.");
  }

  const membershipRef = db.collection("users").doc(targetUid).collection("memberships");
  const existing = await membershipRef.where("orgId", "==", orgId).get();

  if (existing.empty) throw new functions.https.HttpsError("not-found", "User is not in this org.");

  await existing.docs[0].ref.update({ role: newRole });
  return { success: true, message: `Role updated to ${newRole}` };
});

/**
 * Function 4: Remove Member from Workspace
 */
export const removeMember = functions.https.onCall(async (request) => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  
  const { targetUid, orgId } = request.data;
  await verifyAdminStatus(request.auth.uid, orgId);

  if (targetUid === request.auth.uid) {
    throw new functions.https.HttpsError("invalid-argument", "You cannot remove yourself.");
  }

  const membershipRef = db.collection("users").doc(targetUid).collection("memberships");
  const existing = await membershipRef.where("orgId", "==", orgId).get();

  if (!existing.empty) {
    await existing.docs[0].ref.delete();
  }
  return { success: true, message: "User removed from workspace." };
});