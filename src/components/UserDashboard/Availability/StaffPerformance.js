import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useUser } from "../../Auth/UserContext";
import { FaUsers, FaMoneyBillWave, FaReceipt } from "react-icons/fa";
import "./StaffPerformance.css";

const StaffPerformance = () => {

  const { userData } = useUser();

  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [customerByReport, setCustomerByReport] = useState([]);
  const [receiptByReport, setReceiptByReport] = useState([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  /* FETCH PAYMENTS */

  useEffect(() => {

    const fetchPayments = async () => {

      if (!userData?.branchCode) return;

      const paymentsRef = collection(
        db,
        `products/${userData.branchCode}/payments`
      );

      const snapshot = await getDocs(paymentsRef);

      const data = snapshot.docs.map(doc => doc.data());

      setPayments(data);

    };

    fetchPayments();

  }, [userData?.branchCode]);



  /* FILTER + REPORT CALCULATION */

  useEffect(() => {

    let filtered = [...payments];

    const now = new Date();

    /* TODAY FILTER */

    if (filter === "today") {

      filtered = payments.filter(p => {

        if (!p.createdAt) return false;

        const d = p.createdAt.toDate();

        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );

      });

    }

    /* MONTH FILTER */

    if (filter === "month") {

      filtered = payments.filter(p => {

        if (!p.createdAt) return false;

        const d = p.createdAt.toDate();

        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );

      });

    }

    /* CUSTOM DATE FILTER */

    if (filter === "custom" && startDate && endDate) {

      const start = new Date(startDate);
      const end = new Date(endDate);

      end.setHours(23,59,59,999);

      filtered = payments.filter(p => {

        if (!p.createdAt) return false;

        const d = p.createdAt.toDate();

        return d >= start && d <= end;

      });

    }

    const customerStats = {};
    const receiptStats = {};

    let revenue = 0;
    let receipts = 0;

    filtered.forEach(data => {

      if (data.bookingStage === "cancelled") return;

      const customerBy = data.customerBy || "Unknown";
      const receiptBy = data.receiptBy || "Unknown";
      const finalRent = Number(data.finalRent || 0);

      revenue += finalRent;
      receipts += 1;

      if (!customerStats[customerBy]) {

        customerStats[customerBy] = {
          name: customerBy,
          receipts: 0,
          revenue: 0
        };

      }

      customerStats[customerBy].receipts += 1;
      customerStats[customerBy].revenue += finalRent;

      if (!receiptStats[receiptBy]) {

        receiptStats[receiptBy] = {
          name: receiptBy,
          receipts: 0
        };

      }

      receiptStats[receiptBy].receipts += 1;

    });

    setCustomerByReport(Object.values(customerStats));
    setReceiptByReport(Object.values(receiptStats));

    setTotalRevenue(revenue);
    setTotalReceipts(receipts);
    setTotalCustomers(Object.keys(customerStats).length);

  }, [payments, filter, startDate, endDate]);



  return (

    <div className="staff-performance-container">

      {/* HEADER */}

      <div className="staff-header">

        <h1>Staff Performance</h1>

        <div className="date-filters">

          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={filter === "today" ? "active" : ""}
            onClick={() => setFilter("today")}
          >
            Today
          </button>

          <button
            className={filter === "month" ? "active" : ""}
            onClick={() => setFilter("month")}
          >
            This Month
          </button>

          <button
            className={filter === "custom" ? "active" : ""}
            onClick={() => setFilter("custom")}
          >
            Custom
          </button>

        </div>

      </div>


      {/* CUSTOM DATE RANGE */}

      {filter === "custom" && (

        <div className="custom-date-range">

          <input
            type="date"
            value={startDate}
            onChange={(e)=>setStartDate(e.target.value)}
          />

          

          <input
            type="date"
            value={endDate}
            onChange={(e)=>setEndDate(e.target.value)}
          />

        </div>

      )}



      {/* KPI CARDS */}

      <div className="staff-kpi-grid">

        <div className="staff-kpi-card kpi-sales">

          <div className="kpi-icon">
            <FaMoneyBillWave />
          </div>

          <span>Total Revenue</span>

          <strong>
            ₹{totalRevenue.toLocaleString()}
          </strong>

        </div>


        <div className="staff-kpi-card kpi-receipts">

          <div className="kpi-icon">
            <FaReceipt />
          </div>

          <span>Total Receipts</span>

          <strong>{totalReceipts}</strong>

        </div>


        <div className="staff-kpi-card kpi-customers">

          <div className="kpi-icon">
            <FaUsers />
          </div>

          <span>Total Staff</span>

          <strong>{totalCustomers}</strong>

        </div>

      </div>



      {/* CUSTOMER BY TABLE */}

      <div className="staff-card">

        <h2 className="staff-section-title">
          Customer By Performance
        </h2>

        <table className="staff-table">

          <thead>
            <tr>
              <th>Rank</th>
              <th>Staff</th>
              <th>Total Customers</th>
              <th>Total Rent Generated</th>
            </tr>
          </thead>

          <tbody>

            {customerByReport
              .sort((a,b)=>b.revenue-a.revenue)
              .map((staff,i)=>(
                
                <tr key={i}>

                  <td className="rank-cell">

{i === 0 && <span className="medal gold">🥇</span>}
{i === 1 && <span className="medal silver">🥈</span>}
{i === 2 && <span className="medal bronze">🥉</span>}

{i > 2 && i + 1}

</td>

                  <td className={i===0 ? "top-staff" : ""}>
                    {staff.name}
                  </td>

                  <td>{staff.receipts}</td>

                  <td className="revenue">
                    ₹{staff.revenue.toLocaleString()}
                  </td>

                </tr>

              ))}

          </tbody>

        </table>

      </div>



      {/* RECEIPT BY TABLE */}

      <div className="staff-card">

        <h2 className="staff-section-title">
          Receipt By Performance
        </h2>

        <table className="staff-table">

          <thead>
            <tr>
              <th>Rank</th>
              <th>Staff</th>
              <th>Receipts Created</th>
            </tr>
          </thead>

          <tbody>

            {receiptByReport
              .sort((a,b)=>b.receipts-a.receipts)
              .map((staff,i)=>(
                
                <tr key={i}>

                        <td className="rank-cell">

{i === 0 && <span className="medal gold">🥇</span>}
{i === 1 && <span className="medal silver">🥈</span>}
{i === 2 && <span className="medal bronze">🥉</span>}

{i > 2 && i + 1}

</td>

                  <td className={i===0 ? "top-staff" : ""}>
                    {staff.name}
                  </td>

                  <td>{staff.receipts}</td>

                </tr>

              ))}

          </tbody>

        </table>

      </div>

    </div>

  );

};

export default StaffPerformance;