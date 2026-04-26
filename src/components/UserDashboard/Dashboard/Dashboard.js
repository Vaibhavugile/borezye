import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, collectionGroup, doc, setDoc, getDoc,addDoc,serverTimestamp,deleteDoc ,updateDoc,writeBatch,where} from 'firebase/firestore';
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
{/* <button
  className="btn-secondary"
  onClick={fixSuccessfulReceipts}
>
  Fix Successful Receipts
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
     
    </div>
  </div>
);

};

export default Dashboard;

