import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, collectionGroup, doc, setDoc, getDoc,addDoc,serverTimestamp,deleteDoc ,updateDoc,writeBatch} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import './Dahboard.css';
import { useUser } from '../../Auth/UserContext';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [todaysBookings, setTodaysBookings] = useState(0);
  const [pickupPendingCount, setPickupPendingCount] = useState(0);
  const [returnPendingCount, setReturnPendingCount] = useState(0);
  const [successfulCount, setSuccessfulCount] = useState(0);
const [overlappedBookings, setOverlappedBookings] = useState([]);
  const [monthlyPickupPending, setMonthlyPickupPending] = useState(0);
  const [monthlyReturnPending, setMonthlyReturnPending] = useState(0);
  const [monthlySuccessful, setMonthlySuccessful] = useState(0);
  const [monthlyTotalBookings, setMonthlyTotalBookings] = useState(0);
  const [showOverlaps, setShowOverlaps] = useState(false);

  const [topProducts, setTopProducts] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [filterTitle, setFilterTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { userData } = useUser();
  const navigate = useNavigate();

  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);


const generatePaymentsFromOldBookings = async () => {

  try {

    const snapshot = await getDocs(collectionGroup(db, "bookings"));

    const receipts = {};

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();
      const receiptNumber = data.receiptNumber;

      if (!receiptNumber) return;

      const details = data.userDetails || {};

      // Extract branchCode safely
      const branchCode =
        details.branchCode ||
        receiptNumber.split("-")[0] ||
        "";

      // Create receipt entry if it doesn't exist
      if (!receipts[receiptNumber]) {

        receipts[receiptNumber] = {

          receiptNumber: receiptNumber,
          branchCode: branchCode,

          clientName: details.name || "",
          contact: details.contact || "",

          pickupDate: data.pickupDate || null,
          returnDate: data.returnDate || null,

          grandTotalRent: Number(details.grandTotalRent || 0),
          grandTotalDeposit: Number(details.grandTotalDeposit || 0),

          discountOnRent: Number(details.discountOnRent || 0),
          discountOnDeposit: Number(details.discountOnDeposit || 0),

          finalRent: Number(details.finalrent || 0),
          finalDeposit: Number(details.finaldeposite || 0),

          totalAmount: Number(details.totalamounttobepaid || 0),
          amountPaid: Number(details.amountpaid || 0),
          balance: Number(details.balance || 0),

          paymentStatus: details.paymentstatus || "",

          firstPaymentMode: details.firstpaymentmode || "",
          firstPaymentDetails: details.firstpaymentdtails || "",

          secondPaymentMode: details.secondpaymentmode || "",
          secondPaymentDetails: details.secondpaymentdetails || "",

          bookingStage: details.stage || "",

          appliedCredit: Number(data.appliedCredit || 0),

          createdAt: data.createdAt || null,

          productsSummary: []
        };
      }

      // Add product to productsSummary
      receipts[receiptNumber].productsSummary.push({
        productCode: data.productCode || "",
        quantity: Number(data.quantity || 0),
        rent: Number(data.price || 0),
        deposit: Number(data.deposit || 0)
      });

    });


    // Write payments to Firestore
    for (const receiptNumber in receipts) {

      const paymentData = receipts[receiptNumber];

      const paymentRef = doc(
        db,
        `products/${paymentData.branchCode}/payments`,
        receiptNumber
      );

      // 🔴 IMPORTANT: Skip if payment already exists
      const paymentDoc = await getDoc(paymentRef);

      if (paymentDoc.exists()) {
        console.log(`Skipping existing payment: ${receiptNumber}`);
        continue;
      }

      await setDoc(paymentRef, paymentData);

      console.log(`Created payment: ${receiptNumber}`);

    }

    console.log("✅ Payment migration completed successfully");

  } catch (error) {
    console.error("Migration error:", error);
  }

};
const migrateFirstPaymentTransactions = async () => {

try {

const paymentsSnapshot = await getDocs(collectionGroup(db, "payments"));

for (const paymentDoc of paymentsSnapshot.docs) {

const paymentData = paymentDoc.data();
const receiptNumber = paymentData.receiptNumber;
const branchCode = paymentData.branchCode;

if (!receiptNumber || !branchCode) continue;

const txRef = doc(
db,
`products/${branchCode}/payments/${receiptNumber}/transactions`,
"tx1"
);

const existingTx = await getDoc(txRef);

if (existingTx.exists()) {

console.log(`tx1 already exists for ${receiptNumber}`);
continue;

}

const amount = Number(paymentData.amountPaid || 0);

if (amount <= 0) continue;

await setDoc(txRef,{

amount: amount,
mode: paymentData.firstPaymentMode || "",
details: paymentData.firstPaymentDetails || "",

createdAt: paymentData.createdAt || serverTimestamp(),
createdBy: "Migration",

paymentNumber: 1

});

console.log(`Created tx1 for ${receiptNumber}`);

}

console.log("✅ Transaction migration completed");

} catch (error) {

console.error("Migration error:", error);

}

};
const cleanupDuplicateTransactions = async () => {

  try {

    const paymentsSnapshot = await getDocs(collectionGroup(db, "payments"));

    for (const paymentDoc of paymentsSnapshot.docs) {

      const paymentData = paymentDoc.data();
      const branchCode = paymentData.branchCode;
      const receiptNumber = paymentData.receiptNumber;

      if (!branchCode || !receiptNumber) continue;

      const transactionsRef = collection(
        db,
        `products/${branchCode}/payments/${receiptNumber}/transactions`
      );

      const snapshot = await getDocs(transactionsRef);

      const seenPayments = new Set();

      for (const docSnap of snapshot.docs) {

        const data = docSnap.data();
        const paymentNumber = data.paymentNumber;

        if (seenPayments.has(paymentNumber)) {

          // duplicate → delete
          await deleteDoc(docSnap.ref);

          console.log(`Deleted duplicate tx for ${receiptNumber}`);

        } else {

          seenPayments.add(paymentNumber);

        }

      }

    }

    console.log("✅ Cleanup completed");

  } catch (error) {

    console.error("Cleanup error:", error);

  }

};
const migrateBookingStageToPayments = async () => {

  try {

    if (!userData?.branchCode) return;

    const uniqueBookings = getUniqueBookingsByReceiptNumber(bookings);

    for (const booking of uniqueBookings) {

      const receiptNumber = booking.receiptNumber;
      const stage = booking.stage;

      if (!receiptNumber || !stage) continue;

      const paymentRef = doc(
        db,
        `products/${userData.branchCode}/payments`,
        receiptNumber
      );

      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        console.log(`Payment not found for ${receiptNumber}`);
        continue;
      }

      await updateDoc(paymentRef, {
        bookingStage: stage
      });

      console.log(`Stage synced for ${receiptNumber} → ${stage}`);
    }

    console.log("✅ Booking stage migration completed");

  } catch (error) {

    console.error("Migration error:", error);

  }

};
const migrateBookingStageToPaymentsAllBranches = async () => {

  try {

    const snapshot = await getDocs(collectionGroup(db, "bookings"));

    const receiptStages = {};

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();
      const receiptNumber = data.receiptNumber;
      const stage = data.userDetails?.stage;

      if (!receiptNumber || !stage) return;

      const branchCode =
        data.userDetails?.branchCode ||
        receiptNumber.split("-")[0] ||
        "";

      if (!branchCode) return;

      receiptStages[receiptNumber] = {
        stage,
        branchCode
      };

    });

    for (const receiptNumber in receiptStages) {

      const { stage, branchCode } = receiptStages[receiptNumber];

      const paymentRef = doc(
        db,
        `products/${branchCode}/payments`,
        receiptNumber
      );

      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        console.log(`Payment not found for ${receiptNumber}`);
        continue;
      }

      await updateDoc(paymentRef, {
        bookingStage: stage
      });

      console.log(`Updated ${receiptNumber} → ${stage}`);

    }

    console.log("✅ Stage migration completed for all branches");

  } catch (error) {

    console.error("Migration error:", error);

  }

};
const rebuildSuccessfulReceipts = async () => {

  try {

    const paymentsSnapshot = await getDocs(collectionGroup(db, "payments"));

    for (const paymentDoc of paymentsSnapshot.docs) {

      const payment = paymentDoc.data();

      if (payment.bookingStage !== "successful") continue;

      const receiptNumber = payment.receiptNumber;
      const branchCode = payment.branchCode;

      const finalRent = Number(payment.finalRent || 0);
      const finalDeposit = Number(payment.finalDeposit || 0);
      let amountPaid = Number(payment.amountPaid || 0);
      const balance = Number(payment.balance || 0);

      const transactionsRef = collection(
        db,
        `products/${branchCode}/payments/${receiptNumber}/transactions`
      );

      const txSnapshot = await getDocs(transactionsRef);

      const txList = txSnapshot.docs.map(doc => doc.data());

      const hasSecondPayment = txList.some(tx => tx.paymentNumber === 2);
      const hasDepositReturn = txList.some(tx => tx.type === "depositReturn");

      let nextPaymentNumber = txList.length + 1;

      // SECOND PAYMENT
      if (!hasSecondPayment && balance > 0) {

        await setDoc(
          doc(transactionsRef, `tx${nextPaymentNumber}`),
          {
            amount: balance,
            mode: "Migration",
            details: "Second payment migration",
            paymentNumber: nextPaymentNumber,
            createdAt: serverTimestamp(),
            createdBy: "Migration"
          }
        );

        amountPaid += balance;
        nextPaymentNumber++;

        console.log(`Second payment created for ${receiptNumber}`);
      }

      // CALCULATE COLLECTION
      const rentCollected = Math.min(amountPaid, finalRent);

      const depositCollected = Math.min(
        Math.max(0, amountPaid - finalRent),
        finalDeposit
      );

      // DEPOSIT RETURN
      if (!hasDepositReturn && depositCollected > 0) {

        await setDoc(
          doc(transactionsRef, `tx${nextPaymentNumber}`),
          {
            amount: depositCollected,
            mode: "Migration",
            details: "Deposit return migration",
            paymentNumber: nextPaymentNumber,
            type: "depositReturn",
            createdAt: serverTimestamp(),
            createdBy: "Migration"
          }
        );

        console.log(`Deposit return created for ${receiptNumber}`);
      }

      // UPDATE SUMMARY
      await updateDoc(paymentDoc.ref, {

        amountPaid,

        rentCollected,
        rentPending: finalRent - rentCollected,

        depositCollected,
        depositPending: finalDeposit - depositCollected,

        depositReturned: depositCollected,
        depositWithYou: 0

      });

    }

    console.log("✅ Migration finished");

  } catch (error) {

    console.error("Migration error:", error);

  }

};
const fixSuccessfulBalances = async () => {

  try {

    const snapshot = await getDocs(collectionGroup(db, "payments"));

    const updates = [];

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      if (data.bookingStage === "successful" && Number(data.balance) !== 0) {

        updates.push(docSnap.ref);

      }

    });

    console.log(`Found ${updates.length} payments to fix`);

    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < updates.length; i += batchSize) {

      const batch = writeBatch(db);

      const chunk = updates.slice(i, i + batchSize);

      chunk.forEach((ref) => {

        batch.update(ref, {
          balance: 0
        });

      });

      batches.push(batch.commit());

    }

    await Promise.all(batches);

    console.log("✅ All successful payment balances fixed");

  } catch (error) {

    console.error("Migration error:", error);

  }

};
const migrateSecondPaymentsFromBookings = async () => {

  try {

    const bookingsSnapshot = await getDocs(collectionGroup(db, "bookings"));

    const jobs = [];

    bookingsSnapshot.forEach((docSnap) => {

      const data = docSnap.data();
      const details = data.userDetails || {};

      const receiptNumber = data.receiptNumber;
      const branchCode = details.branchCode || receiptNumber?.split("-")[0];

      const secondMode = details.secondpaymentmode;
      const secondDetails = details.secondpaymentdetails;
      const balance = Number(details.balance || 0);

      if (!receiptNumber || !branchCode) return;

      if (!secondMode || !secondDetails || balance <= 0) return;

      jobs.push({
        receiptNumber,
        branchCode,
        balance,
        secondMode,
        secondDetails
      });

    });

    console.log(`Found ${jobs.length} receipts needing migration`);

    await Promise.all(

      jobs.map(async (job) => {

        const { receiptNumber, branchCode, balance, secondMode, secondDetails } = job;

        const paymentRef = doc(
          db,
          `products/${branchCode}/payments`,
          receiptNumber
        );

        const paymentSnap = await getDoc(paymentRef);

        if (!paymentSnap.exists()) return;

        const payment = paymentSnap.data();

        const transactionsRef = collection(
          db,
          `products/${branchCode}/payments/${receiptNumber}/transactions`
        );

        const txSnapshot = await getDocs(transactionsRef);

        const txList = txSnapshot.docs.map(d => d.data());

        const hasSecondPayment = txList.some(tx => tx.paymentNumber === 2);

        if (hasSecondPayment) return;

        const nextPaymentNumber = txList.length + 1;

        const txRef = doc(
          db,
          `products/${branchCode}/payments/${receiptNumber}/transactions`,
          `tx${nextPaymentNumber}`
        );

        await setDoc(txRef, {

          amount: balance,
          mode: secondMode,
          details: secondDetails,

          paymentNumber: nextPaymentNumber,

          createdAt: serverTimestamp(),
          createdBy: "Migration"

        });

        const newPaid = Number(payment.amountPaid || 0) + balance;

        await updateDoc(paymentRef, {
          amountPaid: newPaid,
          balance: 0
        });

        console.log(`Migrated ${receiptNumber}`);

      })

    );

    console.log("✅ Migration completed");

  } catch (error) {

    console.error("Migration error:", error);

  }

};
const detectOverlaps = (allBookings) => {

  console.log("🔍 Checking booking overlaps...");

  const overlaps = [];

  // group by product
  const productGroups = {};

  allBookings.forEach((b) => {
    if (!productGroups[b.productCode]) {
      productGroups[b.productCode] = [];
    }
    productGroups[b.productCode].push(b);
  });

  Object.entries(productGroups).forEach(([productCode, bookings]) => {

    for (let i = 0; i < bookings.length; i++) {

      for (let j = i + 1; j < bookings.length; j++) {

        const A = bookings[i];
        const B = bookings[j];

        if (!A.pickupDate || !B.pickupDate) continue;

        // ignore cancelled
        if (A.stage === "cancelled" || B.stage === "cancelled") continue;

        const overlap =
          A.pickupDate <= B.returnDate &&
          A.returnDate >= B.pickupDate;

        if (overlap) {

          overlaps.push({
  productCode,

  booking1: A.receiptNumber,
  status1: A.stage,

  pickup1: A.pickupDate,
  return1: A.returnDate,

  booking2: B.receiptNumber,
  status2: B.stage,

  pickup2: B.pickupDate,
  return2: B.returnDate
});

          console.log("⚠️ OVERLAP FOUND:", productCode, A.receiptNumber, B.receiptNumber);

        }

      }

    }

  });

  console.log("🚨 Total overlaps:", overlaps.length);

  return overlaps;
};
const rebuildAccountSummaries = async () => {

  try {

    const paymentsSnapshot = await getDocs(collectionGroup(db, "payments"));

    const jobs = paymentsSnapshot.docs;

    console.log(`Rebuilding ${jobs.length} payments`);

    await Promise.all(

      jobs.map(async (paymentDoc) => {

        const payment = paymentDoc.data();

        const receiptNumber = payment.receiptNumber;
        const branchCode = payment.branchCode;

        if (!receiptNumber || !branchCode) return;

        const transactionsRef = collection(
          db,
          `products/${branchCode}/payments/${receiptNumber}/transactions`
        );

        const txSnapshot = await getDocs(transactionsRef);

        let totalPaid = 0;
        let totalRefunded = 0;

        txSnapshot.forEach(tx => {

          const data = tx.data();

          if (data.type === "depositReturn") {
            totalRefunded += Number(data.amount || 0);
          } else {
            totalPaid += Number(data.amount || 0);
          }

        });

        const rent = Number(payment.finalRent || 0);
        const deposit = Number(payment.finalDeposit || 0);

        const rentCollected = Math.min(totalPaid, rent);
        const rentPending = rent - rentCollected;

        const depositCollected = Math.min(
          Math.max(0, totalPaid - rent),
          deposit
        );

        const depositPending = deposit - depositCollected;

        const depositReturned = totalRefunded;

        const depositWithYou = Math.max(
          depositCollected - depositReturned,
          0
        );

        await updateDoc(paymentDoc.ref, {

          rentCollected,
          rentPending,

          depositCollected,
          depositPending,

          depositReturned,
          depositWithYou

        });

      })

    );

    console.log("✅ Account summaries rebuilt");

  } catch (error) {

    console.error("Migration error:", error);

  }

};
const migrateCustomerReceiptByToPayments = async () => {

  try {

    const bookingsSnapshot = await getDocs(collectionGroup(db, "bookings"));

    const receiptMap = {};

    bookingsSnapshot.forEach((docSnap) => {

      const data = docSnap.data();
      const receiptNumber = data.receiptNumber;

      const details = data.userDetails || {};

      const customerBy = details.customerby || "";
      const receiptBy = details.receiptby || "";

      const branchCode =
        details.branchCode ||
        receiptNumber?.split("-")[0];

      if (!receiptNumber || !branchCode) return;

      if (!receiptMap[receiptNumber]) {

        receiptMap[receiptNumber] = {
          branchCode,
          customerBy,
          receiptBy
        };

      }

    });

    console.log(`Found ${Object.keys(receiptMap).length} receipts`);

    const batchSize = 500;
    const entries = Object.entries(receiptMap);

    for (let i = 0; i < entries.length; i += batchSize) {

      const batch = writeBatch(db);

      const chunk = entries.slice(i, i + batchSize);

      chunk.forEach(([receiptNumber, data]) => {

        const paymentRef = doc(
          db,
          `products/${data.branchCode}/payments`,
          receiptNumber
        );

        batch.update(paymentRef, {
          customerBy: data.customerBy,
          receiptBy: data.receiptBy
        });

      });

      await batch.commit();

      console.log(`Batch ${i / batchSize + 1} committed`);

    }

    console.log("✅ CustomerBy + ReceiptBy migration completed");

  } catch (error) {

    console.error("Migration error:", error);

  }

};


const migrateBookings = async () => {

  console.log("🚀 Migration Started");

  let batch = writeBatch(db);
  let operationCount = 0;
  let totalUpdated = 0;

  try {

    // 🔹 Fetch ALL bookings in database
    const bookingsSnapshot = await getDocs(
      collectionGroup(db, "bookings")
    );

    console.log("Total bookings found:", bookingsSnapshot.size);

    for (const bookingDoc of bookingsSnapshot.docs) {

      const bookingData = bookingDoc.data();

      // Skip if already migrated
      if (bookingData.branchCode && bookingData.productCode) continue;

      // Path example:
      // products/{branchCode}/products/{productCode}/bookings/{bookingId}

      const pathParts = bookingDoc.ref.path.split("/");

      const branchCode = pathParts[1];
      const productCode = pathParts[3];

      batch.update(bookingDoc.ref, {
        branchCode,
        productCode
      });

      operationCount++;
      totalUpdated++;

      // Firestore batch limit protection
      if (operationCount === 500) {

        await batch.commit();
        console.log(`Committed 500 updates (Total: ${totalUpdated})`);

        batch = writeBatch(db);
        operationCount = 0;

      }

    }

    // Commit remaining
    if (operationCount > 0) {

      await batch.commit();
      console.log(`Committed remaining ${operationCount}`);

    }

    console.log("✅ Migration Completed");
    console.log("Total bookings updated:", totalUpdated);

  } catch (error) {

    console.error("❌ Migration Failed:", error);

  }

};
  /* ================= HELPERS ================= */

  const isSameDay = (d1, d2) =>
    d1 && d2 &&
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const getUniqueBookingsByReceiptNumber = (list) => {
    const seen = new Set();
    return list.filter((b) => {
      if (!b.receiptNumber || seen.has(b.receiptNumber)) return false;
      seen.add(b.receiptNumber);
      return true;
    });
  };

  const getUniqueBookings = () =>
    getUniqueBookingsByReceiptNumber(bookings);

  const groupBookingsByReceiptNumber = (list) => {
    const grouped = {};
    list.forEach((b) => {
      if (!b.receiptNumber) return;
      if (!grouped[b.receiptNumber]) {
        grouped[b.receiptNumber] = {
          receiptNumber: b.receiptNumber,
          bookings: [],
        };
      }
      grouped[b.receiptNumber].bookings.push(b);
    });
    return Object.values(grouped);
  };

  /* ================= FAST FETCH ================= */

  useEffect(() => {
    const fetchAllBookings = async () => {
      if (!userData?.branchCode) return;

      console.time('🚀 fetchBookings');

      console.log('🏬 Branch:', userData.branchCode);

      const productsRef = collection(
        db,
        `products/${userData.branchCode}/products`
      );
      const productsSnap = await getDocs(productsRef);

      console.log('📦 Products:', productsSnap.size);

      const bookingPromises = productsSnap.docs.map((productDoc) => {
        const { productCode, productName, imageUrls } = productDoc.data();

        const bookingsRef = collection(
          db,
          `products/${userData.branchCode}/products/${productDoc.id}/bookings`
        );

        return getDocs(query(bookingsRef, orderBy('pickupDate', 'asc')))
          .then((snap) =>
            snap.docs.map((doc) => {
              const d = doc.data();
              return {
                productCode,
                productName,
                imageUrls,
                ...d,
                pickupDate: d.pickupDate?.toDate() || null,
                returnDate: d.returnDate?.toDate() || null,
                createdAt: d.createdAt?.toDate() || null,
                stage: d.userDetails?.stage,
              };
            })
          );
      });

      const allBookings = (await Promise.all(bookingPromises)).flat();

      console.log('📊 Total bookings:', allBookings.length);
      setBookings(allBookings);
      const overlaps = detectOverlaps(allBookings);
setOverlappedBookings(overlaps);

      const unique = getUniqueBookingsByReceiptNumber(allBookings);
      console.log('🧾 Unique receipts:', unique.length);

      const today = new Date();
      const month = today.getMonth();
      const year = today.getFullYear();

      setTodaysBookings(unique.filter(b => isSameDay(b.createdAt, today)).length);
      setPickupPendingCount(unique.filter(b => b.stage === 'pickupPending' && isSameDay(b.pickupDate, today)).length);
      setReturnPendingCount(unique.filter(b => b.stage === 'returnPending' && isSameDay(b.returnDate, today)).length);
      setSuccessfulCount(unique.filter(b => b.stage === 'successful' && isSameDay(b.returnDate, today)).length);

      setMonthlyPickupPending(unique.filter(b => b.stage === 'pickupPending' && b.pickupDate?.getMonth() === month && b.pickupDate?.getFullYear() === year).length);
      setMonthlyReturnPending(unique.filter(b => b.stage === 'returnPending' && b.returnDate?.getMonth() === month && b.returnDate?.getFullYear() === year).length);
      setMonthlySuccessful(unique.filter(b => b.stage === 'successful' && b.returnDate?.getMonth() === month && b.returnDate?.getFullYear() === year).length);
      setMonthlyTotalBookings(unique.filter(b => b.pickupDate?.getMonth() === month && b.pickupDate?.getFullYear() === year).length);

      const productCount = {};
      allBookings.forEach((b) => {
        productCount[b.productCode] ??= {
          productName: b.productName,
          imageUrls: b.imageUrls,
          count: 0,
        };
        productCount[b.productCode].count++;
      });

      setTopProducts(
        Object.entries(productCount)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([code, v]) => ({ productCode: code, ...v }))
      );

      console.timeEnd('🚀 fetchBookings');
    };

    fetchAllBookings();
  }, [userData?.branchCode]);

  /* ================= FILTERS ================= */

const handleShowFilteredBookings = (type) => {
  const today = new Date();
  const unique = getUniqueBookings();
  let filtered = [];

  switch (type) {
    case 'todaysBookings':
      filtered = unique.filter(b => isSameDay(b.createdAt, today));
      setFilterTitle("Today's Bookings");
      break;
    case 'pickupPending':
      filtered = unique.filter(b => b.stage === 'pickupPending' && isSameDay(b.pickupDate, today));
      setFilterTitle("Today’s Pickup Pending");
      break;
    case 'returnPending':
      filtered = unique.filter(b => b.stage === 'returnPending' && isSameDay(b.returnDate, today));
      setFilterTitle("Today’s Return Pending");
      break;
    case 'successful':
      filtered = unique.filter(b => b.stage === 'successful' && isSameDay(b.returnDate, today));
      setFilterTitle("Today’s Successful Bookings");
      break;
    default:
      return;
  }

  const grouped = groupBookingsByReceiptNumber(filtered);

  // ✅ SORT BY RECEIPT NUMBER DESC
  grouped.sort((a, b) =>
    b.receiptNumber.localeCompare(a.receiptNumber)
  );

  setFilteredBookings(grouped);
};
const handleShowOverlaps = () => {

  const formatted = overlappedBookings.map((o) => ({
    receiptNumber: `${o.booking1} / ${o.booking2}`,
    bookings: [
      {
        productCode: o.productCode,
        pickupDate: o.pickup1,
        returnDate: o.return1,
        stage: o.status1
      },
      {
        productCode: o.productCode,
        pickupDate: o.pickup2,
        returnDate: o.return2,
        stage: o.status2
      }
    ]
  }));

  setFilterTitle("Overlapping Bookings");
  setFilteredBookings(formatted);
};

  const filterMonthlyBookings = (type) => {
  const now = new Date();
  const unique = getUniqueBookings();

  const isCurrentMonth = (d) =>
    d?.getMonth() === now.getMonth() &&
    d?.getFullYear() === now.getFullYear();

  const filtered = unique.filter((b) => {
    switch (type) {
      case 'pickupPending':
        return b.stage === 'pickupPending' && isCurrentMonth(b.pickupDate);
      case 'returnPending':
        return b.stage === 'returnPending' && isCurrentMonth(b.returnDate);
      case 'successful':
        return b.stage === 'successful' && isCurrentMonth(b.returnDate);
      case 'total':
        return isCurrentMonth(b.pickupDate);
      default:
        return false;
    }
  });

  const grouped = groupBookingsByReceiptNumber(filtered);

  // ✅ SORT BY RECEIPT NUMBER DESC
  grouped.sort((a, b) =>
    b.receiptNumber.localeCompare(a.receiptNumber)
  );

  setFilterTitle(`Monthly ${type}`);
  setFilteredBookings(grouped);
};



  return (
  <div className={`dashboard-container ${sidebarOpen ? "sidebar-open" : ""}`}>
    <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

    <div className="reports-container">
      <UserHeader
        onMenuClick={handleSidebarToggle}
        isSidebarOpen={sidebarOpen}
      />
      

      {/* =======================
          TODAY'S REPORT
      ======================= */}
      <section style={{ marginLeft: '10px', marginTop: '100px' }}  className="dashboard-section">
        <header  className="section-header">
          <h4 >Today’s Overview</h4>
          <p className="section-subtitle">Live booking performance</p>
        </header>
{/* <button onClick={generatePaymentsFromOldBookings}>
Generate Previous pay
</button>
<button onClick={cleanupDuplicateTransactions}>
Generate Previous Payments
</button> */}
{/* <button onClick={migrateBookingStageToPayments}>
Sync Booking Status to Payments
</button>
<button onClick={migrateBookingStageToPaymentsAllBranches}>
Sync Booking Stage → Payments (All Branches)
</button>
<button onClick={rebuildSuccessfulReceipts}>
Rebuild Successful Receipts
</button>
<button onClick={fixSuccessfulBalances}>
Fix Successful Payment Balances
</button> */}
{/* <button onClick={migrateSecondPaymentsFromBookings}>
Migrate Second Payments
</button>
<button onClick={rebuildAccountSummaries}>
Rebuild Account Summaries
</button> */}
{/* <button onClick={migrateCustomerReceiptByToPayments}>
Migrate CustomerBy & ReceiptBy
</button> */}
{/* <button onClick={migrateBookings}>
Run Booking Migration
</button> */}


        <div className="kpi-grid">
          
          <div
            className="kpi-card primary"
            onClick={() => handleShowFilteredBookings("todaysBookings")}
          >
            <span>Today's Bookings</span>
            <strong>{todaysBookings}</strong>
          </div>

          <div
            className="kpi-card warning"
            onClick={() => handleShowFilteredBookings("pickupPending")}
          >
            <span>Pick-up Pending</span>
            <strong>{pickupPendingCount}</strong>
          </div>

          <div
            className="kpi-card info"
            onClick={() => handleShowFilteredBookings("returnPending")}
          >
            <span>Return Pending</span>
            <strong>{returnPendingCount}</strong>
          </div>

          <div
            className="kpi-card success"
            onClick={() => handleShowFilteredBookings("successful")}
          >
            <span>Successful</span>
            <strong>{successfulCount}</strong>
          </div>
        </div>
       <div
  className="kpi-card danger"
  onClick={() => setShowOverlaps(true)}
>
  <span>Overlapping Bookings</span>
  <strong>{overlappedBookings.length}</strong>
</div>
      </section>

      {/* =======================
          MONTHLY OVERVIEW
      ======================= */}
      <section className="dashboard-section">
        <header className="section-header">
          <h4>Monthly Overview</h4>
          <p className="section-subtitle">Bookings summary for this month</p>
        </header>

        <div className="kpi-grid">
          <div
            className="kpi-card neutral"
            onClick={() => filterMonthlyBookings("total")}
          >
            <span>Total Bookings</span>
            <strong>{monthlyTotalBookings}</strong>
          </div>

          <div
            className="kpi-card warning"
            onClick={() => filterMonthlyBookings("pickupPending")}
          >
            <span>Pick-up Pending</span>
            <strong>{monthlyPickupPending}</strong>
          </div>

          <div
            className="kpi-card info"
            onClick={() => filterMonthlyBookings("returnPending")}
          >
            <span>Return Pending</span>
            <strong>{monthlyReturnPending}</strong>
          </div>

          <div
            className="kpi-card success"
            onClick={() => filterMonthlyBookings("successful")}
          >
            <span>Successful</span>
            <strong>{monthlySuccessful}</strong>
          </div>
        </div>
      </section>
     {showOverlaps && overlappedBookings.length > 0 && (
  <section className="dashboard-section">
    <header className="section-header">
      <h4>⚠️ Overlapping Bookings</h4>
      <p className="section-subtitle">Conflicting bookings detected</p>
    </header>

    <button
      className="modall-close-btn"
      onClick={() => setShowOverlaps(false)}
    >
      Close
    </button>

    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Product</th>

            <th>Booking 1</th>
            <th>Status</th>
            <th>Pickup</th>
            <th>Return</th>

            <th>Booking 2</th>
            <th>Status</th>
            <th>Pickup</th>
            <th>Return</th>
          </tr>
        </thead>

        <tbody>
          {overlappedBookings.map((o, i) => (
            <tr key={i}>
              <td>{o.productCode}</td>

              <td>{o.booking1}</td>
              <td>{o.status1}</td>
              <td>{o.pickup1?.toLocaleDateString()}</td>
              <td>{o.return1?.toLocaleDateString()}</td>

              <td>{o.booking2}</td>
              <td>{o.status2}</td>
              <td>{o.pickup2?.toLocaleDateString()}</td>
              <td>{o.return2?.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}

      {/* =======================
          FILTERED BOOKINGS MODAL
      ======================= */}
      {filteredBookings.length > 0 && (
        <div className="modal-overlayy" onClick={() => setFilteredBookings([])}>
          <div className="modal-boxx" onClick={(e) => e.stopPropagation()}>
            <button
              className="modall-close-btn"
              onClick={() => setFilteredBookings([])}
            >
              ×
            </button>

            <h4>{filterTitle}</h4>

            <table>
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Created At</th>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Final Rent</th>
                  <th>Products</th>
                  <th>Pickup</th>
                  <th>Return</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map((group, i) => {
                  const { receiptNumber, bookings } = group;
                  const b = bookings[0] || {};

                  return (
                    <tr
  key={i}
  className={b.stage === "cancelled" ? "row-cancelled" : ""}
>
                      <td
  className="receipt-link"
  onClick={() => navigate(`/booking-details/${receiptNumber}`)}
>
  {receiptNumber}
</td>

                      <td>{b.createdAt?.toLocaleDateString() || "-"}</td>
                      <td>{b.userDetails?.name || "-"}</td>
                      <td>{b.userDetails?.contact || "-"}</td>
                      <td>
  {b.userDetails?.finalrent !== undefined
    ? `₹ ${b.userDetails.finalrent}`
    : "-"}
</td>

                      <td>
                        {bookings
                          .map(
                            (item) =>
                              `${item.productCode} × ${item.quantity}`
                          )
                          .join(", ")}
                      </td>
                      <td>{b.pickupDate?.toLocaleDateString() || "-"}</td>
                      <td>{b.returnDate?.toLocaleDateString() || "-"}</td>
                      <td>{b.stage || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =======================
          TOP PRODUCTS
      ======================= */}
      <section className="dashboard-section">
        <header className="section-header">
          <h4>Top Products</h4>
          <p className="section-subtitle">Most booked products</p>
        </header>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Image</th>
                <th>Product</th>
                <th>Code</th>
                <th>Bookings</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <img
                      src={product.imageUrls}
                      alt={product.productName}
                      className="product-thumb"
                    />
                  </td>
                  <td>{product.productName}</td>
                  <td>{product.productCode}</td>
                  <td>{product.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
);

};

export default Dashboard;

