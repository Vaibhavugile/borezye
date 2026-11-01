const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { defineSecret } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");

const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { getMessaging } = require("firebase-admin/messaging");

const logger = require("firebase-functions/logger");



initializeApp();

const db = getFirestore();

const REGION = "asia-south1";

const MSG91_AUTHKEY = defineSecret("MSG91_AUTHKEY");



const MSG91_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

const MSG91_INTEGRATED_NUMBER = "918793744117";

const MSG91_NAMESPACE = "966353f8_de57_41d3_b22b_286d3ad61238";

const MSG91_TEMPLATE_NAME = "new_booking_notification";

const MSG91_LANGUAGE_CODE = "en";



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



function buildWhatsAppComponents(payment) {

  const values = [

    payment.clientName || "",                       // {{1}}

    payment.receiptNumber || "",                    // {{2}}

    dateText(payment.pickupDate),                   // {{3}}

    dateText(payment.returnDate),                   // {{4}}

    getProductCodes(payment),                       // {{5}}

    numberText(payment.grandTotalRent),             // {{6}}

    numberText(payment.discountOnRent),             // {{7}}

    numberText(payment.finalRent),                  // {{8}}

    numberText(payment.rentCollected),              // {{9}}

    numberText(payment.rentPending),                // {{10}}

    numberText(payment.grandTotalDeposit),          // {{11}}

    numberText(payment.depositCollected),           // {{12}}

    numberText(payment.depositPending),             // {{13}}

    numberText(payment.totalAmount),                // {{14}}

    numberText(payment.amountPaid),                 // {{15}}

    numberText(payment.balance),                    // {{16}}

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
