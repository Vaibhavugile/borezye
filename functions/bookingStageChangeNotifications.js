const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

const REGION = "asia-south1";
const TARGET_BRANCH = "7007";
const TIME_ZONE = "Asia/Kolkata";

const VALID_STAGES = new Set([
  "Booking",
  "pickupPending",
  "pickup",
  "returnPending",
  "return",
  "successful",
  "cancelled",
  "postponed",
]);

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  const result = String(value).trim();
  return result || fallback;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number" || typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (value instanceof Date || (value && typeof value.toDate === "function")) {
    return formatDate(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getProductImage(booking, productDoc, payment) {
  const candidates = [
    booking.productImageUrl,
    booking.productImage,
    booking.imageUrl,
    booking.image,
    booking.thumbnail,
    productDoc?.imageUrl,
    productDoc?.image,
    productDoc?.thumbnail,
    Array.isArray(productDoc?.images) ? productDoc.images[0] : null,
    Array.isArray(productDoc?.gallery) ? productDoc.gallery[0] : null,
    payment?.productImageUrl,
    payment?.productImage,
    payment?.imageUrl,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && /^https:\/\/\S+/i.test(value.trim())) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const first = value.find((item) =>
        typeof item === "string" && /^https:\/\/\S+/i.test(item.trim())
      );
      if (first) return first.trim();
    }
  }
  return "";
}

function buildPlaceholderValues(booking, payment, stage, productName, productImage) {
  const user = booking.userDetails || {};
  const receiptNumber = clean(booking.receiptNumber, "N/A");
  const productCode = clean(booking.productCode, "N/A");
  const quantity = clean(booking.quantity, "N/A");

  const products = Array.isArray(booking.products) && booking.products.length
    ? booking.products
    : [{ productCode, quantity, productName }];

  const productsText = products.map((item) =>
    `${clean(item.productCode || item.code, "N/A")} : ${clean(item.quantity, "N/A")}`
  ).join("\n");

  const productNames = products.map((item) =>
    clean(item.productName || item.name, "N/A")
  ).join(", ");

  const merged = { ...(payment || {}), ...user };

  return {
    clientName: clean(user.name || booking.clientName || payment?.name, "Customer"),
    clientEmail: clean(user.email || booking.email || payment?.email),
    CustomerBy: clean(user.customerby),
    ReceiptBy: clean(user.receiptby),
    Alterations: clean(user.alterations),
    SpecialNote: clean(user.specialnote),
    GrandTotalRent: clean(user.grandTotalRent ?? payment?.grandTotalRent),
    DiscountOnRent: clean(user.discountOnRent ?? payment?.discountOnRent),
    FinalRent: clean(user.finalrent ?? payment?.finalrent),
    GrandTotalDeposit: clean(user.grandTotalDeposit ?? payment?.grandTotalDeposit),
    DiscountOnDeposit: clean(user.discountOnDeposit ?? payment?.discountOnDeposit),
    FinalDeposit: clean(user.finaldeposite ?? payment?.finaldeposite),
    AmountToBePaid: clean(user.totalamounttobepaid ?? payment?.totalamounttobepaid),
    AmountPaid: clean(user.amountpaid ?? payment?.amountpaid),
    Balance: clean(user.balance ?? payment?.balance),
    PaymentStatus: clean(user.paymentstatus ?? payment?.paymentstatus),
    FirstPaymentDetails: clean(user.firstpaymentdtails ?? payment?.firstpaymentdtails),
    FirstPaymentMode: clean(user.firstpaymentmode ?? payment?.firstpaymentmode),
    SecondPaymentMode: clean(user.secondpaymentmode ?? payment?.secondpaymentmode),
    SecondPaymentDetails: clean(user.secondpaymentdetails ?? payment?.secondpaymentdetails),
    Products: productsText || "N/A",
    Products1: productNames || productName || "N/A",
    createdAt: formatDate(booking.createdAt || payment?.createdAt),
    pickupDate: formatDate(booking.pickupDate || payment?.pickupDate),
    returnDate: formatDate(booking.returnDate || payment?.returnDate),
    receiptNumber,
    stage,
    ContactNo: clean(user.contact || payment?.contact),
    IdentityProof: clean(user.identityproof),
    IdentityNumber: clean(user.identitynumber),
    productImage,
    previousStage: "N/A",
  };
}

function applyPlaceholders(template, values) {
  return String(template || "").replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return match;
    return formatValue(values[key]);
  }).slice(0, 1000);
}

async function findCustomer(branchCode, contact) {
  if (!contact) return null;

  const usersRef = admin.firestore()
    .collection("customers").doc(branchCode).collection("users");

  const direct = await usersRef.doc(String(contact)).get();
  if (direct.exists) return direct;

  for (const field of ["mobileNumber", "phone", "mobile"]) {
    const result = await usersRef.where(field, "==", String(contact)).limit(1).get();
    if (!result.empty) return result.docs[0];
  }
  return null;
}

async function claimEventLog(db, logRef, payload) {
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(logRef);
    if (existing.exists) return false;
    transaction.create(logRef, {
      ...payload,
      status: "sending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });
}

exports.notifyCustomerOnBookingStageChange = onDocumentWritten(
  {
    document: "products/{branchCode}/products/{productCode}/bookings/{bookingId}",
    region: REGION,
    retry: true,
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const branchCode = String(event.params.branchCode || "");
    if (branchCode !== TARGET_BRANCH) return;

    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    // Ignore deletions.
    if (!after) return;

    const previousStage = clean(before?.userDetails?.stage);
    const currentStage = clean(after.userDetails?.stage);

    // On document creation, only the initial Booking stage is a notification event.
    const isCreate = !before;
    if (isCreate && currentStage !== "Booking") return;

    // On updates, send only when the stage value itself changes.
    if (!isCreate && (!currentStage || currentStage === previousStage)) return;
    if (!VALID_STAGES.has(currentStage)) {
      console.log("Ignoring unsupported booking stage:", currentStage, event.params.bookingId);
      return;
    }

    const db = admin.firestore();
    const bookingRef = event.data.after.ref;
    const userDetails = after.userDetails || {};
    const receiptNumber = clean(after.receiptNumber);
    const contact = clean(userDetails.contact || after.contact);

    if (!receiptNumber || !contact) {
      console.warn("Stage notification skipped: receipt/contact missing.", {
        bookingPath: bookingRef.path,
        receiptNumber,
        contact,
      });
      return;
    }

    const eventId = String(event.id || `${event.params.bookingId}_${currentStage}`);
    const logRef = db.collection("bookingStageNotificationLogs")
      .doc(branchCode)
      .collection("events")
      .doc(eventId);

    const claimed = await claimEventLog(db, logRef, {
      branchCode,
      productCode: String(event.params.productCode || ""),
      bookingId: String(event.params.bookingId || ""),
      receiptNumber,
      previousStage: previousStage || null,
      stage: currentStage,
      eventId,
    });

    if (!claimed) {
      console.log("Stage notification already claimed; skipping:", eventId);
      return;
    }

    try {
      const settingsRef = db.collection("bookingStageNotifications")
        .doc(branchCode).collection("stages").doc(currentStage);
      const settingsSnap = await settingsRef.get();

      if (!settingsSnap.exists || settingsSnap.get("enabled") !== true) {
        await logRef.update({
          status: "skipped",
          reason: !settingsSnap.exists ? "stage_settings_missing" : "stage_notifications_disabled",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const settings = settingsSnap.data() || {};
      const paymentRef = db.collection("products").doc(branchCode)
        .collection("payments").doc(receiptNumber);
      const paymentSnap = await paymentRef.get();
      const payment = paymentSnap.exists ? paymentSnap.data() : {};

      const productCode = String(event.params.productCode || "");
      const productRef = db.collection("products").doc(branchCode)
        .collection("products").doc(productCode);
      const productSnap = await productRef.get();
      const productDoc = productSnap.exists ? productSnap.data() : {};
      const productName = clean(after.productName || productDoc.productName || productDoc.name, "N/A");

      let imageUrl = "";
      if (settings.imageMode === "custom") {
        imageUrl = clean(settings.fallbackImageUrl);
      } else if (settings.imageMode === "product") {
        imageUrl = getProductImage(after, productDoc, payment);
        if (!imageUrl) imageUrl = clean(settings.fallbackImageUrl);
      }

      const values = buildPlaceholderValues(after, payment, currentStage, productName, imageUrl);
      values.previousStage = previousStage || "New booking";
      const title = applyPlaceholders(settings.title || "Booking update", values).slice(0, 100);
      const body = applyPlaceholders(settings.message || `Your booking {receiptNumber} is now {stage}.`, values).slice(0, 1000);

      const customerSnap = await findCustomer(branchCode, contact);
      const token = customerSnap?.get("fcmToken");

      if (!customerSnap || typeof token !== "string" || !token.trim()) {
        await logRef.update({
          status: "skipped",
          reason: !customerSnap ? "customer_not_found" : "customer_fcm_token_missing",
          contact,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const notification = { title, body };
      if (imageUrl) notification.imageUrl = imageUrl;

      const message = {
        token: token.trim(),
        notification,
        data: {
          type: "booking_stage_change",
          branchCode,
          receiptNumber,
          bookingStage: currentStage,
          previousStage: previousStage || "",
          productCode,
          bookingId: String(event.params.bookingId || ""),
        },
        android: {
          priority: "high",
          notification: {
            channelId: "booking_notifications",
            sound: "default",
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          payload: { aps: { sound: "default" } },
          ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
        },
      };

      const messageId = await admin.messaging().send(message);
      await logRef.update({
        status: "sent",
        title,
        message: body,
        imageUrl: imageUrl || null,
        contact,
        messageId,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Booking stage notification sent:", {
        branchCode,
        receiptNumber,
        previousStage,
        currentStage,
        messageId,
      });
    } catch (error) {
      console.error("Booking stage notification failed:", {
        eventId,
        bookingPath: bookingRef.path,
        error: error.message,
        code: error.code,
      });
      await logRef.update({
        status: "failed",
        error: String(error.message || "Unknown error").slice(0, 500),
        errorCode: error.code || null,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw error;
    }
  }
);
