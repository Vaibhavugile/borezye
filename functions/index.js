const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { defineSecret } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");

const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const PDFDocument = require("pdfkit");

const logger = require("firebase-functions/logger");

initializeApp();

const db = getFirestore();
const storage = getStorage();

const REGION = "asia-south1";

const MSG91_AUTHKEY = defineSecret("MSG91_AUTHKEY");

const MSG91_URL = "https\://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

const MSG91_INTEGRATED_NUMBER = "918793744117";

const MSG91_NAMESPACE = "966353f8_de57_41d3_b22b_286d3ad61238";

const MSG91_TEMPLATE_NAME = "new_booking_notification";

const MSG91_LANGUAGE_CODE = "en";

// Separate approved MSG91 template for the daily ledger document.
const DAILY_LEDGER_TEMPLATE_NAME = "daily_ledger_report";
const DAILY_LEDGER_LANGUAGE_CODE = "en";
const DAILY_LEDGER_TIME_ZONE = "Asia/Kolkata";
const DAILY_LEDGER_STORAGE_FOLDER = "daily-ledger-reports";
const DAILY_LEDGER_INTEGRATED_NUMBER = MSG91_INTEGRATED_NUMBER;
const REPORT_TIME_ZONE = DAILY_LEDGER_TIME_ZONE;
const REPORT_BUCKET_FOLDER = DAILY_LEDGER_STORAGE_FOLDER;

function numberText(value) {

  const n = Number(value || 0);

  return Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0";

}

function dateText(value) {

  if (!value) return "";

  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {

    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",

  });

}

function getProductCodes(payment) {

  const items = Array.isArray(payment.productsSummary)

    ? payment.productsSummary

    : Array.isArray(payment.products) ? payment.products : [];

  return items.map((item) => {

    const code = item?.productCode || item?.code || item?.productId || "";

    const quantity = Math.max(1, Number(item?.quantity || 1));

    return code ? `${code} × ${quantity}` : "";

  }).filter(Boolean).join(", ");

}

function fillTemplate(template, payment, branchCode) {

  const values = {

    branchCode,

    receiptNumber: payment.receiptNumber || "",

    amountPaid: numberText(payment.amountPaid),

    totalAmount: numberText(payment.totalAmount),

    balance: numberText(payment.balance),

    clientName: payment.clientName || "",

    contact: payment.contact || "",

    receiptBy: payment.receiptBy || "",

    customerBy: payment.customerBy || "",

    paymentStatus: payment.paymentStatus || "",

    createdAt: dateText(payment.createdAt),

    rentCollected: numberText(payment.rentCollected),

    rentPending: numberText(payment.rentPending),

    depositCollected: numberText(payment.depositCollected),

    depositPending: numberText(payment.depositPending),

    depositReturned: numberText(payment.depositReturned),

    depositWithYou: numberText(payment.depositWithYou),

    finalRent: numberText(payment.finalRent),

    finalDeposit: numberText(payment.finalDeposit),

    grandTotalRent: numberText(payment.grandTotalRent),

    grandTotalDeposit: numberText(payment.grandTotalDeposit),

    discountOnRent: numberText(payment.discountOnRent),

    discountOnDeposit: numberText(payment.discountOnDeposit),

    appliedCredit: numberText(payment.appliedCredit),

    bookingStage: payment.bookingStage || "",

    pickupDate: dateText(payment.pickupDate),

    returnDate: dateText(payment.returnDate),

    firstPaymentMode: payment.firstPaymentMode || "",

    firstPaymentDetails: payment.firstPaymentDetails || "",

    secondPaymentMode: payment.secondPaymentMode || "",

    secondPaymentDetails: payment.secondPaymentDetails || "",

    specialNote: payment.specialNote || "",

    productsSummary: getProductCodes(payment),

  };

  return String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>

    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match

  );

}

// Branch-scoped customer path: customers/{branchCode}/users/{customerId}.

// Phone and FCM token are read from the customer document itself.

async function getBranchCustomers(branchCode, customerIds) {

  const customers = [];

  for (const customerId of [...new Set((customerIds || []).map(String))]) {

    const customerRef = db.collection("customers").doc(String(branchCode)).collection("users").doc(customerId);

    const snap = await customerRef.get();

    if (!snap.exists) continue;

    const customer = snap.data() || {};

    if (customer.branch && String(customer.branch).trim() !== String(branchCode).trim()) continue;

    customers.push({

      id: customerId,

      ref: customerRef,

      name: customer.name || customer.fullName || customer.displayName || "",

      phone: customer.phone || customer.phoneNumber || customer.mobileNumber || customerId,

      fcmToken: String(customer.fcmToken || "").trim(),

      whatsappOptIn: customer.whatsappOptIn === true || customer.whatsappConsent === true,

    });

  }

  return customers;

}

async function sendBranchPush({ customers, title, body, imageUrl, clickUrl, data = {} }) {

  const recipients = customers.filter((customer) => customer.fcmToken);

  let sent = 0, failed = 0, invalidTokens = 0;

  for (let i = 0; i < recipients.length; i += 500) {

    const chunk = recipients.slice(i, i + 500);

    const response = await getMessaging().sendEachForMulticast({

      tokens: chunk.map((customer) => customer.fcmToken),

      notification: {

        title: String(title || "New payment received").slice(0, 100),

        body: String(body || "").slice(0, 450),

        ...(imageUrl ? { imageUrl } : {}),

      },

      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? "")])),

      android: { priority: "high" },

      webpush: {

        headers: { Urgency: "high" },

        notification: { title: String(title || "New payment received"), body: String(body || ""), ...(imageUrl ? { image: imageUrl } : {}) },

        ...(clickUrl ? { fcmOptions: { link: clickUrl } } : {}),

      },

      apns: { payload: { aps: { sound: "default" } }, ...(imageUrl ? { fcmOptions: { image: imageUrl } } : {}) },

    });

    response.responses.forEach((result, index) => {

      if (result.success) { sent++; return; }

      failed++;

      if (["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(result.error?.code)) {

        invalidTokens++;

        chunk[index].ref.update({

          fcmToken: FieldValue.delete(),

          fcmTokenInvalidatedAt: FieldValue.serverTimestamp(),

        }).catch((error) => logger.warn("Could not clear invalid FCM token", { error: error.message, customerId: chunk[index].id }));

      }

    });

  }

  return { targeted: recipients.length, sent, failed, invalidTokens, skippedNoFcmToken: customers.length - recipients.length };

}

function normalizeIndianWhatsAppNumber(value) {

  let digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("0091")) digits = digits.slice(2);

  if (digits.startsWith("91") && digits.length === 12) return digits;

  if (digits.length === 10) return `91${digits}`;

  return "";

}

function normalizePhone(value) {
  return normalizeIndianWhatsAppNumber(value);
}

async function assertAdmin(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Please sign in.");
  }
}

function buildWhatsAppComponents(payment) {

  // Matches the 13 placeholders in the concise booking-confirmation template.

  const values = [

    payment.clientName || "",                 // {{1}} Customer

    payment.receiptNumber || "",              // {{2}} Receipt number

    dateText(payment.pickupDate),              // {{3}} Pickup

    dateText(payment.returnDate),              // {{4}} Return

    getProductCodes(payment),                  // {{5}} Product codes and quantities

    numberText(payment.grandTotalRent),        // {{6}} Total rent

    numberText(payment.discountOnRent),        // {{7}} Rent discount

    numberText(payment.finalRent),             // {{8}} Final rent

    numberText(payment.rentCollected),         // {{9}} Rent paid

    numberText(payment.rentPending),            // {{10}} Rent pending

    numberText(payment.grandTotalDeposit),     // {{11}} Total security deposit

    numberText(payment.depositCollected),      // {{12}} Deposit paid

    numberText(payment.depositPending),        // {{13}} Deposit pending

  ];

  return Object.fromEntries(values.map((value, index) => [

    `body_${index + 1}`, { type: "text", value: String(value ?? "") },

  ]));

}

async function sendMsg91WhatsApp({ customers, payment, authKey }) {

  const optedIn = customers.filter((customer) => customer.whatsappOptIn);

  const phoneMap = new Map();

  let skippedInvalidPhone = 0;

  for (const customer of optedIn) {

    const phone = normalizeIndianWhatsAppNumber(customer.phone);

    if (!phone) { skippedInvalidPhone++; continue; }

    phoneMap.set(phone, customer);

  }

  const phoneNumbers = [...phoneMap.keys()];

  const skippedNoConsent = customers.length - optedIn.length;

  if (!phoneNumbers.length) {

    return {

      targeted: customers.length, accepted: 0, failed: 0,

      skippedNoConsent, skippedInvalidPhone,

      reason: "no-valid-opted-in-whatsapp-recipients",

    };

  }

  const requestBody = {

    integrated_number: MSG91_INTEGRATED_NUMBER,

    content_type: "template",

    payload: {

      messaging_product: "whatsapp",

      type: "template",

      template: {

        name: MSG91_TEMPLATE_NAME,

        language: { code: MSG91_LANGUAGE_CODE, policy: "deterministic" },

        namespace: MSG91_NAMESPACE,

        to_and_components: [{ to: phoneNumbers, components: buildWhatsAppComponents(payment) }],

      },

    },

  };

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      const response = await fetch(MSG91_URL, {

        method: "POST",

        headers: { "Content-Type": "application/json", authkey: authKey },

        body: JSON.stringify(requestBody),

      });

      const responseText = await response.text();

      let providerResponse;

      try { providerResponse = JSON.parse(responseText); }

      catch { providerResponse = { raw: responseText }; }

      if (!response.ok) {

        const error = new Error(`MSG91 HTTP ${response.status}: ${responseText.slice(0, 1000)}`);

        error.status = response.status;

        error.providerResponse = providerResponse;

        throw error;

      }

      return {

        targeted: customers.length,

        accepted: phoneNumbers.length,

        failed: 0,

        skippedNoConsent,

        skippedInvalidPhone,

        providerResponse,

      };

    } catch (error) {

      lastError = error;

      logger.error("MSG91 WhatsApp attempt failed", { attempt, error: error.message, status: error.status || null });

      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) break;

      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));

    }

  }

  throw lastError || new Error("MSG91 WhatsApp request failed.");

}

async function claimDelivery(deliveryRef, eventId, branchCode, paymentId) {

  return db.runTransaction(async (tx) => {

    const snap = await tx.get(deliveryRef);

    const previous = snap.exists ? snap.data() || {} : {};

    if (previous.status === "completed") return { claimed: false, previous };

    const leaseUntil = Number(previous.leaseUntilMs || 0);

    if (previous.status === "processing" && leaseUntil > Date.now()) return { claimed: false, previous };

    tx.set(deliveryRef, {

      eventId, branchCode, paymentId, status: "processing",

      leaseUntilMs: Date.now() + 5 * 60 * 1000,

      updatedAt: FieldValue.serverTimestamp(),

      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),

    }, { merge: true });

    return { claimed: true, previous };

  });

}

exports.notifySelectedBranchOwnersOnPaymentCreated = onDocumentCreated(

  {

    document: "products/{branchCode}/payments/{paymentId}",

    region: REGION,

    retry: true,

    memory: "512MiB",

    secrets: [MSG91_AUTHKEY],

  },

  async (event) => {

    const { branchCode, paymentId } = event.params;

    const payment = event.data?.data();

    if (!payment) return;

    if (String(payment.branchCode || "").trim() !== String(branchCode).trim()) {

      logger.error("Payment branchCode does not match its path; skipped", { branchCode, paymentId });

      return;

    }

    const deliveryRef = db.collection("paymentOwnerNotificationDeliveries").doc(event.id);

    const claim = await claimDelivery(deliveryRef, event.id, branchCode, paymentId);

    if (!claim.claimed) {

      logger.info("Payment notification event already claimed/completed", { branchCode, paymentId, status: claim.previous?.status || "unknown" });

      return;

    }

    const previous = claim.previous || {};

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

      const customerIds = Array.isArray(settings.ownerCustomerIds)

        ? settings.ownerCustomerIds

        : Array.isArray(settings.ownerUids) ? settings.ownerUids : [];

      if (!customerIds.length) {

        await deliveryRef.set({ status: "skipped", reason: "no-selected-customers", completedAt: FieldValue.serverTimestamp() }, { merge: true });

        return;

      }

      const customers = await getBranchCustomers(branchCode, customerIds);

      const title = fillTemplate(settings.title || "New payment received", payment, branchCode);

      const body = fillTemplate(settings.message || "Payment ₹{amountPaid} received for {receiptNumber}.", payment, branchCode);

      let pushResult = previous.push || null;

      if (!pushResult || pushResult.status === "error") {

        try {

          const result = await sendBranchPush({

            customers, title, body,

            imageUrl: settings.imageUrl || "",

            clickUrl: settings.clickUrl || "",

            data: { type: "branch_payment", branchCode, paymentId, receiptNumber: payment.receiptNumber || "" },

          });

          pushResult = { status: "completed", ...result };

          await deliveryRef.set({ push: pushResult, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

        } catch (error) {

          pushResult = { status: "error", error: error.message || String(error) };

          await deliveryRef.set({ push: pushResult }, { merge: true });

          throw error;

        }

      }

      let whatsappResult = previous.whatsapp || null;

      if (settings.whatsappEnabled !== false && (!whatsappResult || whatsappResult.status === "error")) {

        try {

          const result = await sendMsg91WhatsApp({ customers, payment, authKey: MSG91_AUTHKEY.value() });

          whatsappResult = { status: "accepted", ...result };

          await deliveryRef.set({ whatsapp: whatsappResult, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

        } catch (error) {

          whatsappResult = { status: "error", error: error.message || String(error) };

          await deliveryRef.set({ whatsapp: whatsappResult, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

          throw error;

        }

      } else if (settings.whatsappEnabled === false) {

        whatsappResult = { status: "skipped", reason: "whatsapp-disabled" };

      }

      await deliveryRef.set({

        status: "completed",

        push: pushResult,

        whatsapp: whatsappResult,

        completedAt: FieldValue.serverTimestamp(),

        leaseUntilMs: FieldValue.delete(),

      }, { merge: true });

      logger.info("Branch payment notification completed", { branchCode, paymentId, push: pushResult, whatsapp: whatsappResult });

    } catch (error) {

      await deliveryRef.set({

        status: "error",

        error: error.message || String(error),

        leaseUntilMs: FieldValue.delete(),

        updatedAt: FieldValue.serverTimestamp(),

      }, { merge: true });

      logger.error("Branch payment notification failed", { branchCode, paymentId, error: error.message || String(error) });

      throw error;

    }

  }

);

exports.sendBranchPaymentOwnerTest = onCall(

  { region: REGION, secrets: [MSG91_AUTHKEY] },

  async (request) => {

    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Please sign in.");

    const branchCode = String(request.data?.branchCode || "").trim();

    if (!branchCode) throw new HttpsError("invalid-argument", "Branch code is required.");

    const settingsSnap = await db.collection("paymentOwnerNotificationSettings").doc(branchCode).get();

    if (!settingsSnap.exists) throw new HttpsError("failed-precondition", "Save branch settings first.");

    const settings = settingsSnap.data() || {};

    const saved = Array.isArray(settings.ownerCustomerIds)

      ? settings.ownerCustomerIds

      : Array.isArray(settings.ownerUids) ? settings.ownerUids : [];

    const requested = Array.isArray(request.data?.ownerUids) ? request.data.ownerUids.map(String) : [];

    const ids = requested.filter((id) => saved.includes(id));

    if (!ids.length) throw new HttpsError("failed-precondition", "No selected customer IDs are saved for this branch.");

    const customers = await getBranchCustomers(branchCode, ids);

    const sample = {

      clientName: "Test Customer", contact: "9876543210", receiptNumber: "TEST-RECEIPT",

      pickupDate: new Date(), returnDate: new Date(),

      productsSummary: [{ productCode: "424", quantity: 1 }, { productCode: "815", quantity: 1 }],

      grandTotalRent: 1700, discountOnRent: 510, finalRent: 1190,

      rentCollected: 1190, rentPending: 0,

      grandTotalDeposit: 1700, depositCollected: 1710, depositPending: 0,

      totalAmount: 2890, amountPaid: 2900, balance: 0,

      depositReturned: 1700, depositWithYou: 10,

      paymentStatus: "paid", bookingStage: "successful",

    };

    const pushResult = await sendBranchPush({

      customers,

      title: fillTemplate(request.data?.title || settings.title || "Test payment notification", sample, branchCode),

      body: fillTemplate(request.data?.message || settings.message || "Test notification for {receiptNumber}.", sample, branchCode),

      imageUrl: request.data?.imageUrl || settings.imageUrl || "",

      clickUrl: request.data?.clickUrl || settings.clickUrl || "",

      data: { type: "branch_payment_test", branchCode },

    });

    let whatsappResult = { status: "skipped", reason: "whatsapp-disabled" };

    if (settings.whatsappEnabled !== false) {

      try {

        const result = await sendMsg91WhatsApp({ customers, payment: sample, authKey: MSG91_AUTHKEY.value() });

        whatsappResult = { status: "accepted", ...result };

      } catch (error) {

        logger.error("MSG91 test notification failed", { branchCode, error: error.message || String(error) });

        whatsappResult = { status: "error", error: error.message || String(error) };

      }

    }

    return { push: pushResult, whatsapp: whatsappResult };

  }

);

// ---------- Daily ledger report helpers ----------

function reportDateInIndia(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function indiaDayBounds(dateString) {
  // India has a fixed UTC+05:30 offset and no daylight-saving time.
  const start = new Date(`${dateString}T00:00:00+05:30`);
  const end = new Date(`${dateString}T23:59:59.999+05:30`);
  return { start, end };
}

function dateValue(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateLabel(value, includeTime = false) {
  const date = dateValue(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: REPORT_TIME_ZONE,
    day: "2-digit", month: "short", year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {})
  }).format(date);
}

function money(value) {
  const n = Number(value || 0);
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function moneyValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getPaymentMode(data) {
  return String(data.mode || "unknown").trim().toLowerCase() || "unknown";
}

async function fetchDailyLedger(branchCode, dateString) {
  const { start, end } = indiaDayBounds(dateString);
  const paymentsRef = db.collection("products").doc(String(branchCode)).collection("payments");
  const ledgerRef = db.collection("products").doc(String(branchCode)).collection("ledger");

  const paymentsByCreated = await paymentsRef
    .where("createdAt", ">=", start).where("createdAt", "<=", end).get();

  let totalRent = 0;
  let totalDeposit = 0;
  paymentsByCreated.forEach(doc => {
    const data = doc.data() || {};
    if (data.bookingStage === "cancelled") return;
    totalRent += moneyValue(data.finalRent);
    totalDeposit += moneyValue(data.finalDeposit);
  });

  const ledgerSnap = await ledgerRef
    .where("createdAt", ">=", start).where("createdAt", "<=", end).get();

  const modesSet = new Set();
  const rentTotals = {};
  const depositCollectedTotals = {};
  const depositReturnedTotals = {};
  const depositNetTotals = {};
  const rows = [];

  let rentCollected = 0;
  let depositCollected = 0;
  let depositReturned = 0;

  ledgerSnap.forEach(doc => {
    const data = doc.data() || {};
    const mode = getPaymentMode(data);
    const amount = moneyValue(data.amount);
    modesSet.add(mode);

    const row = {
      id: doc.id,
      createdAt: data.createdAt,
      receiptNumber: data.receiptNumber || "",
      customerName: data.customerName || "",
      createdBy: data.createdBy || "",
      type: data.type || "",
      rent: {},
      deposit: {}
    };

    if (data.type === "rentPayment") {
      row.rent[mode] = amount;
      rentTotals[mode] = (rentTotals[mode] || 0) + amount;
      rentCollected += amount;
    }

    if (data.type === "depositPayment") {
      row.deposit[mode] = amount;
      depositCollectedTotals[mode] = (depositCollectedTotals[mode] || 0) + amount;
      depositNetTotals[mode] = (depositNetTotals[mode] || 0) + amount;
      depositCollected += amount;
    }

    if (data.type === "depositReturn") {
      row.deposit[mode] = -amount;
      depositReturnedTotals[mode] = (depositReturnedTotals[mode] || 0) - amount;
      depositNetTotals[mode] = (depositNetTotals[mode] || 0) - amount;
      depositReturned += amount;
    }

    rows.push(row);
  });

  rows.sort((a, b) => (dateValue(a.createdAt)?.getTime() || 0) - (dateValue(b.createdAt)?.getTime() || 0));
  const modes = [...modesSet].sort();

  // This intentionally mirrors FinanceSummary.jsx: pending figures use pickupDate,
  // while total sale/deposit use payments createdAt on the report date.
  const pendingSnap = await paymentsRef
    .where("pickupDate", ">=", start).where("pickupDate", "<=", end).get();

  let rentPending = 0;
  let depositPending = 0;
  pendingSnap.forEach(doc => {
    const data = doc.data() || {};
    if (data.bookingStage === "cancelled") return;
    rentPending += moneyValue(data.rentPending);
    depositPending += moneyValue(data.depositPending);
  });

  // This mirrors the existing FinanceSummary global, all-time deposit status.
  const allPaymentsSnap = await paymentsRef.get();
  let depositWithYou = 0;
  let depositRefundPending = 0;
  allPaymentsSnap.forEach(doc => {
    const data = doc.data() || {};
    if (data.bookingStage === "cancelled") return;
    const amount = moneyValue(data.depositWithYou);
    if (amount > 0) {
      depositWithYou += amount;
      if (data.bookingStage === "return") depositRefundPending += amount;
    }
  });

  return {
    dateString, rows, modes,
    totals: {
      rent: rentTotals,
      depositCollected: depositCollectedTotals,
      depositReturned: Object.fromEntries(Object.entries(depositReturnedTotals).map(([k, v]) => [k, -v])),
      depositNet: depositNetTotals
    },
    summary: {
      totalRent, totalDeposit, rentCollected, depositCollected, depositReturned,
      rentPending, depositPending, depositWithYou, depositRefundPending
    }
  };
}

function drawText(doc, text, x, y, width, options = {}) {
  doc.text(String(text ?? ""), x, y, { width, ellipsis: true, lineBreak: false, ...options });
}

function generateLedgerPdf(report, branchCode) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28, bufferPages: true });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 28;
    const right = pageWidth - 28;
    const contentWidth = right - left;
    const summary = report.summary;
    const datePretty = dateLabel(indiaDayBounds(report.dateString).start);

    // Page heading follows the Account Ledger page's restrained typography.
    doc.fillColor("#2c3e50").font("Helvetica-Bold").fontSize(20)
      .text("Account Ledger", left, 25, { width: contentWidth, align: "left" });
    doc.fillColor("#6b7280").font("Helvetica").fontSize(9)
      .text(`Daily Finance Report  |  Branch: ${branchCode}  |  ${datePretty}`, left, 51, { width: contentWidth });

    // FinanceSummary.css: 3-column grid, white cards, subtle border/shadow,
    // 12pt grey labels and 18pt amounts with the same semantic color groups.
    const cards = [
      ["Total Sale", summary.totalRent, "#059669"],
      ["Rent Collected", summary.rentCollected, "#059669"],
      ["Rent Pending", summary.rentPending, "#ef4444"],
      ["Total Deposit", summary.totalDeposit, "#7c3aed"],
      ["Deposit Collected", summary.depositCollected, "#059669"],
      ["Deposit Pending", summary.depositPending, "#ef4444"],
      ["Deposit Returned", summary.depositReturned, "#059669"],
      ["Deposit With Us", summary.depositWithYou, "#0891b2"],
      ["Deposit Refund Pending", summary.depositRefundPending, "#dc2626"]
    ];

    const gap = 12;
    const cardW = (contentWidth - gap * 2) / 3;
    const cardH = 58;
    const cardGapY = 9;
    const cardY = 76;

    cards.forEach((card, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = left + col * (cardW + gap);
      const y = cardY + row * (cardH + cardGapY);

      // Soft shadow + white card and light border from FinanceSummary.css.
      doc.save();
      doc.roundedRect(x + 1, y + 2, cardW, cardH, 8).fill("#f3f4f6");
      doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke("#ffffff", "#f0f0f0");
      doc.restore();

      doc.fillColor("#6b7280").font("Helvetica").fontSize(9)
        .text(card[0], x + 13, y + 11, { width: cardW - 26, ellipsis: true });
      doc.fillColor(card[2]).font("Helvetica-Bold").fontSize(16)
        .text(money(card[1]), x + 13, y + 29, { width: cardW - 26, ellipsis: true });
    });

    let y = cardY + 3 * (cardH + cardGapY) + 17;
    doc.fillColor("#2c3e50").font("Helvetica-Bold").fontSize(15)
      .text("Account Ledger", left, y);
    y += 23;

    const fixedWidths = [94, 105, 120, 100];
    const modeColumnsCount = report.modes.length * 2;
    const fixedTotal = fixedWidths.reduce((a, b) => a + b, 0);
    const modeWidth = modeColumnsCount
      ? (contentWidth - fixedTotal) / modeColumnsCount
      : 0;
    const columns = [
      { label: "Date", width: fixedWidths[0], kind: "date" },
      { label: "Receipt", width: fixedWidths[1], kind: "receipt" },
      { label: "Client", width: fixedWidths[2], kind: "client" },
      { label: "Created By", width: fixedWidths[3], kind: "createdBy" },
      ...report.modes.map(mode => ({ label: mode.toUpperCase(), width: modeWidth, kind: "rent", mode })),
      ...report.modes.map(mode => ({ label: mode.toUpperCase(), width: modeWidth, kind: "deposit", mode }))
    ];

    const tableX = left;
    const groupHeaderH = 22;
    const modeHeaderH = 25;
    const rowH = 25;
    const hasModes = report.modes.length > 0;

    function drawTableHeader() {
      // Two-tier table header mirrors DailyLedger.jsx:
      // Date/Receipt/Client/Created By span both rows; Rent and Deposit group headings.
      const totalHeaderH = groupHeaderH + modeHeaderH;
      doc.save();
      doc.rect(tableX, y, contentWidth, totalHeaderH).fill("#f4f6f9");
      doc.strokeColor("#e6e9ef").lineWidth(0.8);

      let x = tableX;
      for (let i = 0; i < 4; i++) {
        doc.fillColor("#2f3a45").font("Helvetica-Bold").fontSize(8)
          .text(columns[i].label, x + 4, y + 19, {
            width: columns[i].width - 8,
            height: groupHeaderH + modeHeaderH - 20,
            align: "left",
            valign: "center"
          });
        x += columns[i].width;
      }

      if (hasModes) {
        const rentW = report.modes.length * modeWidth;
        const depositW = report.modes.length * modeWidth;
        doc.fillColor("#2f3a45").font("Helvetica-Bold").fontSize(8)
          .text("Rent", x, y + 7, { width: rentW, align: "center" });
        doc.moveTo(x, y + groupHeaderH).lineTo(x + rentW, y + groupHeaderH).stroke();
        x += rentW;
        doc.fillColor("#2f3a45").font("Helvetica-Bold").fontSize(8)
          .text("Deposit", x, y + 7, { width: depositW, align: "center" });
      }

      x = tableX + fixedTotal;
      report.modes.forEach(mode => {
        doc.fillColor("#2f3a45").font("Helvetica-Bold").fontSize(7)
          .text(mode.toUpperCase(), x + 2, y + groupHeaderH + 8, { width: modeWidth - 4, align: "center", ellipsis: true });
        x += modeWidth;
      });
      report.modes.forEach(mode => {
        doc.fillColor("#2f3a45").font("Helvetica-Bold").fontSize(7)
          .text(mode.toUpperCase(), x + 2, y + groupHeaderH + 8, { width: modeWidth - 4, align: "center", ellipsis: true });
        x += modeWidth;
      });

      doc.strokeColor("#e6e9ef").lineWidth(1.2)
        .moveTo(tableX, y + totalHeaderH).lineTo(right, y + totalHeaderH).stroke();
      doc.restore();
      y += totalHeaderH;
    }

    function drawRow(values, bold = false, negativeColumns = new Set()) {
      if (y + rowH > pageHeight - 32) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
        y = 28;
        drawTableHeader();
      }

      if (bold) {
        doc.rect(tableX, y, contentWidth, rowH).fill("#f7f9fc");
        doc.strokeColor("#e2e6ee").lineWidth(1.1)
          .moveTo(tableX, y).lineTo(right, y).stroke();
      }

      let x = tableX;
      columns.forEach((col, i) => {
        const val = values[i] ?? "";
        doc.fillColor(negativeColumns.has(i) ? "#e53935" : "#2f3a45")
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(Math.max(6, Math.min(8, col.width < 42 ? 6 : 7.5)));
        doc.text(String(val), x + 4, y + 8, {
          width: Math.max(1, col.width - 8),
          height: rowH - 10,
          ellipsis: true,
          lineBreak: false,
          align: i < 4 ? "left" : "center"
        });
        x += col.width;
      });

      doc.strokeColor("#edf0f4").lineWidth(0.6)
        .moveTo(tableX, y + rowH).lineTo(right, y + rowH).stroke();
      y += rowH;
    }

    drawTableHeader();

    report.rows.forEach(row => {
      const values = [
        dateLabel(row.createdAt, true),
        row.receiptNumber,
        row.customerName,
        row.createdBy,
        ...report.modes.map(mode => row.rent[mode] ? money(row.rent[mode]) : ""),
        ...report.modes.map(mode => row.deposit[mode] ? money(row.deposit[mode]) : "")
      ];
      const negative = new Set();
      report.modes.forEach((mode, i) => {
        if (Number(row.deposit[mode] || 0) < 0) negative.add(4 + report.modes.length + i);
      });
      drawRow(values, false, negative);
    });

    const rentTotalValues = ["Rent Total", "", "", "", ...report.modes.map(mode => money(report.totals.rent[mode] || 0)), ...report.modes.map(() => "")];
    drawRow(rentTotalValues, true);

    const collectedValues = ["Deposit Collected", "", "", "", ...report.modes.map(() => ""), ...report.modes.map(mode => money(report.totals.depositCollected[mode] || 0))];
    drawRow(collectedValues, true);

    const returnedValues = ["Deposit Returned", "", "", "", ...report.modes.map(() => ""), ...report.modes.map(mode => money(-(report.totals.depositReturned[mode] || 0)))];
    drawRow(returnedValues, true, new Set(report.modes.map((_, i) => 4 + report.modes.length + i)));

    doc.end();
  });
}

async function getSelectedBranchWhatsAppRecipients(branchCode, settings) {
  const ids = Array.isArray(settings.ownerCustomerIds)
    ? settings.ownerCustomerIds
    : Array.isArray(settings.ownerUids) ? settings.ownerUids : [];
  const recipients = new Map();

  for (const customerId of [...new Set(ids.map(String))]) {
    const ref = db.collection("customers").doc(String(branchCode)).collection("users").doc(customerId);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const customer = snap.data() || {};
    if (customer.branch && String(customer.branch).trim() !== String(branchCode).trim()) continue;
    if (customer.whatsappOptIn !== true && customer.whatsappConsent !== true) continue;
    const phone = normalizePhone(customer.phone || customer.phoneNumber || customer.mobileNumber || customerId);
    if (phone) recipients.set(phone, customerId);
  }
  return [...recipients.keys()];
}

function templateText(value) {
  return String(value ?? "");
}

async function sendDailyLedgerWhatsApp({ branchCode, report, pdfUrl, filename, phones, authKey }) {
  const s = report.summary;
  const bodyValues = [
    branchCode,
    dateLabel(indiaDayBounds(report.dateString).start),
    money(s.totalRent),
    money(s.rentCollected),
    money(s.rentPending),
    money(s.totalDeposit),
    money(s.depositCollected),
    money(s.depositPending),
    money(s.depositReturned),
    money(s.depositWithYou),
    money(s.depositRefundPending)
  ];

  const components = {
    header_1: { filename, type: "document", value: pdfUrl }
  };
  bodyValues.forEach((value, index) => {
    components[`body_${index + 1}`] = { type: "text", value: templateText(value) };
  });

  const requestBody = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: DAILY_LEDGER_TEMPLATE_NAME,
        language: { code: DAILY_LEDGER_LANGUAGE_CODE, policy: "deterministic" },
        namespace: MSG91_NAMESPACE,
        to_and_components: [{ to: phones, components }]
      }
    }
  };

  const response = await fetch(MSG91_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", authkey: authKey },
    body: JSON.stringify(requestBody)
  });
  const responseText = await response.text();
  let providerResponse;
  try { providerResponse = JSON.parse(responseText); }
  catch { providerResponse = { raw: responseText }; }

  if (!response.ok) {
    throw new Error(`MSG91 HTTP ${response.status}: ${responseText.slice(0, 1200)}`);
  }
  return { accepted: phones.length, providerResponse };
}

async function processDailyLedgerForBranch(branchCode, dateString, authKey) {
  const settingsRef = db.collection("paymentOwnerNotificationSettings").doc(String(branchCode));
  const settingsSnap = await settingsRef.get();
  if (!settingsSnap.exists) return { status: "skipped", reason: "settings-not-found" };

  const settings = settingsSnap.data() || {};
  if (settings.enabled !== true) return { status: "skipped", reason: "branch-notification-settings-disabled" };
  if (settings.whatsappEnabled === false) return { status: "skipped", reason: "whatsapp-disabled" };

  const phones = await getSelectedBranchWhatsAppRecipients(branchCode, settings);
  if (!phones.length) return { status: "skipped", reason: "no-selected-opted-in-whatsapp-recipients" };

  const reportId = `${String(branchCode)}_${dateString}`;
  const reportRef = db.collection("dailyLedgerReports").doc(reportId);
  const existing = await reportRef.get();
  if (existing.exists && existing.data()?.status === "sent") {
    return { status: "skipped", reason: "already-sent", reportId };
  }

  await reportRef.set({
    branchCode: String(branchCode),
    reportDate: dateString,
    status: "processing",
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() })
  }, { merge: true });

  try {
    const report = await fetchDailyLedger(branchCode, dateString);
    const pdfBuffer = await generateLedgerPdf(report, branchCode);
    const filename = `Daily_Ledger_${branchCode}_${dateString}.pdf`;
    const storagePath = `${REPORT_BUCKET_FOLDER}/${branchCode}/${filename}`;
    const file = storage.bucket().file(storagePath);

    await file.save(pdfBuffer, {
      resumable: false,
      metadata: {
        contentType: "application/pdf",
        metadata: { branchCode: String(branchCode), reportDate: dateString }
      }
    });

    const [pdfUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    const whatsapp = await sendDailyLedgerWhatsApp({
      branchCode, report, pdfUrl, filename, phones, authKey
    });

    await reportRef.set({
      status: "sent",
      filename,
      storagePath,
      pdfUrl,
      recipientsCount: phones.length,
      summary: report.summary,
      whatsapp,
      sentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    logger.info("Daily ledger report sent", { branchCode, dateString, recipients: phones.length, storagePath });
    return { status: "sent", reportId, recipients: phones.length, storagePath };
  } catch (error) {
    await reportRef.set({
      status: "failed",
      error: error.message || String(error),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    logger.error("Daily ledger report failed", { branchCode, dateString, error: error.message || String(error) });
    throw error;
  }
}

exports.sendDailyLedgerReports = onSchedule(
  {
    schedule: "59 23 * * *",
    timeZone: REPORT_TIME_ZONE,
    region: REGION,
    timeoutSeconds: 540,
    memory: "1GiB",
    retryCount: 2,
    secrets: [MSG91_AUTHKEY]
  },
  async () => {
    const dateString = reportDateInIndia(new Date());
    const settingsSnap = await db.collection("paymentOwnerNotificationSettings").get();
    const results = [];

    for (const settingsDoc of settingsSnap.docs) {
      try {
        const result = await processDailyLedgerForBranch(settingsDoc.id, dateString, MSG91_AUTHKEY.value());
        results.push({ branchCode: settingsDoc.id, ...result });
      } catch (error) {
        results.push({ branchCode: settingsDoc.id, status: "failed", error: error.message || String(error) });
      }
    }

    logger.info("Daily ledger schedule completed", { dateString, branches: results.length, results });
    return { dateString, results };
  }
);

// Manual admin test: generates and sends today's report immediately for one branch.
exports.sendDailyLedgerReportTest = onCall(
  { region: REGION, timeoutSeconds: 540, memory: "1GiB", secrets: [MSG91_AUTHKEY] },
  async request => {
    await assertAdmin(request);
    const branchCode = String(request.data?.branchCode || "").trim();
    if (!branchCode) throw new HttpsError("invalid-argument", "Branch code is required.");
    const dateString = String(request.data?.date || reportDateInIndia(new Date()));
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateString)) {
      throw new HttpsError("invalid-argument", "Date must use YYYY-MM-DD.");
    }
    return processDailyLedgerForBranch(branchCode, dateString, MSG91_AUTHKEY.value());
  }
);
