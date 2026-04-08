import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import "./AccountsReportPage.css";
import { useUser } from "../../Auth/UserContext";

const AccountPage = () => {

const { userData } = useUser();

const [report,setReport] = useState({
totalRent:0,
totalDeposit:0,
totalAmount:0,
totalCollected:0,
totalBalance:0,
depositReturned:0,
netRent:0
});

const [loading,setLoading] = useState(true);

const [filterType,setFilterType] = useState("all");
const [startDate,setStartDate] = useState("");
const [endDate,setEndDate] = useState("");

const formatCurrency = (value)=>{
return new Intl.NumberFormat("en-IN",{
style:"currency",
currency:"INR"
}).format(value || 0);
};

const fetchReport = async () => {

setLoading(true);

try{

const paymentsRef = collection(
db,
`products/${userData.branchCode}/payments`
);

const paymentsSnap = await getDocs(paymentsRef);

let totalRent = 0;
let totalDeposit = 0;
let totalAmount = 0;
let totalCollected = 0;
let totalBalance = 0;
let depositReturned = 0;

paymentsSnap.forEach((doc)=>{

const data = doc.data();
const createdAt = data.createdAt?.toDate?.();

let include = true;

if(filterType === "today"){

const today = new Date().toDateString();
include = createdAt?.toDateString() === today;

}

if(filterType === "month"){

const now = new Date();

include =
createdAt?.getMonth() === now.getMonth() &&
createdAt?.getFullYear() === now.getFullYear();

}

if(filterType === "custom" && startDate && endDate){

const start = new Date(startDate);
const end = new Date(endDate);

include = createdAt >= start && createdAt <= end;

}

if(!include) return;

totalRent += data.finalRent || 0;
totalDeposit += data.finalDeposit || 0;
totalAmount += data.totalAmount || 0;
totalCollected += data.amountPaid || 0;
totalBalance += data.balance || 0;
depositReturned += data.depositReturned || 0;

});

setReport({
totalRent,
totalDeposit,
totalAmount,
totalCollected,
totalBalance,
depositReturned,
netRent: totalRent
});

}catch(error){
console.error("Report error:",error);
}

setLoading(false);

};

useEffect(()=>{

if(userData?.branchCode){
fetchReport();
}

},[userData?.branchCode]);

if(loading){
return <div className="report-loading">Loading report...</div>;
}

return (

<div className="account-report-page">

<h2 className="report-page-title">
Account Report
</h2>

{/* FILTER BAR */}

<div className="report-filters">

<select
value={filterType}
onChange={(e)=>setFilterType(e.target.value)}
>

<option value="all">All Time</option>
<option value="today">Today</option>
<option value="month">This Month</option>
<option value="custom">Custom Range</option>

</select>

{filterType === "custom" && (

<>

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

</>

)}

<button onClick={fetchReport}>
Apply
</button>

</div>

{/* REPORT GRID */}

<div className="report-grid">

<div className="report-card rent">
<h4>Total Rent</h4>
<p>{formatCurrency(report.totalRent)}</p>
</div>

<div className="report-card deposit">
<h4>Total Deposit</h4>
<p>{formatCurrency(report.totalDeposit)}</p>
</div>

<div className="report-card total">
<h4>Total Amount</h4>
<p>{formatCurrency(report.totalAmount)}</p>
</div>

<div className="report-card collected">
<h4>Amount Collected</h4>
<p>{formatCurrency(report.totalCollected)}</p>
</div>

<div className="report-card balance">
<h4>Pending Balance</h4>
<p>{formatCurrency(report.totalBalance)}</p>
</div>

<div className="report-card returned">
<h4>Deposit Returned</h4>
<p>{formatCurrency(report.depositReturned)}</p>
</div>

<div className="report-card net">
<h4>Net Rent Earned</h4>
<p>{formatCurrency(report.netRent)}</p>
</div>

</div>

</div>

);

};

export default AccountPage;