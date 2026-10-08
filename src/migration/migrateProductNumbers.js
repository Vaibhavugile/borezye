import {
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

// 👇 CHANGE ONLY THIS
const BRANCH_CODE = "007";

const NUMERIC_FIELDS = [
  "deposit",
  "extraRent",
  "price",
  "quantity",
  "minimumRentalPeriod",
];

export async function migrateProductNumbers() {
  console.log("🚀 Starting migration...");
  console.log(`🏢 Branch: ${BRANCH_CODE}`);

  const productsRef = collection(
    db,
    "products",
    BRANCH_CODE,
    "products"
  );

  const snapshot = await getDocs(productsRef);

  console.log(
    `📦 Found ${snapshot.size} products`
  );

  if (snapshot.empty) {
    console.log(
      `⚠️ No products found for branch ${BRANCH_CODE}`
    );
    return;
  }

  let batch = writeBatch(db);
  let batchCount = 0;

  let updatedProducts = 0;
  let skippedProducts = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    const updates = {};

    for (const field of NUMERIC_FIELDS) {
      if (!(field in data)) {
        continue;
      }

      const value = data[field];

      // Already number
      if (typeof value === "number") {
        continue;
      }

      // String → number
      if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed === "") {
          console.log(
            `⚠️ Empty ${field} → ${docSnap.id}`
          );
          continue;
        }

        const numberValue = Number(trimmed);

        if (!Number.isNaN(numberValue)) {
          updates[field] = numberValue;

          console.log(
            `🔄 ${docSnap.id} | ${field}:`,
            `"${value}" → ${numberValue}`
          );
        } else {
          console.log(
            `❌ Cannot convert ${docSnap.id} | ${field}:`,
            value
          );
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      batch.update(docSnap.ref, updates);

      updatedProducts++;
      batchCount++;

      // Firestore batch safety
      if (batchCount >= 450) {
        await batch.commit();

        console.log("💾 Batch committed");

        batch = writeBatch(db);
        batchCount = 0;
      }
    } else {
      skippedProducts++;
    }
  }

  // Commit remaining updates
  if (batchCount > 0) {
    await batch.commit();

    console.log("💾 Final batch committed");
  }

  console.log("\n===============================");
  console.log("🎉 MIGRATION COMPLETED");
  console.log("===============================");
  console.log(`🏢 Branch: ${BRANCH_CODE}`);
  console.log(`📦 Products: ${snapshot.size}`);
  console.log(`✅ Updated: ${updatedProducts}`);
  console.log(`⏭️ Skipped: ${skippedProducts}`);
  console.log("===============================");
}