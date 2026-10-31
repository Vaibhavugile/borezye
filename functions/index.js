const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";

function dateText(value) {
  if (value?.toDate) return value.toDate().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "";
}
function fillTemplate(template, p, branchCode) {
  const v = {
    branchCode, receiptNumber: p.receiptNumber || "",
    amountPaid: Number(p.amountPaid || 0).toLocaleString("en-IN"),
    totalAmount: Number(p.totalAmount || 0).toLocaleString("en-IN"),
    balance: Number(p.balance || 0).toLocaleString("en-IN"),
    clientName: p.clientName || "", contact: p.contact || "",
    receiptBy: p.receiptBy || "", customerBy: p.customerBy || "",
    paymentStatus: p.paymentStatus || "", createdAt: dateText(p.createdAt),
    rentCollected: Number(p.rentCollected || 0).toLocaleString("en-IN"),
    rentPending: Number(p.rentPending || 0).toLocaleString("en-IN"),
    depositCollected: Number(p.depositCollected || 0).toLocaleString("en-IN"),
    depositPending: Number(p.depositPending || 0).toLocaleString("en-IN"),
    depositReturned: Number(p.depositReturned || 0).toLocaleString("en-IN"),
    depositWithYou: Number(p.depositWithYou || 0).toLocaleString("en-IN"),
    finalRent: Number(p.finalRent || 0).toLocaleString("en-IN"),
    finalDeposit: Number(p.finalDeposit || 0).toLocaleString("en-IN"),
    grandTotalRent: Number(p.grandTotalRent || 0).toLocaleString("en-IN"),
    grandTotalDeposit: Number(p.grandTotalDeposit || 0).toLocaleString("en-IN"),
    discountOnRent: Number(p.discountOnRent || 0).toLocaleString("en-IN"),
    discountOnDeposit: Number(p.discountOnDeposit || 0).toLocaleString("en-IN"),
    appliedCredit: Number(p.appliedCredit || 0).toLocaleString("en-IN"),
    bookingStage: p.bookingStage || "", pickupDate: dateText(p.pickupDate),
    returnDate: dateText(p.returnDate), firstPaymentMode: p.firstPaymentMode || "",
    firstPaymentDetails: p.firstPaymentDetails || "",
    secondPaymentMode: p.secondPaymentMode || "",
    secondPaymentDetails: p.secondPaymentDetails || "",
    specialNote: p.specialNote || "",
    productsSummary: Array.isArray(p.productsSummary)
      ? p.productsSummary.map(x => `${x.productName || x.productCode || ""} × ${x.quantity || 1}`).join(", ")
      : "",
  };
  return String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(v, k) ? String(v[k]) : m
  );
}

// Confirmed customer path: customers/{branchCode}/users/{customerId}
// The FCM token is stored directly in the customer document as fcmToken.
async function getBranchTokens(branchCode, customerIds) {
  const byToken = new Map();
  for (const customerId of [...new Set((customerIds || []).map(String))]) {
    const customerRef = db.collection("customers").doc(String(branchCode))
      .collection("users").doc(customerId);
    const snap = await customerRef.get();
    if (!snap.exists) continue;
    const customer = snap.data() || {};
    const token = String(customer.fcmToken || "").trim();
    if (!token) continue;
    if (customer.branch && String(customer.branch).trim() !== String(branchCode)) continue;
    byToken.set(token, { token, ref: customerRef });
  }
  return [...byToken.values()];
}

async function sendBranchPush({ branchCode, customerIds, title, body, imageUrl, clickUrl, data = {} }) {
  const recipients = await getBranchTokens(branchCode, customerIds);
  let sent = 0, failed = 0, invalidTokens = 0;
  for (let i = 0; i < recipients.length; i += 500) {
    const chunk = recipients.slice(i, i + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: chunk.map(x => x.token),
      notification: { title: String(title || "New payment received").slice(0, 100),
        body: String(body || "").slice(0, 450), ...(imageUrl ? { imageUrl } : {}) },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")])),
      android: { priority: "high" },
      webpush: { headers: { Urgency: "high" },
        notification: { title: String(title || "New payment received"), body: String(body || ""),
          ...(imageUrl ? { image: imageUrl } : {}) },
        ...(clickUrl ? { fcmOptions: { link: clickUrl } } : {}) },
      apns: { payload: { aps: { sound: "default" } },
        ...(imageUrl ? { fcmOptions: { image: imageUrl } } : {}) },
    });
    response.responses.forEach((r, index) => {
      if (r.success) sent++;
      else {
        failed++;
        if (["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(r.error?.code)) {
          invalidTokens++;
          chunk[index].ref.update({
            fcmToken: FieldValue.delete(),
            fcmTokenInvalidatedAt: FieldValue.serverTimestamp(),
          }).catch(e => logger.warn("Could not clear invalid FCM token", e));
        }
      }
    });
  }
  return { targeted: recipients.length, sent, failed, invalidTokens };
}

exports.notifySelectedBranchOwnersOnPaymentCreated = onDocumentCreated(
  { document: "products/{branchCode}/payments/{paymentId}", region: REGION, retry: true, memory: "512MiB" },
  async event => {
    const { branchCode, paymentId } = event.params;
    const payment = event.data?.data();
    if (!payment) return;
    if (String(payment.branchCode || "").trim() !== String(branchCode).trim()) {
      logger.error("Payment branchCode does not match its path; skipped", { branchCode, paymentId });
      return;
    }

    const deliveryRef = db.collection("paymentOwnerNotificationDeliveries").doc(event.id);
    const claimed = await db.runTransaction(async tx => {
      const old = await tx.get(deliveryRef);
      if (old.exists) return false;
      tx.create(deliveryRef, { eventId: event.id, branchCode, paymentId,
        status: "processing", createdAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) return;

    try {
      const settingsSnap = await db.collection("paymentOwnerNotificationSettings").doc(String(branchCode)).get();
      if (!settingsSnap.exists) {
        await deliveryRef.set({ status: "skipped", reason: "settings-not-found", completedAt: FieldValue.serverTimestamp() }, { merge: true });
        return;
      }
      const settings = settingsSnap.data() || {};
      if (settings.enabled !== true) {
        await deliveryRef.set({ status: "skipped", reason: "disabled", completedAt: FieldValue.serverTimestamp() }, { merge: true });
        return;
      }
      const ids = Array.isArray(settings.ownerCustomerIds) ? settings.ownerCustomerIds :
        (Array.isArray(settings.ownerUids) ? settings.ownerUids : []);
      const title = fillTemplate(settings.title || "New payment received", payment, branchCode);
      const body = fillTemplate(settings.message || "Payment ₹{amountPaid} received for {receiptNumber}.", payment, branchCode);
      const result = await sendBranchPush({ branchCode, customerIds: ids, title, body,
        imageUrl: settings.imageUrl || "", clickUrl: settings.clickUrl || "",
        data: { type: "branch_payment", branchCode, paymentId, receiptNumber: payment.receiptNumber || "" } });
      await deliveryRef.set({ status: "completed", ...result, completedAt: FieldValue.serverTimestamp() }, { merge: true });
      logger.info("Branch payment notification result", { branchCode, paymentId, ...result });
    } catch (error) {
      await deliveryRef.set({ status: "error", error: error.message || String(error), completedAt: FieldValue.serverTimestamp() }, { merge: true });
      throw error;
    }
  }
);

exports.sendBranchPaymentOwnerTest = onCall({ region: REGION }, async request => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Please sign in.");
  const branchCode = String(request.data?.branchCode || "").trim();
  if (!branchCode) throw new HttpsError("invalid-argument", "Branch code is required.");
  const settingsSnap = await db.collection("paymentOwnerNotificationSettings").doc(branchCode).get();
  if (!settingsSnap.exists) throw new HttpsError("failed-precondition", "Save branch settings first.");
  const settings = settingsSnap.data() || {};
  const saved = Array.isArray(settings.ownerCustomerIds) ? settings.ownerCustomerIds :
    (Array.isArray(settings.ownerUids) ? settings.ownerUids : []);
  const requested = Array.isArray(request.data?.ownerUids) ? request.data.ownerUids.map(String) : [];
  const ids = requested.filter(id => saved.includes(id));
  if (!ids.length) throw new HttpsError("failed-precondition", "No selected customer IDs are saved for this branch.");
  const sample = { amountPaid: 1000, totalAmount: 1000, balance: 0, receiptNumber: "TEST-RECEIPT" };
  return sendBranchPush({
    branchCode, customerIds: ids,
    title: fillTemplate(request.data?.title || settings.title, sample, branchCode),
    body: fillTemplate(request.data?.message || settings.message, sample, branchCode),
    imageUrl: request.data?.imageUrl || settings.imageUrl || "",
    clickUrl: request.data?.clickUrl || settings.clickUrl || "",
    data: { type: "branch_payment_test", branchCode },
  });
});
