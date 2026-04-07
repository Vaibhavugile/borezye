import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, collectionGroup, doc, setDoc, getDoc,addDoc,serverTimestamp,deleteDoc  } from 'firebase/firestore';
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

  const [monthlyPickupPending, setMonthlyPickupPending] = useState(0);
  const [monthlyReturnPending, setMonthlyReturnPending] = useState(0);
  const [monthlySuccessful, setMonthlySuccessful] = useState(0);
  const [monthlyTotalBookings, setMonthlyTotalBookings] = useState(0);

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

      const transactionsRef = collection(
        db,
        `products/${branchCode}/payments/${receiptNumber}/transactions`
      );

      const existingTransactions = await getDocs(transactionsRef);

      // skip if transactions already exist
      if (!existingTransactions.empty) {
        console.log(`Transactions already exist for ${receiptNumber}`);
        continue;
      }

      const amount = Number(paymentData.amountPaid || 0);

      if (amount <= 0) continue;

      await addDoc(transactionsRef, {

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
{/* <button onClick={migrateFirstPaymentTransactions}>
Generate Previous Payments
</button> */}
<button onClick={cleanupDuplicateTransactions}>
Generate Previous Payments
</button>
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
                    <tr key={i}>
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

