import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import "./AccountsReportPage.css";
import { useUser } from "../../Auth/UserContext";
import DailyCashflow from "./DailyCashflow";
const AccountPage = () => {

    const { userData } = useUser();

    const [report, setReport] = useState({
        totalRent: 0,
        rentCollected: 0,
        rentPending: 0,

        totalDeposit: 0,
        depositCollected: 0,
        depositPending: 0,
        depositReturned: 0,
        depositWithYou:0,
depositReturnPending:0,

        totalAmount: 0,
        amountCollected: 0,
        balance: 0
    });

    const [rows, setRows] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);

    const [loading, setLoading] = useState(true);

    const [filterType, setFilterType] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR"
        }).format(value || 0);
    };

    const fetchReport = async () => {

        setLoading(true);

        try {

            const paymentsRef = collection(
                db,
                `products/${userData.branchCode}/payments`
            );

            const paymentsSnap = await getDocs(paymentsRef);

            let summary = {

                totalRent: 0,
                rentCollected: 0,
                rentPending: 0,

                totalDeposit: 0,
                depositCollected: 0,
                depositPending: 0,
                depositReturned: 0,
                depositWithYou:0,
depositReturnPending:0,

                totalAmount: 0,
                amountCollected: 0,
                balance: 0

            };

            let tempRows = [];

            paymentsSnap.forEach((doc) => {

                const data = doc.data();

                // Ignore cancelled bookings
                if (data.bookingStage === "cancelled") return;

                const createdAt = data.createdAt?.toDate?.();

                let include = true;

                if (filterType === "today") {
                    const today = new Date().toDateString();
                    include = createdAt?.toDateString() === today;
                }

                if (filterType === "month") {
                    const now = new Date();
                    include =
                        createdAt?.getMonth() === now.getMonth() &&
                        createdAt?.getFullYear() === now.getFullYear();
                }

                if (filterType === "custom" && startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    include = createdAt >= start && createdAt <= end;
                }

                if (!include) return;

                summary.totalRent += Number(data.finalRent || 0);
                summary.rentCollected += Number(data.rentCollected || 0);
                summary.rentPending += Number(data.rentPending || 0);

                summary.totalDeposit += Number(data.finalDeposit || 0);
                summary.depositCollected += Number(data.depositCollected || 0);
                summary.depositPending += Number(data.depositPending || 0);
                summary.depositReturned += Number(data.depositReturned || 0);
summary.depositWithYou += Number(data.depositWithYou || 0);

// NEW LOGIC
if(
data.bookingStage === "return" &&
Number(data.depositWithYou || 0) > 0
){
summary.depositReturnPending += Number(data.depositWithYou || 0);
}

                summary.totalAmount += Number(data.totalAmount || 0);
                summary.amountCollected += Number(data.amountPaid || 0);
                summary.balance += Number(data.balance || 0);

                if (data.bookingStage !== "cancelled") {

                    tempRows.push({
                        id: doc.id,
                        ...data
                    });

                }

            });

            setReport(summary);
            setRows(tempRows);

        } catch (error) {
            console.error("Report error:", error);
        }

        setLoading(false);

    };

    useEffect(() => {

        if (userData?.branchCode) {
            fetchReport();
        }

    }, [userData?.branchCode]);

    const openReport = (type) => {
        setSelectedReport(type);
    };

    if (loading) {
        return <div className="report-loading">Loading report...</div>;
    }

    return (

        <div className="account-report-page">

            <h2 className="report-page-title">
                Financial Report
            </h2>

            {/* FILTER BAR */}

            <div className="report-filters">

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
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
                            onChange={(e) => setStartDate(e.target.value)}
                        />

                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />

                    </>

                )}

                <button onClick={fetchReport}>
                    Apply
                </button>

            </div>

            {/* RENT */}

            <h3 className="report-section-title">Rent Overview</h3>

            <div className="report-grid">

                <div className="report-card">
                    <h4>Total Rent</h4>
                    <p>{formatCurrency(report.totalRent)}</p>
                </div>

                <div className="report-card collected"
                    onClick={() => openReport("rentCollected")}>
                    <h4>Rent Collected</h4>
                    <p>{formatCurrency(report.rentCollected)}</p>
                </div>

                <div className="report-card balance"
                    onClick={() => openReport("rentPending")}>
                    <h4>Rent Pending</h4>
                    <p>{formatCurrency(report.rentPending)}</p>
                </div>

            </div>

            {/* DEPOSIT */}

            <h3 className="report-section-title">Deposit Overview</h3>

            <div className="report-grid">

                <div className="report-card">
                    <h4>Total Deposit</h4>
                    <p>{formatCurrency(report.totalDeposit)}</p>
                </div>

                <div className="report-card collected"
                    onClick={() => openReport("depositCollected")}>
                    <h4>Deposit Collected</h4>
                    <p>{formatCurrency(report.depositCollected)}</p>
                </div>

                <div className="report-card balance"
                    onClick={() => openReport("depositPending")}>
                    <h4>Deposit Pending</h4>
                    <p>{formatCurrency(report.depositPending)}</p>
                </div>

                <div className="report-card returned"
                    onClick={() => openReport("depositReturned")}>
                    <h4>Deposit Returned</h4>
                    <p>{formatCurrency(report.depositReturned)}</p>
                </div>

                <div className="report-card highlight"
                    onClick={() => openReport("depositWithYou")}>
                    <h4>Deposit With You</h4>
                    <p>{formatCurrency(report.depositWithYou)}</p>
                </div>
                <div
className="report-card pending-refund"
onClick={()=>openReport("depositReturnPending")}
>

<h4>Deposit Return Pending</h4>
<p>{formatCurrency(report.depositReturnPending)}</p>

</div>

            </div>

            {/* TOTAL */}

            <h3 className="report-section-title">Overall Finance</h3>

            <div className="report-grid">

                <div className="report-card total">
                    <h4>Total Amount</h4>
                    <p>{formatCurrency(report.totalAmount)}</p>
                </div>

                <div className="report-card collected">
                    <h4>Total Collected</h4>
                    <p>{formatCurrency(report.amountCollected)}</p>
                </div>

                <div className="report-card balance">
                    <h4>Total Balance</h4>
                    <p>{formatCurrency(report.balance)}</p>
                </div>

            </div>

            {/* DETAILED TABLE */}

            {selectedReport && (

                <div className="report-table-section">

                    <h3>Detailed Receipts</h3>

                    <table className="report-table">

                        <thead>
                            <tr>
                                <th>Receipt</th>
                                <th>Client</th>
                                <th>Rent</th>
                                <th>Deposit</th>
                                <th>Rent Collected</th>
                                <th>Deposit Collected</th>
                                <th>Deposit Returned</th>
                                <th>Balance</th>
                                <th>Stage</th>
                            </tr>
                        </thead>

                        <tbody>

                            {rows
                                .filter((row) => {

                                    if (selectedReport === "rentCollected")
                                        return row.rentCollected > 0;

                                    if (selectedReport === "rentPending")
                                        return row.rentPending > 0;

                                    if (selectedReport === "depositCollected")
                                        return row.depositCollected > 0;

                                    if (selectedReport === "depositPending")
                                        return row.depositPending > 0;

                                    if (selectedReport === "depositReturned")
                                        return row.depositReturned > 0;

                                    if (selectedReport === "depositWithYou")
                                        return row.depositWithYou > 0;
                                    if(selectedReport === "depositReturnPending")
return row.bookingStage === "return" && row.depositWithYou > 0;

                                    return true;

                                })
                                .map((row) => (
                                    <tr key={row.id}>

                                        <td>{row.receiptNumber}</td>
                                        <td>{row.clientName}</td>

                                        <td>{formatCurrency(row.finalRent)}</td>
                                        <td>{formatCurrency(row.finalDeposit)}</td>

                                        <td>{formatCurrency(row.rentCollected)}</td>
                                        <td>{formatCurrency(row.depositCollected)}</td>

                                        <td>{formatCurrency(row.depositReturned)}</td>

                                        <td>{formatCurrency(row.balance)}</td>

                                        <td>{row.bookingStage}</td>

                                    </tr>
                                ))}

                        </tbody>

                    </table>

                </div>

            )}
<DailyCashflow
branchCode={userData.branchCode}
formatCurrency={formatCurrency}
/>
        </div>

    );

};

export default AccountPage;