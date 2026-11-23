const { onDocumentWritten } = require("firebase-functions/v2/firestore");

const { defineSecret } = require("firebase-functions/params");

const admin = require("firebase-admin");



// ============================================================

// CONFIGURATION

// ============================================================



const REGION = "asia-south1";

const TARGET_BRANCH = "7007";

const TIME_ZONE = "Asia/Kolkata";



const MSG91_AUTHKEY = defineSecret("MSG91_AUTHKEY");

const MSG91_INTEGRATED_NUMBER = "919096457700";



const MSG91_NAMESPACE =

  "4ffa31a1_ffeb_487b_9817_7ab865d7addf";



const BOOKING_TEMPLATE_NAME =

  "dor_rental_receipt_terms_notice";



const TERMS_PDF_FILENAME =

  "DOR_Dress_On_Rent_Terms_and_Conditions.pdf";



const MSG91_SEND_URL =

  "https\://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";



// Fixed DOR Terms & Conditions PDF.

// Attached only to the Booking-stage WhatsApp template.

const TERMS_PDF_URL =

  "https\://firebasestorage.googleapis.com/v0/b/renting-wala-27d06.appspot.com/o/dorterms%2FDOR_Dress_On_Rent_Terms_and_Conditions.pdf?alt=media&token=1e8ec3af-24f3-4bde-a581-d96b3ea7ac37";



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



// ============================================================

// COMMON HELPERS

// ============================================================



function clean(value, fallback = "") {

  if (value === null || value === undefined) return fallback;



  if (

    typeof value === "object" &&

    typeof value.toDate === "function"

  ) {

    return value.toDate();

  }



  const result = String(value).trim();

  return result || fallback;

}



function toDate(value) {

  if (!value) return null;



  if (value instanceof Date) return value;



  if (typeof value.toDate === "function") {

    return value.toDate();

  }



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

  if (value === null || value === undefined || value === "") {

    return "N/A";

  }



  if (

    value instanceof Date ||

    (value && typeof value.toDate === "function")

  ) {

    return formatDate(value);

  }



  if (Array.isArray(value)) {

    return value.map(formatValue).join(", ");

  }



  if (typeof value === "object") {

    return JSON.stringify(value);

  }



  return String(value);

}



function normalizeIndianPhone(value) {

  const digits = String(value || "").replace(/\D/g, "");



  if (digits.length === 10) return `91${digits}`;



  if (digits.length === 12 && digits.startsWith("91")) {

    return digits;

  }



  if (digits.length === 11 && digits.startsWith("0")) {

    return `91${digits.slice(1)}`;

  }



  return "";

}



// ============================================================

// PAYMENT PRODUCTS

// ============================================================



function getPaymentProducts(payment) {

  if (Array.isArray(payment.products) && payment.products.length) {

    return payment.products;

  }



  if (

    Array.isArray(payment.productsSummary) &&

    payment.productsSummary.length

  ) {

    return payment.productsSummary;

  }



  return [];

}



// ============================================================

// PRODUCT IMAGE

// ============================================================



function getProductImage(payment, productDoc) {

  const products = getPaymentProducts(payment);

  const firstProduct = products[0] || {};



  const candidates = [

    firstProduct.imageUrl,

    firstProduct.image,

    payment.productImageUrl,

    payment.productImage,

    payment.imageUrl,

    productDoc?.imageUrl,

    productDoc?.image,

    productDoc?.thumbnail,

    ...(Array.isArray(productDoc?.images)

      ? productDoc.images

      : []),

    ...(Array.isArray(productDoc?.gallery)

      ? productDoc.gallery

      : []),

  ];



  for (const value of candidates) {

    if (

      typeof value === "string" &&

      /^https?:\/\/\S+/i.test(value.trim())

    ) {

      return value.trim();

    }



    if (Array.isArray(value)) {

      const found = value.find(

        (item) =>

          typeof item === "string" &&

          /^https?:\/\/\S+/i.test(item.trim())

      );



      if (found) return found.trim();

    }

  }



  return "";

}



// ============================================================

// PAYMENT DOCUMENT -> TEMPLATE PLACEHOLDERS

// ============================================================



function buildPlaceholderValues(payment, stage, productImage) {

  const products = getPaymentProducts(payment);



  const productsText = products

    .map((item) => {

      const code = clean(

        item.productCode || item.productId || item.code,

        "N/A"

      );



      const quantity = clean(item.quantity, "N/A");



      return `${code} : ${quantity}`;

    })

    .join("\n");



  const productNames = products

    .map((item) =>

      clean(item.productName || item.name, "N/A")

    )

    .join(", ");



  const receiptNumber = clean(payment.receiptNumber, "N/A");



  return {

    clientName: clean(

      payment.clientName || payment.name,

      "Customer"

    ),



    clientEmail: clean(

      payment.clientEmail || payment.email

    ),



    CustomerBy: clean(payment.customerBy),

    ReceiptBy: clean(payment.receiptBy),



    Alterations: clean(payment.alterations),

    SpecialNote: clean(payment.specialNote),



    GrandTotalRent: clean(payment.grandTotalRent),

    DiscountOnRent: clean(payment.discountOnRent),

    FinalRent: clean(payment.finalRent),



    GrandTotalDeposit: clean(payment.grandTotalDeposit),

    DiscountOnDeposit: clean(payment.discountOnDeposit),

    FinalDeposit: clean(payment.finalDeposit),



    AmountToBePaid: clean(payment.totalAmount),

    AmountPaid: clean(payment.amountPaid),

    Balance: clean(payment.balance),

    PaymentStatus: clean(payment.paymentStatus),



    FirstPaymentDetails: clean(payment.firstPaymentDetails),

    FirstPaymentMode: clean(payment.firstPaymentMode),



    SecondPaymentMode: clean(payment.secondPaymentMode),

    SecondPaymentDetails: clean(payment.secondPaymentDetails),



    Products: productsText || "N/A",

    Products1: productNames || "N/A",



    createdAt: formatDate(payment.createdAt),



    pickupDate: formatDate(

      payment.pickupDate || products[0]?.pickupDate

    ),



    returnDate: formatDate(

      payment.returnDate || products[0]?.returnDate

    ),



    receiptNumber,

    stage,



    ContactNo: clean(payment.contact),



    IdentityProof: clean(payment.identityProof),

    IdentityNumber: clean(payment.identityNumber),



    productImage,

    previousStage: "N/A",

  };

}



// ============================================================

// TEMPLATE PLACEHOLDER REPLACEMENT

// ============================================================



function applyPlaceholders(template, values) {

  return String(template || "")

    .replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {

      return Object.prototype.hasOwnProperty.call(values, key)

        ? formatValue(values[key])

        : match;

    })

    .slice(0, 1000);

}

// ============================================================

// CUSTOMER LOOKUP

// ============================================================



async function findCustomer(branchCode, contact) {

  if (!contact) return null;



  const usersRef = admin

    .firestore()

    .collection("customers")

    .doc(branchCode)

    .collection("users");



  // First try the contact as the customer document ID.

  const direct = await usersRef.doc(String(contact)).get();



  if (direct.exists) return direct;



  // Then try common phone-number formats and fields.

  const variants = new Set([

    String(contact),

    normalizeIndianPhone(contact),

    String(contact).replace(/\D/g, ""),

  ]);



  for (const value of variants) {

    if (!value) continue;



    for (const field of [

      "mobileNumber",

      "phone",

      "mobile",

      "phoneNumber",

    ]) {

      const result = await usersRef

        .where(field, "==", value)

        .limit(1)

        .get();



      if (!result.empty) {

        return result.docs[0];

      }

    }

  }



  return null;

}



// ============================================================

// CHANNEL IDEMPOTENCY LOG

// ============================================================



async function claimChannelLog(db, logRef, payload) {

  return db.runTransaction(async (transaction) => {

    const snap = await transaction.get(logRef);



    if (snap.exists) {

      const data = snap.data() || {};



      const freshProcessing =

        data.status === "processing" &&

        data.updatedAt?.toMillis &&

        Date.now() - data.updatedAt.toMillis() <

          5 * 60 * 1000;



      if (

        ["sent", "skipped", "accepted"].includes(data.status) ||

        freshProcessing

      ) {

        return false;

      }



      transaction.set(

        logRef,

        {

          ...payload,

          status: "processing",

          updatedAt:

            admin.firestore.FieldValue.serverTimestamp(),

          attempts: Number(data.attempts || 0) + 1,

        },

        { merge: true }

      );



      return true;

    }



    transaction.create(logRef, {

      ...payload,

      status: "processing",

      attempts: 1,

      createdAt:

        admin.firestore.FieldValue.serverTimestamp(),

      updatedAt:

        admin.firestore.FieldValue.serverTimestamp(),

    });



    return true;

  });

}



// ============================================================


// ============================================================
// SAVE LATEST WHATSAPP STATUS IN PAYMENT DOCUMENT
// ============================================================

async function saveWhatsAppStatusToPayment({
  paymentRef,
  stage,
  status,
  eventId,
  details = {},
}) {
  if (!paymentRef || !stage) return;

  const stageStatus = {
    status,
    eventId: eventId || null,
    templateName: details.templateName || null,
    phone: details.phone || null,
    reason: details.reason || null,
    error: details.error || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await paymentRef.update({
    [`whatsappDeliveryStatus.${stage}`]: stageStatus,
    whatsappDeliveryUpdatedAt:
      admin.firestore.FieldValue.serverTimestamp(),
  });
}

// MSG91 COMPONENTS FOR OTHER STAGES

// ============================================================



function buildMsg91Components(mapping, values) {

  const components = {};



  for (const [componentKey, placeholderKey] of Object.entries(

    mapping || {}

  )) {

    if (!/^(body|header)_\d+$/.test(componentKey)) {

      continue;

    }



    if (

      !Object.prototype.hasOwnProperty.call(

        values,

        placeholderKey

      )

    ) {

      continue;

    }



    components[componentKey] = {

      type: "text",

      value: formatValue(values[placeholderKey]),

    };

  }



  return components;

}



// ============================================================

// BOOKING TEMPLATE: NAMED PARAMETERS + PDF HEADER

// ============================================================



function buildBookingTemplateComponents(values) {

  const parameters = {

    clientname: values.clientName,

    products1: values.Products1,

    products: values.Products,

    alterations: values.Alterations,

    finalrent: values.FinalRent,

    finaldeposit: values.FinalDeposit,

    amounttobepaid: values.AmountToBePaid,

    amountpaid: values.AmountPaid,

    balance: values.Balance,

    pickupdate: values.pickupDate,

    returndate: values.returnDate,

  };



  const components = {

    header_1: {

      filename: TERMS_PDF_FILENAME,

      type: "document",

      value: TERMS_PDF_URL,

    },

  };



  for (const [parameterName, parameterValue] of Object.entries(

    parameters

  )) {

    components[`body_${parameterName}`] = {

      type: "text",

      value: formatValue(parameterValue),

      parameter_name: parameterName,

    };

  }



  return components;

}



// ============================================================

// SEND MSG91 WHATSAPP

// ============================================================



async function sendBookingStageWhatsApp({

  phone,

  settings,

  values,

  authKey,

}) {

  const isBooking = values.stage === "Booking";



  const templateName = isBooking

    ? BOOKING_TEMPLATE_NAME

    : clean(settings.msg91TemplateName);



  const languageCode = clean(

    settings.msg91LanguageCode,

    "en"

  );



  if (!templateName) {

    throw new Error(

      "WhatsApp template is not configured for this stage."

    );

  }



  // Booking uses the exact named parameters from your MSG91 sample.

  // Other stages retain their existing variable mapping.

  const components = isBooking

    ? buildBookingTemplateComponents(values)

    : buildMsg91Components(

        settings.whatsappVariableMapping,

        values

      );



  if (!Object.keys(components).length) {

    throw new Error(

      "No WhatsApp template variables are mapped for this stage."

    );

  }



  const requestBody = {

    integrated_number: MSG91_INTEGRATED_NUMBER,

    content_type: "template",



    payload: {

      messaging_product: "whatsapp",

      type: "template",



      template: {

        name: templateName,



        language: {

          code: languageCode,

          policy: "deterministic",

        },



        ...(isBooking

          ? { namespace: MSG91_NAMESPACE }

          : {}),



        to_and_components: [

          {

            to: [phone],

            components,

          },

        ],

      },

    },

  };



  console.log("MSG91 WhatsApp request:", {

    templateName,

    stage: values.stage,

    phone,

    hasDocumentHeader: Boolean(components.header_1),

    componentNames: Object.keys(components),

  });



  const response = await fetch(MSG91_SEND_URL, {

    method: "POST",



    headers: {

      accept: "application/json",

      "content-type": "application/json",

      authkey: authKey,

    },



    body: JSON.stringify(requestBody),

  });



  const responseText = await response.text();



  let providerResponse;



  try {

    providerResponse = JSON.parse(responseText);

  } catch {

    providerResponse = {

      raw: responseText,

    };

  }



  if (!response.ok) {

    const error = new Error(

      `MSG91 HTTP ${response.status}: ${responseText.slice(0, 900)}`

    );



    error.status = response.status;

    error.providerResponse = providerResponse;



    throw error;

  }



  return providerResponse;

}

// ============================================================

// PAYMENT STAGE CHANGE TRIGGER

//

// LISTENS TO:

// products/{branchCode}/payments/{receiptNumber}

//

// PAYMENT DOCUMENT IS THE SOURCE OF TRUTH.

// ============================================================



exports.notifyCustomerOnBookingStageChange = onDocumentWritten(

  {

    document:

      "products/{branchCode}/payments/{receiptNumber}",

    region: REGION,

    retry: true,

    memory: "512MiB",

    timeoutSeconds: 120,

    secrets: [MSG91_AUTHKEY],

  },



  async (event) => {

    // --------------------------------------------------------

    // BRANCH VALIDATION

    // --------------------------------------------------------



    const branchCode = String(

      event.params.branchCode || ""

    );



    if (branchCode !== TARGET_BRANCH) {

      return;

    }



    // --------------------------------------------------------

    // GET PAYMENT DOCUMENT BEFORE AND AFTER

    // --------------------------------------------------------



    const before = event.data?.before?.exists

      ? event.data.before.data()

      : null;



    const after = event.data?.after?.exists

      ? event.data.after.data()

      : null;



    if (!after) return;



    // --------------------------------------------------------

    // DETECT STAGE CHANGE

    // --------------------------------------------------------



    const previousStage = clean(

      before?.bookingStage

    );



    const currentStage = clean(

      after.bookingStage

    );



    const isCreate = !before;



    if (isCreate && currentStage !== "Booking") {

      return;

    }



    if (

      !isCreate &&

      (!currentStage || currentStage === previousStage)

    ) {

      return;

    }



    if (!VALID_STAGES.has(currentStage)) {

      console.warn(

        "Payment stage notification skipped: invalid stage",

        {

          receiptNumber: event.params.receiptNumber,

          currentStage,

        }

      );



      return;

    }



    const db = admin.firestore();



    // --------------------------------------------------------

    // RECEIPT AND CUSTOMER CONTACT

    // --------------------------------------------------------



    const receiptNumber = clean(

      after.receiptNumber || event.params.receiptNumber

    );



    // WhatsApp and FCM use the phone number stored on the payment.
    // WhatsApp delivery does not depend on a customer profile document.
    const paymentPhone = clean(
      after.contact ||
      after.mobileNumber ||
      after.phoneNumber ||
      after.phone ||
      after.customerPhone ||
      after.customerMobile ||
      after.whatsappNumber
    );

    // Retained as the FCM customer lookup key only.
    const contact = paymentPhone;

    if (!receiptNumber) {
      console.warn(
        "Payment stage notification skipped: receipt number missing",
        {
          paymentPath: event.data.after.ref.path,
          receiptNumber,
          hasPaymentPhone: Boolean(paymentPhone),
        }
      );
      return;
    }

    const eventId = String(

      event.id ||

        `${receiptNumber}_${previousStage}_${currentStage}`

    );



    // --------------------------------------------------------

    // LOAD STAGE NOTIFICATION SETTINGS

    // --------------------------------------------------------



    const settingsRef = db

      .collection("bookingStageNotifications")

      .doc(branchCode)

      .collection("stages")

      .doc(currentStage);



    const settingsSnap = await settingsRef.get();



    if (!settingsSnap.exists) {

      console.warn(

        "Payment stage notification settings not found",

        {

          branchCode,

          currentStage,

        }

      );



      return;

    }



    const settings = settingsSnap.data() || {};



    const pushEnabled = settings.enabled === true;



    const whatsappEnabled =

      settings.whatsappEnabled === true;



    if (!pushEnabled && !whatsappEnabled) {

      console.log(

        "Both notification channels disabled for stage",

        {

          branchCode,

          currentStage,

        }

      );



      return;

    }



    // --------------------------------------------------------

    // GET PRODUCT INFORMATION

    // --------------------------------------------------------



    const products = getPaymentProducts(after);



    const firstProduct = products[0] || {};



    const productCode = clean(

      firstProduct.productCode ||

        firstProduct.productId,

      ""

    );



    let productDoc = {};



    if (productCode) {

      const productRef = db

        .collection("products")

        .doc(branchCode)

        .collection("products")

        .doc(productCode);



      const productSnap = await productRef.get();



      productDoc = productSnap.exists

        ? productSnap.data()

        : {};

    }



    // --------------------------------------------------------

    // PRODUCT IMAGE

    // --------------------------------------------------------



    let imageUrl = "";



    if (settings.imageMode === "custom") {

      imageUrl = clean(settings.fallbackImageUrl);

    } else if (settings.imageMode === "product") {

      imageUrl =

        getProductImage(after, productDoc) ||

        clean(settings.fallbackImageUrl);

    }



    // --------------------------------------------------------

    // BUILD NOTIFICATION VARIABLES

    // --------------------------------------------------------



    const values = buildPlaceholderValues(

      after,

      currentStage,

      imageUrl

    );



    values.previousStage =

      previousStage || "New booking";



    const title = applyPlaceholders(

      settings.title || "Booking update",

      values

    ).slice(0, 100);



    const body = applyPlaceholders(

      settings.message ||

        `Your booking {receiptNumber} is now {stage}.`,

      values

    ).slice(0, 1000);



    // --------------------------------------------------------

    // FIND CUSTOMER

    // --------------------------------------------------------



    // Customer records are needed only for FCM token lookup.
    // A missing customer document must not block MSG91 WhatsApp delivery.
    let customerSnap = null;
    if (contact) {
      try {
        customerSnap = await findCustomer(branchCode, contact);
      } catch (customerLookupError) {
        // FCM lookup failure is isolated; MSG91 WhatsApp still proceeds.
        console.error("Customer lookup failed for FCM; continuing WhatsApp", {
          receiptNumber,
          error: customerLookupError.message,
        });
      }
    }



    let deliveryRetryError = null;



    // ========================================================

    // FCM PUSH NOTIFICATION

    // ========================================================



    if (pushEnabled) {

      const pushLogRef = db

        .collection("bookingStageNotificationLogs")

        .doc(branchCode)

        .collection("events")

        .doc(eventId);



      const claimedPush = await claimChannelLog(

        db,

        pushLogRef,

        {

          branchCode,

          productCode,

          receiptNumber,

          previousStage: previousStage || null,

          stage: currentStage,

          eventId,

        }

      );



      if (claimedPush) {

        try {

          const token = customerSnap?.get("fcmToken");



          if (

            !customerSnap ||

            typeof token !== "string" ||

            !token.trim()

          ) {

            await pushLogRef.set(

              {

                status: "skipped",

                reason: !customerSnap

                  ? "customer_not_found"

                  : "customer_fcm_token_missing",

                contact,

                completedAt:

                  admin.firestore.FieldValue.serverTimestamp(),

              },

              { merge: true }

            );

          } else {

            const notification = {

              title,

              body,

            };



            if (imageUrl) {

              notification.imageUrl = imageUrl;

            }



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

                payload: {

                  aps: {

                    sound: "default",

                  },

                },



                ...(imageUrl

                  ? {

                      fcmOptions: {

                        imageUrl,

                      },

                    }

                  : {}),

              },

            };



            const messageId =

              await admin.messaging().send(message);



            await pushLogRef.set(

              {

                status: "sent",

                title,

                message: body,

                imageUrl: imageUrl || null,

                contact,

                messageId,

                sentAt:

                  admin.firestore.FieldValue.serverTimestamp(),

                completedAt:

                  admin.firestore.FieldValue.serverTimestamp(),

              },

              { merge: true }

            );

          }

        } catch (error) {

          await pushLogRef.set(

            {

              status: "failed",

              error: String(

                error.message || "Unknown error"

              ).slice(0, 500),

              errorCode: error.code || null,

              failedAt:

                admin.firestore.FieldValue.serverTimestamp(),

            },

            { merge: true }

          );



          console.error(

            "Payment stage FCM failed",

            {

              eventId,

              receiptNumber,

              error: error.message,

            }

          );



          deliveryRetryError = error;

        }

      }

    }

            // ========================================================
    // WHATSAPP NOTIFICATION
    // ========================================================

    if (whatsappEnabled) {
      const waLogRef = db
        .collection("bookingStageWhatsAppDeliveries")
        .doc(branchCode)
        .collection("events")
        .doc(eventId);

      const claimedWhatsApp = await claimChannelLog(
        db,
        waLogRef,
        {
          branchCode,
          productCode,
          receiptNumber,
          stage: currentStage,
          eventId,
          contact,
        }
      );

      if (claimedWhatsApp) {
        const paymentRef = event.data.after.ref;

        try {
          // Save processing immediately so the dashboard can show
          // that this stage is currently being sent.
          await saveWhatsAppStatusToPayment({
            paymentRef,
            stage: currentStage,
            status: "processing",
            eventId,
          });

          // WhatsApp is independent of the customer profile and FCM token.
          // Always use the phone number saved on the payment document.
          const phone = normalizeIndianPhone(paymentPhone);

          if (!phone) {
            const reason = "invalid_or_missing_payment_phone";

            await waLogRef.set(
              {
                status: "skipped",
                reason,
                paymentPhone: paymentPhone || null,
                completedAt:
                  admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            await saveWhatsAppStatusToPayment({
              paymentRef,
              stage: currentStage,
              status: "skipped",
              eventId,
              details: { reason },
            });
          } else {
            const templateName = currentStage === "Booking"
              ? BOOKING_TEMPLATE_NAME
              : settings.msg91TemplateName;

            const providerResponse =
              await sendBookingStageWhatsApp({
                phone,
                settings,
                values,
                authKey: MSG91_AUTHKEY.value(),
              });

            await waLogRef.set(
              {
                status: "accepted",
                phone: `+${phone}`,
                templateName,
                providerResponse,
                acceptedAt:
                  admin.firestore.FieldValue.serverTimestamp(),
                completedAt:
                  admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            await saveWhatsAppStatusToPayment({
              paymentRef,
              stage: currentStage,
              status: "accepted",
              eventId,
              details: {
                phone: `+${phone}`,
                templateName,
              },
            });
          }
        } catch (error) {
          const errorMessage = String(
            error.message || "Unknown error"
          ).slice(0, 700);

          await waLogRef.set(
            {
              status: "failed",
              error: errorMessage,
              errorCode: error.status || error.code || null,
              providerResponse: error.providerResponse || null,
              failedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Keep the payment summary in sync with the event log.
          // Do not hide the original send error if this update fails.
          try {
            await saveWhatsAppStatusToPayment({
              paymentRef,
              stage: currentStage,
              status: "failed",
              eventId,
              details: {
                templateName: currentStage === "Booking"
                  ? BOOKING_TEMPLATE_NAME
                  : settings.msg91TemplateName,
                error: errorMessage,
              },
            });
          } catch (statusError) {
            console.error(
              "Could not save WhatsApp failure status in payment document",
              {
                receiptNumber,
                stage: currentStage,
                error: statusError.message,
              }
            );
          }

          console.error(
            "Payment stage WhatsApp failed",
            {
              eventId,
              receiptNumber,
              stage: currentStage,
              error: errorMessage,
              providerResponse: error.providerResponse || null,
            }
          );

          deliveryRetryError = deliveryRetryError || error;
        }
      }
    }

// --------------------------------------------------------

    // RETRY FAILED DELIVERY

    // --------------------------------------------------------



    if (deliveryRetryError) {

      throw deliveryRetryError;

    }



    console.log(

      "Payment stage notifications processed",

      {

        branchCode,

        receiptNumber,

        previousStage,

        currentStage,

        pushEnabled,

        whatsappEnabled,

      }

    );

  }

);
