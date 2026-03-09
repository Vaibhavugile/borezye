const admin = require("firebase-admin");

// Initialize Firebase Admin SDK (Make sure you have the service account key JSON).
const serviceAccount = require("./renting-wala-27d06-firebase-adminsdk-1zm50-5c6a71f27e.json"); // 🔹 Replace with your service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateProducts() {
  try {
    console.log("🔄 Starting migration...");

    const productsRef = db.collection("products");
    const productsSnapshot = await productsRef.get();

    if (productsSnapshot.empty) {
      console.log("✅ No products found in the main collection.");
      return;
    }

    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      const branchCode = productData.branchCode;

      if (!branchCode) {
        console.warn(`⚠️ Skipping product ${productDoc.id} - missing branchCode.`);
        continue;
      }

      // New product location
      const newProductRef = db.collection(`products/${branchCode}/products`).doc(productDoc.id);
      await newProductRef.set(productData);
      console.log(`✅ Moved product ${productDoc.id} to branch ${branchCode}`);

      // 🔹 Move bookings to the new location
      const bookingsRef = productDoc.ref.collection("bookings");
      const bookingsSnapshot = await bookingsRef.get();

      if (!bookingsSnapshot.empty) {
        for (const bookingDoc of bookingsSnapshot.docs) {
          const bookingData = bookingDoc.data();
          const newBookingRef = newProductRef.collection("bookings").doc(bookingDoc.id);
          await newBookingRef.set(bookingData);
        }
        console.log(`📦 Moved ${bookingsSnapshot.size} bookings for product ${productDoc.id}`);
      }

      // 🔥 Delete old product (after ensuring migration success)
      await bookingsRef.listDocuments().then((docs) => docs.forEach((doc) => doc.delete())); // Delete old bookings
      await productDoc.ref.delete();
      console.log(`🗑 Deleted old product ${productDoc.id}`);
    }

    console.log("🎉 Migration complete!");
  } catch (error) {
    console.error("❌ Error migrating products:", error);
  }
}

// Run the migration
migrateProducts();