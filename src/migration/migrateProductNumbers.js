
import {
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const BRANCH_CODE = "7007";

const NUMERIC_FIELDS = [
  "deposit",
  "extraRent",
  "price",
  "quantity",
  "minimumRentalPeriod",
];

export async function migrateProductNumbers() {
  console.log("Starting integer migration...");
  console.log(`Branch: ${BRANCH_CODE}`);

  const productsRef = collection(
    db,
    "products",
    BRANCH_CODE,
    "products"
  );

  const snapshot = await getDocs(productsRef);

  let batch = writeBatch(db);
  let batchCount = 0;
  let updatedProducts = 0;
  let skippedProducts = 0;
  let skippedFields = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const updates = {};

    for (const field of NUMERIC_FIELDS) {
      if (!(field in data)) continue;

      const value = data[field];
      let numericValue;

      if (typeof value === "number") {
        numericValue = value;
      } else if (
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        numericValue = Number(value.trim());
      } else {
        skippedFields++;
        console.warn(
          `Skipped ${docSnap.id}.${field}:`,
          value
        );
        continue;
      }

      // Only migrate finite whole numbers.
      if (
        !Number.isFinite(numericValue) ||
        !Number.isSafeInteger(numericValue)
      ) {
        skippedFields++;
        console.warn(
          `Skipped non-integer ${docSnap.id}.${field}:`,
          value
        );
        continue;
      }

      // Assign a whole-number JS value so Firestore can
      // encode it as an integer during the write.
      updates[field] = Math.trunc(numericValue);
    }

    if (Object.keys(updates).length === 0) {
      skippedProducts++;
      continue;
    }

    batch.update(docSnap.ref, updates);
    batchCount++;
    updatedProducts++;

    if (batchCount >= 450) {
      await batch.commit();
      console.log("Batch committed");

      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log("Migration completed");
  console.log(`Branch: ${BRANCH_CODE}`);
  console.log(`Products scanned: ${snapshot.size}`);
  console.log(`Products updated: ${updatedProducts}`);
  console.log(`Products skipped: ${skippedProducts}`);
  console.log(`Fields skipped: ${skippedFields}`);
}
