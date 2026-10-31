const { onSchedule } = require("firebase-functions/v2/scheduler");

const { onCall, HttpsError } = require("firebase-functions/v2/https");

const admin = require("firebase-admin");



admin.initializeApp();



const db = admin.firestore();



// =====================================================

// 1. EXISTING FUNCTION: UPDATE BOOKING STAGES DAILY

// =====================================================



exports.updateBookingStages = onSchedule(

  {

    schedule: "0 2 * * *",

    timeZone: "Asia/Kolkata",

  },

  async () => {

    const today = new Date();



    const todayIST = new Date(

      today.toLocaleString("en-US", {

        timeZone: "Asia/Kolkata",

      })

    );



    const todayDate = todayIST.toISOString().split("T")[0];



    console.log("Stage update started for IST date:", todayDate);



    const snapshot = await db.collectionGroup("bookings").get();



    let batch = db.batch();

    let operationCount = 0;

    let updatedCount = 0;



    // Keep batches below Firestore's 500-write limit.

    const commitBatch = async () => {

      if (operationCount > 0) {

        await batch.commit();

        batch = db.batch();

        operationCount = 0;

      }

    };



    for (const docSnap of snapshot.docs) {

      const data = docSnap.data();



      const pickupDate = data.pickupDate?.toDate?.();

      const returnDate = data.returnDate?.toDate?.();

      const stage = data.userDetails?.stage;



      const branchCode = data.branchCode;

      const receiptNumber = data.receiptNumber;



      if (!pickupDate || !returnDate) continue;

      if (!branchCode || !receiptNumber) continue;



      const pickupDateIST = new Date(

        pickupDate.toLocaleString("en-US", {

          timeZone: "Asia/Kolkata",

        })

      )

        .toISOString()

        .split("T")[0];



      const returnDateIST = new Date(

        returnDate.toLocaleString("en-US", {

          timeZone: "Asia/Kolkata",

        })

      )

        .toISOString()

        .split("T")[0];



      let nextStage = null;



      if (pickupDateIST === todayDate && stage === "Booking") {

        nextStage = "pickupPending";

      } else if (returnDateIST === todayDate && stage === "pickup") {

        nextStage = "returnPending";

      }



      if (!nextStage) continue;



      const paymentRef = db.doc(

        `products/${branchCode}/payments/${receiptNumber}`

      );



      // Two writes are needed for each stage transition.

      if (operationCount + 2 > 450) {

        await commitBatch();

      }



      batch.update(docSnap.ref, {

        "userDetails.stage": nextStage,

      });



      batch.update(paymentRef, {

        bookingStage: nextStage,

      });



      operationCount += 2;

      updatedCount++;



      console.log(`Updated ${nextStage}:`, docSnap.id);

    }



    await commitBatch();



    console.log(

      "Daily booking stage update completed. Total bookings updated:",

      updatedCount

    );

  }

);



// =====================================================

// 2. HELPER: GET THE SENDER'S DISPLAY NAME

// =====================================================



async function getSenderName(authContext) {

  const claims = authContext.token || {};



  // Prefer a name supplied by Firebase Authentication.

  if (typeof claims.name === "string" && claims.name.trim()) {

    return claims.name.trim();

  }



  if (typeof claims.email === "string" && claims.email.trim()) {

    return claims.email.trim();

  }



  // Phone-authenticated users may not have a display name.

  try {

    const userRecord = await admin.auth().getUser(authContext.uid);



    if (userRecord.displayName?.trim()) {

      return userRecord.displayName.trim();

    }



    if (userRecord.email?.trim()) {

      return userRecord.email.trim();

    }



    if (userRecord.phoneNumber?.trim()) {

      return userRecord.phoneNumber.trim();

    }

  } catch (error) {

    console.error("Could not retrieve sender profile:", error.message);

  }



  return "Unknown user";

}



// =====================================================

// 3. NEW FUNCTION: SEND BRANCH-WISE NOTIFICATIONS

// =====================================================



exports.sendBranchNotification = onCall(

  {

    region: "asia-south1",

  },

  async (request) => {

    // Require a valid Firebase Authentication session.

    if (!request.auth) {

      throw new HttpsError(

        "unauthenticated",

        "Please sign in before sending a notification."

      );

    }



    // DEVELOPMENT ACCESS ONLY:

    // Any authenticated user can currently reach this sender.

    // Add admin/branch authorization before production use.



    const senderUid = request.auth.uid;

    const senderName = await getSenderName(request.auth);



    const {

      branch,

      title,

      message,

      imageUrl,

      deepLink,

    } = request.data || {};



    // Validate branch ID.

    if (

      typeof branch !== "string" ||

      !/^[a-zA-Z0-9_-]{1,64}$/.test(branch)

    ) {

      throw new HttpsError(

        "invalid-argument",

        "A valid branch ID is required."

      );

    }



    // Validate title.

    if (

      typeof title !== "string" ||

      !title.trim() ||

      title.trim().length > 60

    ) {

      throw new HttpsError(

        "invalid-argument",

        "Title is required and must be at most 60 characters."

      );

    }



    // Validate message.

    if (

      typeof message !== "string" ||

      !message.trim() ||

      message.trim().length > 180

    ) {

      throw new HttpsError(

        "invalid-argument",

        "Message is required and must be at most 180 characters."

      );

    }



    // Validate optional image URL.

    if (imageUrl !== undefined && imageUrl !== null && imageUrl !== "") {

      let parsedImageUrl;



      try {

        parsedImageUrl = new URL(imageUrl);

      } catch {

        throw new HttpsError(

          "invalid-argument",

          "The image URL is invalid."

        );

      }



      if (

        typeof imageUrl !== "string" ||

        parsedImageUrl.protocol !== "https:"

      ) {

        throw new HttpsError(

          "invalid-argument",

          "The image URL must use HTTPS."

        );

      }

    }



    // Validate optional deep link.

    if (

      deepLink !== undefined &&

      deepLink !== null &&

      (typeof deepLink !== "string" || deepLink.length > 500)

    ) {

      throw new HttpsError(

        "invalid-argument",

        "The destination must be a string of at most 500 characters."

      );

    }



    const cleanTitle = title.trim();

    const cleanMessage = message.trim();

    const cleanImageUrl =

      typeof imageUrl === "string" && imageUrl.trim()

        ? imageUrl.trim()

        : null;

    const cleanDeepLink =

      typeof deepLink === "string" && deepLink.trim()

        ? deepLink.trim()

        : null;



    // Read ONLY the selected branch's customer documents.

    const usersRef = db

      .collection("customers")

      .doc(branch)

      .collection("users");



    const usersSnapshot = await usersRef.get();



    // Deduplicate tokens so the same device is not sent twice

    // if the same token appears in multiple customer records.

    const tokenToUserRef = new Map();



    for (const userDoc of usersSnapshot.docs) {

      const token = userDoc.get("fcmToken");



      if (typeof token === "string" && token.trim()) {

        if (!tokenToUserRef.has(token.trim())) {

          tokenToUserRef.set(token.trim(), userDoc.ref);

        }

      }

    }



    const tokens = [...tokenToUserRef.keys()];



    // Create a campaign record before sending.

    const campaignRef = db

      .collection("notificationCampaigns")

      .doc();



    await campaignRef.set({

      branch,

      title: cleanTitle,

      message: cleanMessage,

      imageUrl: cleanImageUrl,

      deepLink: cleanDeepLink,



      createdBy: senderUid,

      createdByName: senderName,



      status: tokens.length > 0 ? "sending" : "completed",

      recipientCount: tokens.length,

      successCount: 0,

      failureCount: 0,



      createdAt: admin.firestore.FieldValue.serverTimestamp(),

    });



    let successCount = 0;

    let failureCount = 0;

    const invalidTokens = [];



    try {

      // Firebase Admin SDK supports up to 500 tokens per multicast.

      for (let i = 0; i < tokens.length; i += 500) {

        const tokenChunk = tokens.slice(i, i + 500);



        const payload = {

          tokens: tokenChunk,



          notification: {

            title: cleanTitle,

            body: cleanMessage,

            ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),

          },



          data: {

            branch,

            campaignId: campaignRef.id,

            deepLink: cleanDeepLink || "",

          },



          android: {

            priority: "high",

          },



          apns: {

            payload: {

              aps: {

                sound: "default",

              },

            },

          },

        };



        const result = await admin

          .messaging()

          .sendEachForMulticast(payload);



        successCount += result.successCount;

        failureCount += result.failureCount;



        result.responses.forEach((response, index) => {

          if (response.success) return;



          const code = response.error?.code;

          const token = tokenChunk[index];



          console.error(

            "FCM send failed:",

            code,

            "Campaign:",

            campaignRef.id

          );



          if (

            code === "messaging/invalid-registration-token" ||

            code === "messaging/registration-token-not-registered"

          ) {

            const userRef = tokenToUserRef.get(token);



            if (userRef) {

              invalidTokens.push({

                token,

                userRef,

              });

            }

          }

        });

      }



      // Remove a stale token only if it still matches the failed token.

      // A newer token saved after this send must not be deleted.

      for (const item of invalidTokens) {

        await db.runTransaction(async (transaction) => {

          const freshDoc = await transaction.get(item.userRef);



          if (

            freshDoc.exists &&

            freshDoc.get("fcmToken") === item.token

          ) {

            transaction.update(item.userRef, {

              fcmToken: admin.firestore.FieldValue.delete(),

            });

          }

        });

      }



      const status =

        tokens.length === 0

          ? "completed"

          : successCount === 0

            ? "failed"

            : failureCount > 0

              ? "partial"

              : "sent";



      await campaignRef.update({

        status,

        recipientCount: tokens.length,

        successCount,

        failureCount,

        completedAt: admin.firestore.FieldValue.serverTimestamp(),

      });



      console.log("Notification campaign completed:", {

        campaignId: campaignRef.id,

        branch,

        senderUid,

        senderName,

        recipientCount: tokens.length,

        successCount,

        failureCount,

        status,

      });



      return {

        campaignId: campaignRef.id,

        branch,

        createdBy: senderUid,

        createdByName: senderName,

        recipientCount: tokens.length,

        successCount,

        failureCount,

        status,

      };

    } catch (error) {

      console.error(

        "Notification campaign failed:",

        campaignRef.id,

        error

      );



      await campaignRef.update({

        status: "failed",

        successCount,

        failureCount,

        errorMessage: String(error.message || "Unknown error").slice(0, 500),

        completedAt: admin.firestore.FieldValue.serverTimestamp(),

      });



      throw new HttpsError(

        "internal",

        "The notification campaign failed. Check the Cloud Functions logs."

      );

    }

  }

);





// =====================================================

// 4. BOOKING REMINDERS: 11 AM AND 2 PM IST

//    One reminder per receipt + stage + time slot.

// =====================================================



function asReminderImageUrl(value) {

  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {

    const first = value.find((item) => typeof item === "string" && item.trim());

    return first ? first.trim() : "";

  }

  return "";

}



function replaceReminderPlaceholders(template, values) {

  return String(template || "").replace(

    /**\\{**(receiptNumber|clientName|productName|pickupDate|returnDate)**\\}**/g,

    (_, key) => String(values[key] ?? "")

  );

}



function reminderDateLabel(value) {

  if (!value) return "";

  const date = value.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {

    day: "2-digit",

    month: "short",

    year: "numeric",

    timeZone: "Asia/Kolkata",

  }).format(date);

}



function getBookingProductId(bookingRef, booking) {

  // Expected path: products/{branch}/products/{productId}/bookings/{bookingId}

  const parts = bookingRef.path.split("/");

  if (

    parts.length >= 6 &&

    parts[0] === "products" &&

    parts[2] === "products" &&

    parts[4] === "bookings"

  ) {

    return parts[3];

  }

  return String(booking.productId || "").trim();

}



async function findBookingCustomer(branchCode, phone) {

  const cleanPhone = String(phone || "").trim();

  if (!cleanPhone) return null;



  const usersRef = db.collection("customers").doc(branchCode).collection("users");

  const direct = await usersRef.doc(cleanPhone).get();

  if (direct.exists && typeof direct.get("fcmToken") === "string" && direct.get("fcmToken").trim()) {

    return direct;

  }



  for (const field of ["mobileNumber", "phone", "mobile"]) {

    try {

      const result = await usersRef.where(field, "==", cleanPhone).limit(10).get();

      const match = result.docs.find((item) => {

        const token = item.get("fcmToken");

        return typeof token === "string" && token.trim();

      });

      if (match) return match;

    } catch (error) {

      console.warn("Customer phone lookup skipped:", field, error.message);

    }

  }

  return null;

}



async function processBookingStageReminders({ branchCodeFilter = null, forceRun = false } = {}) {

    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-CA", {

      timeZone: "Asia/Kolkata",

      year: "numeric",

      month: "2-digit",

      day: "2-digit",

      hour: "2-digit",

      minute: "2-digit",

      hourCycle: "h23",

    }).formatToParts(now);

    const part = (type) => parts.find((item) => item.type === type)?.value || "";

    const dateKey = `${part("year")}-${part("month")}-${part("day")}`;

    // Choose the nearest scheduled slot. This avoids treating a delayed 11 AM

    // invocation as the 2 PM slot merely because it started after 1 PM.

    const minutesNow = Number(part("hour")) * 60 + Number(part("minute"));

    const slot = Math.abs(minutesNow - 660) <= Math.abs(minutesNow - 840) ? "11" : "14";



    console.log("Booking reminder run started:", { dateKey, slot });



    const grouped = new Map();

    for (const stage of ["pickupPending", "returnPending"]) {

      let bookingQuery = db.collectionGroup("bookings")

        .where("userDetails.stage", "==", stage);

      if (branchCodeFilter) {

        bookingQuery = bookingQuery.where("branchCode", "==", branchCodeFilter);

      }

      const snapshot = await bookingQuery.get();



      for (const bookingDoc of snapshot.docs) {

        const booking = bookingDoc.data();

        const branchCode = String(booking.branchCode || "").trim();

        const receiptNumber = String(booking.receiptNumber || "").trim();

        const contact = String(booking.userDetails?.contact || "").trim();

        if (!branchCode || !receiptNumber || !contact) {

          console.warn("Skipping reminder: missing branch, receipt or customer contact.", bookingDoc.ref.path);

          continue;

        }



        const productId = getBookingProductId(bookingDoc.ref, booking);

        const groupKey = `${branchCode}__${receiptNumber}__${stage}`;

        if (!grouped.has(groupKey)) {

          grouped.set(groupKey, {

            branchCode,

            receiptNumber,

            stage,

            contact,

            clientName: String(booking.userDetails?.name || "").trim(),

            pickupDate: booking.pickupDate || null,

            returnDate: booking.returnDate || null,

            productIds: new Set(),

            productSnapshots: [],

          });

        }

        const item = grouped.get(groupKey);

        if (productId) item.productIds.add(productId);

        if (booking.productSnapshot) item.productSnapshots.push(booking.productSnapshot);

        if (!item.clientName && booking.userDetails?.name) item.clientName = String(booking.userDetails.name);

        if (!item.pickupDate && booking.pickupDate) item.pickupDate = booking.pickupDate;

        if (!item.returnDate && booking.returnDate) item.returnDate = booking.returnDate;

      }

    }



    // Per-invocation caches: each branch settings doc, product doc and

    // branch+phone customer lookup is read at most once during this run.

    const settingsCache = new Map();

    const productCache = new Map();

    const customerCache = new Map();



    const getCached = async (cache, key, loader) => {

      if (!cache.has(key)) cache.set(key, loader());

      return cache.get(key);

    };



    const getProduct = (branchCode, productId) => getCached(

      productCache,

      `${branchCode}__${productId}`,

      async () => {

        const snap = await db.doc(`products/${branchCode}/products/${productId}`).get();

        return snap.exists ? (snap.data() || {}) : null;

      }

    );



    let sentCount = 0;

    let skippedCount = 0;

    let failedCount = 0;

    const skipReasons = {};

    const failureReasons = {};

    const customerTokenStatus = new Map();

    const countSkip = (reason) => {

      skippedCount++;

      skipReasons[reason] = (skipReasons[reason] || 0) + 1;

    };

    const countFailure = (reason) => {

      failedCount++;

      failureReasons[reason] = (failureReasons[reason] || 0) + 1;

    };



    for (const item of grouped.values()) {

      const { branchCode, receiptNumber, stage } = item;

      const paymentRef = db.doc(`products/${branchCode}/payments/${receiptNumber}`);

      const reminderId = `${dateKey}_${slot}_${stage}`;

      const reminderRef = paymentRef.collection("bookingReminderLogs").doc(reminderId);



      // Preflight each unique branch+phone once so the report includes FCM

      // coverage even when a receipt is already claimed or settings are disabled.

      const customerKey = `${branchCode}__${item.contact}`;

      const customerDoc = await getCached(

        customerCache,

        customerKey,

        () => findBookingCustomer(branchCode, item.contact)

      );

      const customerToken = customerDoc?.get("fcmToken");

      const hasCustomerToken = typeof customerToken === "string" && customerToken.trim().length > 0;

      if (!customerTokenStatus.has(customerKey)) {

        customerTokenStatus.set(customerKey, {

          branchCode,

          customerDocId: customerDoc?.id || null,

          hasCustomerDocument: Boolean(customerDoc),

          hasFcmToken: hasCustomerToken,

        });

      }



      // Transactional claim prevents overlapping invocations from double-sending.

      // A stale sending lock older than 15 minutes can be safely reclaimed.

      let claimed = false;

      let claimSkipReason = "";

      await db.runTransaction(async (transaction) => {

        const existing = await transaction.get(reminderRef);

        if (existing.exists) {

          const status = existing.get("status");

          // Intentionally do not skip a previously sent reminder.

          // Every scheduled/manual invocation may send again; the active

          // "sending" lock below still prevents concurrent duplicate claims.

          if (status === "sending") {

            const startedAt = existing.get("startedAt");

            const ageMs = startedAt?.toMillis ? Date.now() - startedAt.toMillis() : 0;

            if (ageMs < 15 * 60 * 1000) {

              claimSkipReason = "another_execution_currently_sending";

              return;

            }

          }

        }

        transaction.set(reminderRef, {

          branchCode,

          receiptNumber,

          stage,

          slot,

          dateKey,

          status: "sending",

          forceRun: Boolean(forceRun),

          ...(forceRun ? { forceRunAt: admin.firestore.FieldValue.serverTimestamp() } : {}),

          startedAt: admin.firestore.FieldValue.serverTimestamp(),

        }, { merge: true });

        claimed = true;

      });



      if (!claimed) {

        countSkip(claimSkipReason || "reminder_claim_not_acquired");

        console.log("Booking reminder skipped:", {

          branchCode, receiptNumber, stage,

          reason: claimSkipReason || "reminder_claim_not_acquired",

        });

        continue;

      }



      try {

        const saved = await getCached(

          settingsCache,

          branchCode,

          async () => {

            const snap = await db.collection("bookingNotificationSettings").doc(branchCode).get();

            return snap.exists ? (snap.data() || {}) : {};

          }

        );

        const stageConfig = saved?.[stage] || {};

        if (stageConfig.enabled === false) {

          await reminderRef.set({

            status: "skipped",

            reason: "Reminder disabled in branch settings",

            completedAt: admin.firestore.FieldValue.serverTimestamp(),

          }, { merge: true });

          countSkip("disabled_in_branch_settings");

          console.log("Booking reminder skipped:", { branchCode, receiptNumber, stage, reason: "disabled_in_branch_settings" });

          continue;

        }



        let productName = "";

        let productImageUrl = "";

        for (const productId of item.productIds) {

          try {

            const product = await getProduct(branchCode, productId);

            if (!product) continue;

            if (!productName) productName = String(product.productName || product.name || "");

            productImageUrl = asReminderImageUrl(product.imageUrls || product.imageUrl || product.imageURL);

            if (productImageUrl) break;

          } catch (error) {

            console.warn("Could not load booking product:", productId, error.message);

          }

        }

        if (!productImageUrl || !productName) {

          for (const snapshot of item.productSnapshots) {

            if (!productName) productName = String(snapshot.productName || snapshot.name || "");

            if (!productImageUrl) productImageUrl = asReminderImageUrl(snapshot.imageUrls || snapshot.imageUrl || snapshot.imageURL);

            if (productImageUrl && productName) break;

          }

        }



        const imageMode = stageConfig.imageMode || "product";

        const imageUrl = imageMode === "none"

          ? ""

          : imageMode === "custom"

            ? String(stageConfig.fallbackImageUrl || "").trim()

            : productImageUrl || String(stageConfig.fallbackImageUrl || "").trim();



        const values = {

          receiptNumber,

          clientName: item.clientName,

          productName,

          pickupDate: reminderDateLabel(item.pickupDate),

          returnDate: reminderDateLabel(item.returnDate),

        };

        const defaultTitle = stage === "pickupPending" ? "Pickup reminder" : "Return reminder";

        const defaultMessage = stage === "pickupPending"

          ? "Your booking {receiptNumber} is awaiting pickup. Please complete the pickup process."

          : "Your booking {receiptNumber} is awaiting return. Please complete the return process.";

        const title = replaceReminderPlaceholders(stageConfig.title || defaultTitle, values).trim().slice(0, 60);

        const body = replaceReminderPlaceholders(stageConfig.message || defaultMessage, values).trim().slice(0, 180);



        if (!customerDoc || !hasCustomerToken) {

          const reason = !customerDoc ? "customer_document_not_found" : "fcm_token_missing_or_empty";

          await reminderRef.set({

            status: "skipped",

            reason: reason === "customer_document_not_found" ? "Customer document not found" : "Customer FCM token missing or empty",

            completedAt: admin.firestore.FieldValue.serverTimestamp(),

          }, { merge: true });

          countSkip(reason);

          console.log("Booking reminder skipped:", {

            branchCode, receiptNumber, stage, customerPhone: item.contact,

            customerFound: Boolean(customerDoc), hasFcmToken: false, reason,

          });

          continue;

        }



        const cleanToken = customerToken.trim();

        const payload = {

          token: cleanToken,

          notification: {

            title,

            body,

            ...(imageUrl ? { imageUrl } : {}),

          },

          data: {

            type: "booking_reminder",

            branch: branchCode,

            receiptNumber,

            stage,

            slot,

            dateKey,

            deepLink: "",

          },

          android: {

            priority: "high",

            notification: {

              ...(imageUrl ? { imageUrl } : {}),

              channelId: "booking_reminders",

              sound: "default",

            },

          },

          apns: {

            payload: { aps: { sound: "default" } },

            ...(imageUrl ? { fcmOptions: { image: imageUrl } } : {}),

          },

        };



        try {

          const messageId = await admin.messaging().send(payload);

          await reminderRef.set({

            status: "sent",

            messageId,

            customerDocId: customerDoc.id,

            imageUrl: imageUrl || null,

            title,

            message: body,

            completedAt: admin.firestore.FieldValue.serverTimestamp(),

          }, { merge: true });

          sentCount++;

        } catch (sendError) {

          const code = sendError?.code || "";

          if ([

            "messaging/invalid-registration-token",

            "messaging/registration-token-not-registered",

          ].includes(code)) {

            await db.runTransaction(async (transaction) => {

              const fresh = await transaction.get(customerDoc.ref);

              if (fresh.exists && fresh.get("fcmToken") === cleanToken) {

                transaction.update(customerDoc.ref, {

                  fcmToken: admin.firestore.FieldValue.delete(),

                });

              }

            });

          }

          throw sendError;

        }

      } catch (error) {

        console.error("Booking reminder failed:", {

          branchCode,

          receiptNumber,

          stage,

          error: error.message,

          code: error.code || null,

        });

        await reminderRef.set({

          status: "failed",

          errorMessage: String(error.message || "Unknown error").slice(0, 400),

          completedAt: admin.firestore.FieldValue.serverTimestamp(),

        }, { merge: true });

        countFailure(error?.code || error?.name || "unknown_error");

      }

    }



    const tokenCustomers = [...customerTokenStatus.values()];

    const customersWithFcmToken = tokenCustomers.filter((customer) => customer.hasFcmToken).length;

    const customersWithoutFcmToken = tokenCustomers.filter((customer) => !customer.hasFcmToken && customer.hasCustomerDocument).length;

    const customerDocumentsNotFound = tokenCustomers.filter((customer) => !customer.hasCustomerDocument).length;

    console.log("BOOKING REMINDER DELIVERY REPORT:", {

      dateKey,

      slot,

      totalReceipts: grouped.size,

      uniqueCustomersChecked: tokenCustomers.length,

      customersWithFcmToken,

      customersWithoutFcmToken,

      customerDocumentsNotFound,

      sentCount,

      skippedCount,

      skipReasons,

      failedCount,

      failureReasons,

      settingsDocumentsRead: settingsCache.size,

      productDocumentsRead: productCache.size,

      customerLookups: customerCache.size,

    });



    return {

      dateKey,

      slot,

      totalReceipts: grouped.size,

      sentCount,

      skippedCount,

      skipReasons,

      failedCount,

      failureReasons,

      uniqueCustomersChecked: tokenCustomers.length,

      customersWithFcmToken,

      customersWithoutFcmToken,

      customerDocumentsNotFound,

      settingsDocumentsRead: settingsCache.size,

      productDocumentsRead: productCache.size,

      customerLookups: customerCache.size,

    };

}



// Scheduled production run: all branches, normal duplicate protection.

exports.sendBookingStageReminders = onSchedule(

  {

    schedule: "0 11,14 * * *",

    timeZone: "Asia/Kolkata",

    timeoutSeconds: 540,

    memory: "512MiB",

  },

  async () => processBookingStageReminders()

);



// Manual diagnostic run: authenticated caller, branch 7007 only, force bypasses

// the already-sent check but still respects settings, customer lookup and FCM token checks.

exports.runBookingStageRemindersManual = onCall(

  { timeoutSeconds: 540, memory: "512MiB" },

  async (request) => {

    if (!request.auth) {

      throw new HttpsError("unauthenticated", "Sign-in is required to run booking reminders manually.");

    }

    const branchCode = String(request.data?.branchCode || "").trim();

    const forceRun = request.data?.forceRun === true;

    if (branchCode !== "7007") {

      throw new HttpsError("invalid-argument", "Manual test is currently restricted to branch 7007.");

    }

    if (!forceRun) {

      throw new HttpsError("invalid-argument", "Set forceRun: true to bypass the already-sent check.");

    }

    console.log("Manual booking reminder run requested:", {

      branchCode, forceRun, requestedBy: request.auth.uid,

    });

    return processBookingStageReminders({ branchCodeFilter: branchCode, forceRun: true });

  }

);

// =====================================================
// 5. CUSTOMER NOTIFICATION WHEN BOOKING STAGE CHANGES
// =====================================================
// Implementation is in functions/bookingStageChangeNotifications.js.
// Keep Firebase Admin initialization in this index.js only.
const {
  notifyCustomerOnBookingStageChange,
} = require("./bookingStageChangeNotifications");

exports.notifyCustomerOnBookingStageChange = notifyCustomerOnBookingStageChange;
