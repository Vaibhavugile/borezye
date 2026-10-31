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
// 4. NEW FUNCTION: BOOKING PICKUP / RETURN REMINDERS
//    Checks ONLY branch 7007 payment documents.
//    Runs daily at 11 AM and 2 PM IST.
// =====================================================

exports.sendBookingStageReminders = onSchedule(
  {
    schedule: "0 11,14 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async (event) => {
    const branchCode = "7007"; // Change this when required.

    // Use the scheduled event time to create a stable daily reminder ID.
    const scheduledAt = event.scheduleTime
      ? new Date(event.scheduleTime)
      : new Date();

    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(scheduledAt);

    const datePart = `${dateParts.find((p) => p.type === "year").value}-${dateParts.find((p) => p.type === "month").value}-${dateParts.find((p) => p.type === "day").value}`;
    const hourPart = dateParts.find((p) => p.type === "hour").value;
    const slot = hourPart === "11" ? "11" : "14";

    console.log(
      `Booking reminders started for branch ${branchCode}, date ${datePart}, slot ${slot}:00 IST`
    );

    // Query only the selected branch's payments that are awaiting pickup/return.
    const paymentsSnapshot = await db
      .collection("products")
      .doc(branchCode)
      .collection("payments")
      .where("bookingStage", "in", ["pickupPending", "returnPending"])
      .get();

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const paymentDoc of paymentsSnapshot.docs) {
      const payment = paymentDoc.data();
      const stage = payment.bookingStage;
      const receiptNumber = paymentDoc.id;
      const contact = String(payment.contact || "").trim();

      if (!contact) {
        console.warn(`Skipping ${receiptNumber}: payment contact is missing.`);
        skippedCount++;
        continue;
      }

      // Customer documents are keyed by the customer's phone/contact number.
      const customerRef = db
        .collection("customers")
        .doc(branchCode)
        .collection("users")
        .doc(contact);

      const customerSnap = await customerRef.get();

      if (!customerSnap.exists) {
        console.warn(
          `Skipping ${receiptNumber}: customer ${contact} was not found in branch ${branchCode}.`
        );
        skippedCount++;
        continue;
      }

      const token = customerSnap.get("fcmToken");

      if (typeof token !== "string" || !token.trim()) {
        console.warn(
          `Skipping ${receiptNumber}: customer ${contact} has no FCM token.`
        );
        skippedCount++;
        continue;
      }

      // A deterministic marker prevents duplicate sends if the scheduled
      // function is retried or overlapping invocations occur.
      const reminderId = `${datePart}_${slot}`;
      const reminderRef = paymentDoc.ref
        .collection("bookingReminders")
        .doc(reminderId);

      const shouldSend = await db.runTransaction(async (transaction) => {
        const reminderSnap = await transaction.get(reminderRef);

        if (reminderSnap.exists) {
          return false;
        }

        transaction.create(reminderRef, {
          branchCode,
          receiptNumber,
          contact,
          stage,
          slot,
          date: datePart,
          status: "sending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return true;
      });

      if (!shouldSend) {
        skippedCount++;
        continue;
      }

      const isPickup = stage === "pickupPending";
      const title = isPickup ? "Pickup Reminder" : "Return Reminder";
      const body = isPickup
        ? `Your booking ${receiptNumber} is awaiting pickup. Please complete the pickup process.`
        : `Your booking ${receiptNumber} is awaiting return. Please complete the return process.`;

      try {
        const messageId = await admin.messaging().send({
          token: token.trim(),
          notification: {
            title,
            body,
          },
          data: {
            type: "booking_stage_reminder",
            branch: branchCode,
            receiptNumber: String(receiptNumber),
            bookingStage: String(stage),
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        });

        await reminderRef.update({
          status: "sent",
          messageId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        sentCount++;
        console.log(
          `Reminder sent: ${receiptNumber}, ${stage}, customer ${contact}`
        );
      } catch (error) {
        failedCount++;

        await reminderRef.update({
          status: "failed",
          error: String(error.message || "Unknown error").slice(0, 500),
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Remove an invalid token only if it has not changed since the send.
        const errorCode = error.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          await db.runTransaction(async (transaction) => {
            const freshCustomer = await transaction.get(customerRef);

            if (
              freshCustomer.exists &&
              freshCustomer.get("fcmToken") === token
            ) {
              transaction.update(customerRef, {
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            }
          });
        }

        console.error(
          `Reminder failed for ${receiptNumber}, customer ${contact}:`,
          error
        );
      }
    }

    console.log("Booking reminders completed:", {
      branchCode,
      date: datePart,
      slot,
      matchedPayments: paymentsSnapshot.size,
      sentCount,
      skippedCount,
      failedCount,
    });
  }
);
