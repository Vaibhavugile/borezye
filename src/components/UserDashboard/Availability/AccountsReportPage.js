import React, { useEffect, useState } from 'react';
import { db } from '../../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { useUser } from '../../Auth/UserContext';
import {  useNavigate } from 'react-router-dom';
import backIcon from '../../../assets/arrowiosback_111116.png';

import './AccountsReportPage.css';

const AccountPage = () => {
    const { userData } = useUser();
    const [loading, setLoading] = useState(false);
    const [accountSummary, setAccountSummary] = useState({});
    const [totalRent, setTotalRent] = useState(0);
    const [totalDeposit, setTotalDeposit] = useState(0);
    const [selectedDate, setSelectedDate] = useState('');
    const [paymentsByDate, setPaymentsByDate] = useState({});
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [monthlySummary, setMonthlySummary] = useState({ rent: 0, deposit: 0 });
    const navigate = useNavigate(); // Initialize navigate


   const calculateRentAndDepositBreakdown = (booking) => {
    const rentDue = booking.userDetails?.finalrent || 0;
    const depositDue = booking.userDetails?.finaldeposite || 0;

    const firstPayment = booking.userDetails?.amountpaid || 0;
    const secondPayment = booking.userDetails?.secondpaymentamount || 0;
    const secondPaymentDate = booking.userDetails?.secondpaymentdate;

    const firstPaymentDate = booking.createdAt;
    const stageUpdatedAt = booking.userDetails?.stageUpdatedAt;
    const rentPaid1 = Math.min(firstPayment, rentDue);
    const depositPaid1 = Math.max(0, firstPayment - rentDue);

    const rentRemaining = rentDue - rentPaid1;
    const depositRemaining = depositDue - depositPaid1;
    const receiptNumber1 = booking.receiptNumber || '-';
    const rentPaid2 = Math.min(secondPayment, rentRemaining);
    const depositPaid2 = Math.max(0, secondPayment - rentRemaining);

    const payments = [];

    if (firstPaymentDate) {
        payments.push({
            date: firstPaymentDate,
            rent: rentPaid1,
            deposit: depositPaid1,
            receiptNumber: receiptNumber1,
            paymentType: 'First Payment',
        });
    }

    if (secondPaymentDate) {
        payments.push({
            date: secondPaymentDate,
            rent: rentPaid2,
            deposit: depositPaid2,
            receiptNumber: booking.receiptNumber || '-',
            paymentType: 'Second Payment',
        });
    }

    if (stageUpdatedAt) {
        payments.push({
            date: stageUpdatedAt,
            rent: 0,
            deposit: -depositDue,
            receiptNumber: booking.receiptNumber || '-',
            paymentType: 'Deposit Refund',
        });
    }

    // ✅ Sort by actual datetime before returning
    return payments.sort((a, b) => new Date(a.date) - new Date(b.date));
};


const calculateDailyAccountSummary = (bookings) => {
    let rentMonthTotal = 0;
    let depositMonthTotal = 0;

    const allPaymentsFlat = [];

    bookings.forEach((booking) => {
        const breakdowns = calculateRentAndDepositBreakdown(booking);
        breakdowns.forEach(({ date, rent, deposit, receiptNumber, paymentType }) => {
            if (!date) return;

            allPaymentsFlat.push({
                datetime: date,
                dateOnly: date.split('T')[0],
                rent,
                deposit,
                receiptNumber,
                paymentType,
            });

            // Monthly totals
            if (isInCurrentMonth(date)) {
                rentMonthTotal += rent;
                depositMonthTotal += deposit;
            }
        });
    });

    // Sort all payments by full datetime descending
    allPaymentsFlat.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    // Now group them by date
    const paymentsByDate = {};
    const summary = {};

    allPaymentsFlat.forEach(({ dateOnly, rent, deposit, ...rest }) => {
        if (!paymentsByDate[dateOnly]) paymentsByDate[dateOnly] = [];
        paymentsByDate[dateOnly].push({ rent, deposit, ...rest });

        if (!summary[dateOnly]) summary[dateOnly] = { rent: 0, deposit: 0 };
        summary[dateOnly].rent += rent;
        summary[dateOnly].deposit += deposit;
    });

    setMonthlySummary({ rent: rentMonthTotal, deposit: depositMonthTotal });
    setPaymentsByDate(paymentsByDate);

    return summary;
};




    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            try {
                const productsRef = collection(db, `products/${userData.branchCode}/products`);
                const productDocs = await getDocs(productsRef);

                const bookingsPromises = productDocs.docs.map(async (productDoc) => {
                    const bookingsRef = collection(
                        db,
                        `products/${userData.branchCode}/products/${productDoc.id}/bookings`
                    );
                    const bookingDocs = await getDocs(bookingsRef);

                    return bookingDocs.docs.map((doc) => {
                        const data = doc.data();

                        const createdAt =
                            data.createdAt instanceof Date
                                ? data.createdAt.toISOString()
                                : data.createdAt?.toDate?.()?.toISOString() ?? '';

                        const secondPaymentDate =
                            data.secondpaymentdate instanceof Date
                                ? data.secondpaymentdate.toISOString()
                                : data.secondpaymentdate?.toDate?.()?.toISOString() ?? '';
                        const stageUpdatedAt =
                            data.userDetails?.stageUpdatedAt instanceof Date
                                ? data.userDetails.stageUpdatedAt.toISOString()
                                : data.userDetails?.stageUpdatedAt?.toDate?.()?.toISOString() ?? null;



                        return {
                            ...data,
                            id: doc.id,
                            productId: productDoc.id,
                            createdAt,
                            secondpaymentdate: secondPaymentDate,
                            userDetails: {
                                ...data.userDetails,
                                stageUpdatedAt, // include formatted stageUpdatedAt
                            },
                        };
                    });
                });

                const bookingArrays = await Promise.all(bookingsPromises);
                const allBookings = bookingArrays.flat();

                const summary = calculateDailyAccountSummary(allBookings);
                setAccountSummary(summary);

                const totalRent = Object.values(summary).reduce((sum, s) => sum + s.rent, 0);
                const totalDeposit = Object.values(summary).reduce((sum, s) => sum + s.deposit, 0);
                setTotalRent(totalRent);
                setTotalDeposit(totalDeposit);
            } catch (error) {
                toast.error('Failed to fetch booking data');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (userData?.branchCode) {
            fetchBookings();
        }
    }, [userData?.branchCode]);
    const isInCurrentMonth = (isoDateString) => {
        if (!isoDateString) return false;
        const date = new Date(isoDateString);
        const now = new Date();
        return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        );
    };


    return (
        <div className="account-page container">
            <div className='vaisak' >
                      <img
                        src={backIcon}
                        alt="button10"
                        onClick={() => navigate("/usersidebar/clients")} // Navigate to the profile page
                      />
                    </div>
                                <h2 className="title">Account Summary</h2>


            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <>
                    <div className="card total-collection">
                        <h3 className="subtitle">Total Collection</h3>
                        <div className="total-row">
                            <span>Total Rent Received:</span>
                            <span className="amount">₹{totalRent}</span>
                        </div>
                        <div className="total-row">
                            <span>Total Deposit Received:</span>
                            <span className="amount">₹{totalDeposit}</span>
                        </div>
                    </div>
                    <div className="card monthly-summary">
                        <h3 className="subtitle">This Month's Summary</h3>
                        <div className="total-row">
                            <span>Monthly Rent:</span>
                            <span className="amount">₹{monthlySummary.rent}</span>
                        </div>
                        <div className="total-row">
                            <span>Monthly Deposit:</span>
                            <span className="amount">₹{monthlySummary.deposit}</span>
                        </div>
                    </div>


                    <div className="card daily-breakdown">
                        <h3 className="subtitle">Daily Breakdown</h3>

                        <div className="date-picker-wrapper date-range">
                            <div className="date-group">
                                <label htmlFor="fromDate" className="date-label">From:</label>
                                <input
                                    id="fromDate"
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="date-group">
                                <label htmlFor="toDate" className="date-label">To:</label>
                                <input
                                    id="toDate"
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>


                        {!selectedDate && (!fromDate || !toDate) && (
                            <div className="info-text">Please select a date or date range to view payments.</div>
                        )}

                        {selectedDate && !paymentsByDate[selectedDate] && (
                            <div className="info-text">No payments found for {selectedDate}.</div>
                        )}

                        {fromDate && toDate && (
                            (() => {
                                const rangePayments = Object.keys(paymentsByDate).filter(date =>
                                    date >= fromDate && date <= toDate
                                );
                                if (rangePayments.length === 0) {
                                    return (
                                        <div className="info-text">
                                            No payments found between {fromDate} and {toDate}.
                                        </div>
                                    );
                                }
                                return null;
                            })()
                        )}


                        {fromDate && toDate && (
                            Object.keys(paymentsByDate)
                                .filter((date) => date >= fromDate && date <= toDate)
                                .map((date) => (
                                    <div key={date} className="payment-table-wrapper">
                                        <h4 className="date-header">{date}</h4>
                                        <div className="payment-table">
                                            <div className="payment-table-header">
                                                <div className="payment-column">Receipt No.</div>
                                                <div className="payment-column">Payment Type</div>
                                                <div className="payment-column">Rent</div>
                                                <div className="payment-column">Deposit</div>
                                            </div>

                                            {[...paymentsByDate[date]]
                                                .map(({ receiptNumber, paymentType, rent, deposit }, idx) => (
                                                    <div key={idx} className="payment-table-row">
                                                        <div className="payment-column">{receiptNumber}</div>
                                                        <div className="payment-column">{paymentType}</div>
                                                        <div className="payment-column">
                                                            {rent > 0 ? <span className="payment-badge rent">+₹{rent}</span> : '-'}
                                                        </div>
                                                        <div className="payment-column">
                                                            {deposit !== 0 ? (
                                                                <span className={`payment-badge deposit ${deposit < 0 ? 'negative' : ''}`}>
                                                                    {deposit > 0 ? `+₹${deposit}` : `-₹${Math.abs(deposit)}`}
                                                                </span>
                                                            ) : '-'}
                                                        </div>
                                                    </div>
                                                ))}


                                            {/* Daily Totals */}
                                            <div className="payment-table-footer">
                                                <div className="payment-column" />
                                                <div className="payment-column" />
                                                <div className="payment-column total-label">Total Rent:</div>
                                                <div className="payment-column total-label">Total Deposit:</div>
                                            </div>
                                            <div className="payment-table-footer">
                                                <div className="payment-column" />
                                                <div className="payment-column" />
                                                <div className="payment-column total-amount rent">
                                                    ₹{paymentsByDate[date].reduce((sum, p) => sum + (p.rent || 0), 0)}
                                                </div>
                                                <div className="payment-column total-amount deposit">
                                                    ₹{paymentsByDate[date].reduce((sum, p) => sum + (p.deposit || 0), 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}





                    </div>
                </>
            )}
        </div>
    );
};

export default AccountPage;
