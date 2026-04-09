import React, { useEffect, useState } from "react";
import {
collectionGroup,
getDocs,
getDoc,
query,
where
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";

const DailyCashflow = ({ branchCode, formatCurrency }) => {

const [selectedDate,setSelectedDate] = useState(
new Date().toISOString().split("T")[0]
);

const [rows,setRows] = useState([]);

const fetchCashflow = async () => {

try{

const start = new Date(selectedDate);
start.setHours(0,0,0,0);

const end = new Date(start);
end.setDate(end.getDate()+1);

const q = query(
collectionGroup(db,"transactions"),
where("createdAt",">=",start),
where("createdAt","<",end)
);

const snap = await getDocs(q);

const paymentCache = {};
const rentTracker = {};

let tableRows = [];

for(const docSnap of snap.docs){

const tx = docSnap.data();

/* branch filter */

if(!docSnap.ref.path.includes(`products/${branchCode}/payments`)){
continue;
}

const paymentRef = docSnap.ref.parent.parent;
const receipt = paymentRef.id;

/* load payment */

let payment;

if(paymentCache[receipt]){
payment = paymentCache[receipt];
}else{

const paymentSnap = await getDoc(paymentRef);

if(!paymentSnap.exists()) continue;

payment = paymentSnap.data();

paymentCache[receipt] = payment;

}

/* ignore cancelled */

if(payment.bookingStage === "cancelled") continue;

const rent = Number(payment.finalRent || 0);

if(!rentTracker[receipt]){
rentTracker[receipt] = 0;
}

const amount = Number(tx.amount || 0);

let rentValue = 0;
let depositValue = 0;

/* deposit refund */

if(tx.type === "depositReturn"){

depositValue = -amount;

}else{

const rentRemaining = rent - rentTracker[receipt];

const rentPart = Math.min(amount,rentRemaining);

rentValue = rentPart;

rentTracker[receipt] += rentPart;

depositValue = amount - rentPart;

}

/* payment mode */

const mode = (tx.mode || "").toLowerCase();

/* rent columns */

let rentCash = 0;
let rentUpi = 0;
let rentCard = 0;

/* deposit columns */

let depCash = 0;
let depUpi = 0;
let depCard = 0;

if(rentValue > 0){

if(mode.includes("cash")) rentCash = rentValue;
if(mode.includes("upi")) rentUpi = rentValue;
if(mode.includes("card")) rentCard = rentValue;

}

if(depositValue !== 0){

if(mode.includes("cash")) depCash = depositValue;
if(mode.includes("upi")) depUpi = depositValue;
if(mode.includes("card")) depCard = depositValue;

}

tableRows.push({

date: tx.createdAt?.toDate?.()?.toLocaleDateString(),

receipt,
client: payment.clientName,

rentCash,
rentUpi,
rentCard,

depCash,
depUpi,
depCard

});

}

setRows(tableRows);

}catch(e){

console.error("Cashflow error",e);

}

};

useEffect(()=>{

if(branchCode){
fetchCashflow();
}

},[branchCode,selectedDate]);

return(

<div className="cashflow-container">

<div className="cashflow-header">

<h2>Daily Cashflow Ledger</h2>

<input
type="date"
value={selectedDate}
onChange={(e)=>setSelectedDate(e.target.value)}
/>

</div>

<table className="cashflow-table">

<thead>

<tr>

<th rowSpan="2">Date</th>
<th rowSpan="2">Receipt</th>
<th rowSpan="2">Client</th>

<th colSpan="3" className="rent-head">Rent</th>

<th colSpan="3" className="deposit-head">Deposit</th>

</tr>

<tr>

<th>Cash</th>
<th>UPI</th>
<th>Card</th>

<th>Cash</th>
<th>UPI</th>
<th>Card</th>

</tr>

</thead>

<tbody>

{rows.map((r,i)=>(

<tr key={i}>

<td>{r.date}</td>
<td>{r.receipt}</td>
<td>{r.client}</td>

<td>{r.rentCash ? formatCurrency(r.rentCash) : ""}</td>
<td>{r.rentUpi ? formatCurrency(r.rentUpi) : ""}</td>
<td>{r.rentCard ? formatCurrency(r.rentCard) : ""}</td>

<td className={r.depCash<0 ? "negative":""}>
{r.depCash ? formatCurrency(r.depCash) : ""}
</td>

<td className={r.depUpi<0 ? "negative":""}>
{r.depUpi ? formatCurrency(r.depUpi) : ""}
</td>

<td className={r.depCard<0 ? "negative":""}>
{r.depCard ? formatCurrency(r.depCard) : ""}
</td>

</tr>

))}

</tbody>

</table>

</div>

);

};

export default DailyCashflow;