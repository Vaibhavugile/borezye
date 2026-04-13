const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

exports.updateBookingStages = onSchedule(
{
schedule: "0 2 * * *", // Runs daily at 2:00 AM
timeZone: "Asia/Kolkata",
},
async () => {

const db = admin.firestore();

const today = new Date();

const todayIST = new Date(
today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);

const todayDate = todayIST.toISOString().split("T")[0];

console.log("Stage update started for IST date:", todayDate);

const snapshot = await db.collectionGroup("bookings").get();

let batch = db.batch();
let operationCount = 0;
let updatedCount = 0;

for (const docSnap of snapshot.docs) {

const data = docSnap.data();

const pickupDate = data.pickupDate?.toDate?.();
const returnDate = data.returnDate?.toDate?.();
const stage = data.userDetails?.stage;

const branchCode = data.branchCode;
const receiptNumber = data.receiptNumber;

if (!pickupDate || !returnDate) continue;

const pickupDateIST = new Date(
pickupDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
)
.toISOString()
.split("T")[0];

const returnDateIST = new Date(
returnDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
)
.toISOString()
.split("T")[0];


// -----------------------------
// Pickup Pending
// -----------------------------

if (pickupDateIST === todayDate && stage === "Booking") {

batch.update(docSnap.ref, {
"userDetails.stage": "pickupPending",
});

const paymentRef = db.doc(
`products/${branchCode}/payments/${receiptNumber}`
);

batch.update(paymentRef, {
bookingStage: "pickupPending"
});

operationCount++;
updatedCount++;

console.log("Updated pickupPending:", docSnap.id);
}


// -----------------------------
// Return Pending
// -----------------------------

if (returnDateIST === todayDate && stage === "pickup") {

batch.update(docSnap.ref, {
"userDetails.stage": "returnPending",
});

const paymentRef = db.doc(
`products/${branchCode}/payments/${receiptNumber}`
);

batch.update(paymentRef, {
bookingStage: "returnPending"
});

operationCount++;
updatedCount++;

console.log("Updated returnPending:", docSnap.id);
}


// Firestore batch protection
if (operationCount === 450) {

await batch.commit();
batch = db.batch();
operationCount = 0;

}

}


// Commit remaining updates
if (operationCount > 0) {
await batch.commit();
}

console.log("Daily booking stage update completed. Total updates:", updatedCount);

}
);