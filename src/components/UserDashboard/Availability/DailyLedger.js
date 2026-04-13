import React, { useEffect, useState } from "react";
import "./DailyLedger.css";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import FinanceSummary from "./FinanceSummary";

const DailyLedger = ({ branchCode }) => {

  const [rows, setRows] = useState([]);
  const [modes, setModes] = useState([]);

  const [totals, setTotals] = useState({
    rent:{},
    depositCollected:{},
    depositReturned:{},
    depositNet:{}
  });

  /* DATE RANGE */

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const formatDateInput = (date) => {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  const fetchLedger = async () => {

    const start = new Date(startDate);
    start.setHours(0,0,0,0);

    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const ledgerRef = collection(
      db,
      `products/${branchCode}/ledger`
    );

    const q = query(
      ledgerRef,
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    );

    const snapshot = await getDocs(q);

    const rows = [];
    const modesSet = new Set();

    const rentTotals = {};
    const depositCollectedTotals = {};
    const depositReturnedTotals = {};
    const depositNetTotals = {};

    snapshot.forEach(doc => {

      const data = doc.data();
      const mode = (data.mode || "").toLowerCase();
      const amount = Number(data.amount || 0);

      modesSet.add(mode);

      const row = {
        id: doc.id,
        createdAt: data.createdAt,
        receiptNumber: data.receiptNumber,
        customerName: data.customerName,
        createdBy: data.createdBy,
        type: data.type,
        rent: {},
        deposit: {}
      };

      /* RENT */

      if(data.type === "rentPayment"){

        row.rent[mode] = amount;
        rentTotals[mode] = (rentTotals[mode] || 0) + amount;

      }

      /* DEPOSIT COLLECTED */

      if(data.type === "depositPayment"){

        row.deposit[mode] = amount;

        depositCollectedTotals[mode] =
          (depositCollectedTotals[mode] || 0) + amount;

        depositNetTotals[mode] =
          (depositNetTotals[mode] || 0) + amount;

      }

      /* DEPOSIT RETURN */

      if(data.type === "depositReturn"){

        row.deposit[mode] = -amount;

        depositReturnedTotals[mode] =
          (depositReturnedTotals[mode] || 0) - amount;

        depositNetTotals[mode] =
          (depositNetTotals[mode] || 0) - amount;

      }

      rows.push(row);

    });

    /* Ensure deposit returns appear after deposits */

    rows.sort((a,b)=>{
      if(a.type === "depositReturn" && b.type !== "depositReturn") return 1
      if(a.type !== "depositReturn" && b.type === "depositReturn") return -1
      return 0
    });

    setModes(Array.from(modesSet));
    setRows(rows);

    setTotals({
      rent: rentTotals,
      depositCollected: depositCollectedTotals,
      depositReturned: depositReturnedTotals,
      depositNet: depositNetTotals
    });

  };

  useEffect(()=>{
    if(branchCode) fetchLedger();
  },[startDate,endDate,branchCode]);

  return (

  <div className="ledger-container">

    <div className="ledger-header">

      <h2>Account Ledger</h2>

      <div className="ledger-date-filter">

        <input
          type="date"
          value={formatDateInput(startDate)}
          onChange={(e)=>setStartDate(new Date(e.target.value))}
        />

        <span className="date-separator">to</span>

        <input
          type="date"
          value={formatDateInput(endDate)}
          onChange={(e)=>setEndDate(new Date(e.target.value))}
        />

      </div>

    </div>
      <FinanceSummary
    branchCode={branchCode}
    startDate={startDate}
    endDate={endDate}
  />

    <div className="ledger-table-wrapper">

    <table className="ledger-table">

      <thead>

        <tr>

          <th rowSpan="2">Date</th>
          <th rowSpan="2">Receipt</th>
          <th rowSpan="2">Client</th>
          <th rowSpan="2">Created By</th>

          <th colSpan={modes.length}>Rent</th>
          <th colSpan={modes.length}>Deposit</th>

        </tr>

        <tr>

          {modes.map(mode=>(
            <th key={"rent-"+mode}>
              {mode.toUpperCase()}
            </th>
          ))}

          {modes.map(mode=>(
            <th key={"deposit-"+mode}>
              {mode.toUpperCase()}
            </th>
          ))}

        </tr>

      </thead>

      <tbody>

        {rows.map(row=>{

          const date = row.createdAt?.seconds
          ? new Date(row.createdAt.seconds*1000)
          : new Date(row.createdAt);

          return(

          <tr key={row.id}>

            <td>{date.toLocaleDateString()}</td>
            <td>{row.receiptNumber}</td>
            <td>{row.customerName}</td>
            <td>{row.createdBy}</td>

            {modes.map(mode=>(
              <td key={"rent-"+mode}>
                {row.rent[mode] || ""}
              </td>
            ))}

            {modes.map(mode=>(

              <td
                key={"deposit-"+mode}
                className={row.deposit[mode] < 0 ? "negative" : ""}
              >
                {row.deposit[mode] || ""}
              </td>

            ))}

          </tr>

          )

        })}

        {/* RENT TOTAL */}

        <tr className="total-row">

          <td colSpan="4"><strong>Rent Total</strong></td>

          {modes.map(mode=>(
            <td key={"rent-total-"+mode}>
              <strong>{totals.rent?.[mode] || ""}</strong>
            </td>
          ))}

          {modes.map(()=>(
            <td></td>
          ))}

        </tr>

        {/* DEPOSIT COLLECTED */}

        <tr className="total-row">

          <td colSpan="4"><strong>Deposit Collected</strong></td>

          {modes.map(()=>(
            <td></td>
          ))}

          {modes.map(mode=>(
            <td key={"deposit-collected-"+mode}>
              <strong>{totals.depositCollected?.[mode] || ""}</strong>
            </td>
          ))}

        </tr>

        {/* DEPOSIT RETURNED */}

        <tr className="total-row">

          <td colSpan="4"><strong>Deposit Returned</strong></td>

          {modes.map(()=>(
            <td></td>
          ))}

          {modes.map(mode=>(
            <td
              key={"deposit-return-"+mode}
              className="negative"
            >
              <strong>{totals.depositReturned?.[mode] || ""}</strong>
            </td>
          ))}

        </tr>

        {/* TOTAL DEPOSIT */}

        <tr className="total-row">

          <td colSpan="4"><strong>Total Deposit</strong></td>

          {modes.map(()=>(
            <td></td>
          ))}

          {modes.map(mode=>(
            <td key={"deposit-net-"+mode}>
              <strong>{totals.depositNet?.[mode] || ""}</strong>
            </td>
          ))}

        </tr>

      </tbody>

    </table>

    </div>

  </div>

  );

};

export default DailyLedger;