import React, { useEffect, useState } from 'react';

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';

import { useParams } from 'react-router-dom';

import { db } from '../../../firebaseConfig';

import { useUser } from '../../Auth/UserContext';

import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';

import './CreditHistory.css';

const CreditHistory = () => {

  const { id } = useParams();

  const { userData } = useUser();

  const [history, setHistory] = useState([]);

  const [customer, setCustomer] = useState(null);

  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useEffect(() => {

    fetchHistory();

  }, []);

  const fetchHistory = async () => {

    try {

      /* ================= CUSTOMER ================= */

      const customerRef = doc(
        db,
        `products/${userData.branchCode}/creditNotes`,
        id
      );

      const customerSnap =
        await getDoc(customerRef);

      if (customerSnap.exists()) {

        setCustomer({
          id: customerSnap.id,
          ...customerSnap.data(),
        });
      }

      /* ================= HISTORY ================= */

      const historyRef = collection(
        db,
        `products/${userData.branchCode}/creditNotes/${id}/history`
      );

      const q = query(
        historyRef,
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      const historyData =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      setHistory(historyData);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);
    }
  };

  return (

    <div
      className={`dashboard-container ${
        sidebarOpen ? 'sidebar-open' : ''
      }`}
    >

      {/* ================= SIDEBAR ================= */}

      <UserSidebar
        isOpen={sidebarOpen}
        onToggle={() =>
          setSidebarOpen(!sidebarOpen)
        }
      />

      {/* ================= CONTENT ================= */}

      <div className="dashboard-content credit-history-dashboard">

        {/* ================= HEADER ================= */}

        <UserHeader
          onMenuClick={() =>
            setSidebarOpen(!sidebarOpen)
          }
        />

        {/* ================= LOADING ================= */}

        {loading ? (

          <div className="credit-history-loading">
            Loading Credit History...
          </div>

        ) : (

          <>
            {/* ================= PAGE HEADER ================= */}

            <div className="credit-history-header">

              <h2 className="credit-history-title">
                Credit History
              </h2>

              {customer && (

                <div className="credit-customer-grid">

                  <div className="credit-info-card">

                    <div className="credit-info-label">
                      Customer Name
                    </div>

                    <div className="credit-info-value">
                      {customer.Name}
                    </div>

                  </div>

                  <div className="credit-info-card">

                    <div className="credit-info-label">
                      Mobile Number
                    </div>

                    <div className="credit-info-value">
                      {customer.mobileNumber}
                    </div>

                  </div>

                  <div className="credit-info-card">

                    <div className="credit-info-label">
                      Current Balance
                    </div>

                    <div className="credit-info-value">
                      ₹{customer.Balance || 0}
                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* ================= TABLE ================= */}

            <div className="credit-history-table-wrapper">

              <table className="credit-history-table">

                <thead>

                  <tr>

                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Previous</th>
                    <th>Balance</th>
                    <th>Receipt</th>
                    <th>Note</th>

                  </tr>

                </thead>

                <tbody>

                  {history.length === 0 && (

                    <tr>

                      <td
                        colSpan="7"
                        className="credit-history-empty"
                      >
                        No credit history found
                      </td>

                    </tr>
                  )}

                  {history.map((item) => {

                    const isAdd =
                      item.type === 'ADD';

                    return (

                      <tr
                        key={item.id}
                        className="credit-history-row"
                      >

                        {/* DATE */}

                        <td>

                          {item.createdAt?.toDate
                            ? item.createdAt
                                .toDate()
                                .toLocaleString()
                            : '-'}

                        </td>

                        {/* TYPE */}

                        <td>

                          <span
                            className={`credit-badge ${
                              isAdd
                                ? 'credit-badge-add'
                                : 'credit-badge-used'
                            }`}
                          >
                            {item.type}
                          </span>

                        </td>

                        {/* AMOUNT */}

                        <td
                          className={
                            isAdd
                              ? 'credit-amount-add'
                              : 'credit-amount-used'
                          }
                        >

                          {isAdd ? '+' : '-'}
                          ₹{item.amount}

                        </td>

                        {/* PREVIOUS */}

                        <td>
                          ₹{item.previousBalance || 0}
                        </td>

                        {/* NEW BALANCE */}

                        <td>
                          ₹{item.newBalance || 0}
                        </td>

                        {/* RECEIPT */}

                        <td>

                          {item.receiptNo ? (

                            <span className="receipt-tag">
                              {item.receiptNo}
                            </span>

                          ) : '-'}

                        </td>

                        {/* NOTE */}

                        <td>

                          <div className="credit-note-text">
                            {item.note || '-'}
                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          </>
        )}

      </div>

    </div>
  );
};

export default CreditHistory;