import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import "./FinanceSummary.css";
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCreditCard,
  FiAlertCircle
} from "react-icons/fi";
const FinanceSummary = ({ branchCode, startDate, endDate }) => {

  const [summary, setSummary] = useState({
    totalRent:0,
    totalDeposit:0,
    rentCollected:0,
    depositCollected:0,
    depositReturned:0,
    rentPending:0,
    depositPending:0,
    depositWithYou:0,
    depositRefundPending:0
  });

  const [showModal,setShowModal] = useState(false);
  const [modalType,setModalType] = useState(null);
  const [pendingList,setPendingList] = useState([]);


  /* =========================
     FETCH SUMMARY
  ========================= */

  const fetchSummary = async () => {

    const start = new Date(startDate);
    start.setHours(0,0,0,0);

    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const paymentsRef = collection(
      db,
      `products/${branchCode}/payments`
    );

    /* TOTAL RENT + DEPOSIT */

    const paymentsQuery = query(
      paymentsRef,
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    );

    const paymentsSnapshot = await getDocs(paymentsQuery);

    let rent = 0;
    let deposit = 0;

    paymentsSnapshot.forEach(doc => {

  const data = doc.data();

  if(data.bookingStage === "cancelled") return;

  rent += Number(data.finalRent || 0);
  deposit += Number(data.finalDeposit || 0);

});


    /* LEDGER COLLECTION */

    const ledgerRef = collection(
      db,
      `products/${branchCode}/ledger`
    );

    const ledgerQuery = query(
      ledgerRef,
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    );

    const ledgerSnapshot = await getDocs(ledgerQuery);

    let rentCollected = 0;
    let depositCollected = 0;
    let depositReturned = 0;

    ledgerSnapshot.forEach(doc => {

      const data = doc.data();
      const amount = Number(data.amount || 0);

      if(data.type === "rentPayment"){
        rentCollected += amount;
      }

      if(data.type === "depositPayment"){
        depositCollected += amount;
      }

      if(data.type === "depositReturn"){
        depositReturned += amount;
      }

    });


    /* PENDING SUMMARY */

    const pendingQuery = query(
      paymentsRef,
      where("pickupDate", ">=", start),
      where("pickupDate", "<=", end)
    );

    const pendingSnapshot = await getDocs(pendingQuery);

    let rentPending = 0;
    let depositPending = 0;

   pendingSnapshot.forEach(doc => {

  const data = doc.data();

  if(data.bookingStage === "cancelled") return;

  rentPending += Number(data.rentPending || 0);
  depositPending += Number(data.depositPending || 0);

});


    /* GLOBAL DEPOSIT STATUS (ALL TIME) */

    const allPaymentsSnapshot = await getDocs(paymentsRef);

    let depositWithYou = 0;
    let depositRefundPending = 0;

    allPaymentsSnapshot.forEach(doc => {

  const data = doc.data();

  if(data.bookingStage === "cancelled") return;

  const amount = Number(data.depositWithYou || 0);

  if(amount > 0){

        depositWithYou += amount;

        if(data.bookingStage === "return"){
          depositRefundPending += amount;
        }

      }

    });


    setSummary({
      totalRent: rent,
      totalDeposit: deposit,
      rentCollected,
      depositCollected,
      depositReturned,
      rentPending,
      depositPending,
      depositWithYou,
      depositRefundPending
    });

  };


  useEffect(()=>{
    if(branchCode && startDate && endDate){
      fetchSummary();
    }
  },[branchCode,startDate,endDate]);


  /* =========================
     OPEN MODALS
  ========================= */

  const openPendingModal = async(type)=>{

    const start = new Date(startDate);
    start.setHours(0,0,0,0);

    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const paymentsRef = collection(
      db,
      `products/${branchCode}/payments`
    );

    const q = query(
      paymentsRef,
      where("pickupDate", ">=", start),
      where("pickupDate", "<=", end)
    );

    const snapshot = await getDocs(q);

    const list = [];

    snapshot.forEach(doc=>{

      const data = doc.data();
      if(data.bookingStage === "cancelled") return;

      if(type === "rent" && Number(data.rentPending) > 0){

        list.push({
          id:doc.id,
          receipt:data.receiptNumber,
          name:data.clientName,
          pickupDate:data.pickupDate,
          returnDate:data.returnDate,
          stage:data.bookingStage,
          finalRent:data.finalRent,
          finalDeposit:data.finalDeposit,
          amount:data.rentPending
        });

      }

      if(type === "deposit" && Number(data.depositPending) > 0){

        list.push({
          id:doc.id,
          receipt:data.receiptNumber,
          name:data.clientName,
          pickupDate:data.pickupDate,
          returnDate:data.returnDate,
          stage:data.bookingStage,
          finalRent:data.finalRent,
          finalDeposit:data.finalDeposit,
          amount:data.depositPending
        });

      }

    });

    list.sort((a,b)=>b.amount-a.amount);

    setPendingList(list);
    setModalType(type);
    setShowModal(true);

  };


  const openDepositModal = async(type)=>{

    const paymentsRef = collection(
      db,
      `products/${branchCode}/payments`
    );

    const snapshot = await getDocs(paymentsRef);

    const list = [];

    snapshot.forEach(doc=>{

      const data = doc.data();
      if(data.bookingStage === "cancelled") return;
      const amount = Number(data.depositWithYou || 0);

      if(type === "withYou" && amount > 0){

        list.push({
          id:doc.id,
          receipt:data.receiptNumber,
          name:data.clientName,
          pickupDate:data.pickupDate,
          returnDate:data.returnDate,
          stage:data.bookingStage,
          finalRent:data.finalRent,
          finalDeposit:data.finalDeposit,
          amount
        });

      }

      if(type === "refundPending" && amount > 0 && data.bookingStage === "return"){

        list.push({
          id:doc.id,
          receipt:data.receiptNumber,
          name:data.clientName,
          pickupDate:data.pickupDate,
          returnDate:data.returnDate,
          stage:data.bookingStage,
          finalRent:data.finalRent,
          finalDeposit:data.finalDeposit,
          amount
        });

      }

    });

    setPendingList(list);
    setModalType(type);
    setShowModal(true);

  };


  return(

    <div className="finance-summary">

     {/* ROW 1 */}

<div className="summary-card rent">

  <div className="card-top">
    <div className="card-icon">
      <FiDollarSign/>
    </div>
  </div>

  <span>Total Sale</span>
  <h2>₹{summary.totalRent.toLocaleString()}</h2>

</div>


<div className="summary-card rent">

  <div className="card-top">
    <div className="card-icon">
      <FiTrendingUp/>
    </div>
  </div>

  <span>Rent Collected</span>
  <h2>₹{summary.rentCollected.toLocaleString()}</h2>

</div>


<div
  className="summary-card pending clickable"
  onClick={()=>openPendingModal("rent")}
>

  <div className="card-top">
    <div className="card-icon">
      <FiAlertCircle/>
    </div>
  </div>

  <span>Rent Pending</span>
  <h2>₹{summary.rentPending.toLocaleString()}</h2>

</div>



{/* ROW 2 */}

<div className="summary-card deposit">

  <div className="card-top">
    <div className="card-icon">
      <FiCreditCard/>
    </div>
  </div>

  <span>Total Deposit</span>
  <h2>₹{summary.totalDeposit.toLocaleString()}</h2>

</div>


<div className="summary-card deposit">

  <div className="card-top">
    <div className="card-icon">
      <FiTrendingUp/>
    </div>
  </div>

  <span>Deposit Collected</span>
  <h2>₹{summary.depositCollected.toLocaleString()}</h2>

</div>


<div
  className="summary-card pending clickable"
  onClick={()=>openPendingModal("deposit")}
>

  <div className="card-top">
    <div className="card-icon">
      <FiAlertCircle/>
    </div>
  </div>

  <span>Deposit Pending</span>
  <h2>₹{summary.depositPending.toLocaleString()}</h2>

</div>



{/* ROW 3 */}

<div className="summary-card returned">

  <div className="card-top">
    <div className="card-icon">
      <FiTrendingDown/>
    </div>
  </div>

  <span>Deposit Returned</span>
  <h2>₹{summary.depositReturned.toLocaleString()}</h2>

</div>


<div
  className="summary-card deposit clickable"
  onClick={()=>openDepositModal("withYou")}
>

  <div className="card-top">
    <div className="card-icon">
      <FiCreditCard/>
    </div>
  </div>

  <span>Deposit With Us</span>
  <h2>₹{summary.depositWithYou.toLocaleString()}</h2>

</div>


<div
  className="summary-card pending clickable"
  onClick={()=>openDepositModal("refundPending")}
>

  <div className="card-top">
    <div className="card-icon">
      <FiAlertCircle/>
    </div>
  </div>

  <span>Deposit Refund Pending</span>
  <h2>₹{summary.depositRefundPending.toLocaleString()}</h2>

</div>

      {showModal && (

      <div className="pending-modal-overlay">

        <div className="pending-modal">

          <div className="pending-modal-header">

            <h3>
              {
                modalType === "rent"
                ? "Rent Pending Customers"
                : modalType === "deposit"
                ? "Deposit Pending Customers"
                : modalType === "withYou"
                ? "Deposit With You"
                : "Deposit Refund Pending"
              }
            </h3>

            <button onClick={()=>setShowModal(false)}>✕</button>

          </div>

          <table className="pending-table">

            <thead>
              <tr>
                <th>Receipt</th>
                <th>Name</th>
                <th>Pickup</th>
                <th>Return</th>
                <th>Stage</th>
                <th>Final Rent</th>
                <th>Final Deposit</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>

              {pendingList.map(item=>{

                const pickup = item.pickupDate?.seconds
                  ? new Date(item.pickupDate.seconds * 1000)
                  : new Date(item.pickupDate);

                const returnDate = item.returnDate?.seconds
                  ? new Date(item.returnDate.seconds * 1000)
                  : new Date(item.returnDate);

                return(

                <tr key={item.id}>

                  <td>{item.receipt}</td>
                  <td>{item.name}</td>
                  <td>{pickup.toLocaleDateString()}</td>
                  <td>{returnDate.toLocaleDateString()}</td>
                  <td>{item.stage}</td>
                  <td>₹{item.finalRent}</td>
                  <td>₹{item.finalDeposit}</td>
                  <td>₹{item.amount}</td>

                </tr>

                )

              })}

            </tbody>

          </table>

        </div>

      </div>

      )}

    </div>

  );

};

export default FinanceSummary;