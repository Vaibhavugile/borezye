import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import "./ExpenseReport.css";

import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp
} from "firebase/firestore";

import { db } from "../../../firebaseConfig";

import { useUser } from "../../Auth/UserContext";

import UserHeader from "../../UserDashboard/UserHeader";

import UserSidebar from "../../UserDashboard/UserSidebar";

const ExpenseReport = () => {

  /* USER CONTEXT */

  const { userData } = useUser();
  /* FILTERS */

const [searchTerm, setSearchTerm] =
  useState("");

const [paymentFilter, setPaymentFilter] =
  useState("all");

const [sortBy, setSortBy] =
  useState("latest");

  const branchCode = userData?.branchCode;

  /* SIDEBAR */

  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const toggleSidebar = () => {

    setIsSidebarOpen(!isSidebarOpen);

  };

  /* MODAL */

  const [showExpenseModal, setShowExpenseModal] =
    useState(false);

  /* STATES */

  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(false);

  const [expenseForm, setExpenseForm] = useState({

    category: "",

    vendorName: "",

    amount: "",

    paymentMode: "cash",

    notes: ""

  });

  const [startDate, setStartDate] =
    useState(new Date());

  const [endDate, setEndDate] =
    useState(new Date());

  /* DATE FORMAT */

  const formatDateInput = (date) => {

    return new Date(date)
      .toISOString()
      .split("T")[0];

  };

  /* FETCH EXPENSES */

  const fetchExpenses = async () => {

    if(!branchCode) return;

    setLoading(true);

    try {

      const start = new Date(startDate);

      start.setHours(0,0,0,0);

      const end = new Date(endDate);

      end.setHours(23,59,59,999);

      const ref = collection(

        db,

        `products/${branchCode}/expenses`

      );

      const q = query(

        ref,

        where(
          "expenseDate",
          ">=",
          start
        ),

        where(
          "expenseDate",
          "<=",
          end
        )

      );

      const snapshot = await getDocs(q);

      const rows = [];

      snapshot.forEach(doc => {

        rows.push({

          id: doc.id,

          ...doc.data()

        });

      });

      rows.sort((a,b)=>{

        const d1 = a.expenseDate?.seconds

          ? new Date(
              a.expenseDate.seconds * 1000
            )

          : new Date(a.expenseDate);

        const d2 = b.expenseDate?.seconds

          ? new Date(
              b.expenseDate.seconds * 1000
            )

          : new Date(b.expenseDate);

        return d2 - d1;

      });

      setExpenses(rows);

    } catch(err){

      console.log(err);

    }

    setLoading(false);

  };

  useEffect(()=>{

    fetchExpenses();

  },[
    branchCode,
    startDate,
    endDate
  ]);

  /* ADD EXPENSE */

  const addExpense = async () => {

    if(
      !expenseForm.category ||
      !expenseForm.amount
    ){

      alert("Fill all required fields");

      return;

    }

    try {

      await addDoc(

        collection(

          db,

          `products/${branchCode}/expenses`

        ),

        {

          ...expenseForm,

          amount:Number(
            expenseForm.amount
          ),

          branchCode,

          createdAt: Timestamp.now(),

          expenseDate: Timestamp.now(),

          createdBy:
            userData?.name || "Admin",

          status:"approved"

        }

      );

      setExpenseForm({

        category:"",

        vendorName:"",

        amount:"",

        paymentMode:"cash",

        notes:""

      });

      fetchExpenses();

    } catch(err){

      console.log(err);

      alert("Failed to add expense");

    }

  };

  /* TOTALS */

  const totalExpense = useMemo(()=>{

    return expenses.reduce((sum,item)=>{

      return (
        sum +
        Number(item.amount || 0)
      );

    },0);

  },[expenses]);

  const cashTotal = useMemo(()=>{

    return expenses

      .filter(
        x=>x.paymentMode==="cash"
      )

      .reduce((sum,item)=>{

        return (
          sum +
          Number(item.amount || 0)
        );

      },0);

  },[expenses]);

  const onlineTotal = useMemo(()=>{

    return expenses

      .filter(
        x=>x.paymentMode!=="cash"
      )

      .reduce((sum,item)=>{

        return (
          sum +
          Number(item.amount || 0)
        );

      },0);

  },[expenses]);
/* FILTERED EXPENSES */

const filteredExpenses = useMemo(()=>{

  let data = [...expenses];

  /* SEARCH */

  if(searchTerm){

    data = data.filter(item =>

      item.category
        ?.toLowerCase()
        ?.includes(
          searchTerm.toLowerCase()
        ) ||

      item.vendorName
        ?.toLowerCase()
        ?.includes(
          searchTerm.toLowerCase()
        )

    );

  }

  /* PAYMENT FILTER */

  if(paymentFilter !== "all"){

    data = data.filter(item =>

      item.paymentMode === paymentFilter

    );

  }

  /* SORT */

  if(sortBy === "latest"){

    data.sort((a,b)=>{

      const d1 = a.expenseDate?.seconds
        ? a.expenseDate.seconds
        : 0;

      const d2 = b.expenseDate?.seconds
        ? b.expenseDate.seconds
        : 0;

      return d2 - d1;

    });

  }

  if(sortBy === "oldest"){

    data.sort((a,b)=>{

      const d1 = a.expenseDate?.seconds
        ? a.expenseDate.seconds
        : 0;

      const d2 = b.expenseDate?.seconds
        ? b.expenseDate.seconds
        : 0;

      return d1 - d2;

    });

  }

  if(sortBy === "high"){

    data.sort((a,b)=>

      Number(b.amount || 0) -
      Number(a.amount || 0)

    );

  }

  if(sortBy === "low"){

    data.sort((a,b)=>

      Number(a.amount || 0) -
      Number(b.amount || 0)

    );

  }

  return data;

},[
  expenses,
  searchTerm,
  paymentFilter,
  sortBy
]);
  /* LOADING */

  if (!userData?.branchCode) {

    return (

      <div className="expense-loading">

        Loading Expense Report...

      </div>

    );

  }

  return (

    <div className="expense-layout">

      <UserHeader
        onMenuClick={toggleSidebar}
      />

      <div className="expense-body-layout">

        <UserSidebar
          isOpen={isSidebarOpen}
        />

        <div className="expense-page">

          {/* HEADER */}

          <div className="expense-topbar">

            <div>

              <h2>
             Expense Report
              </h2>

             

            </div>

            <div className="expense-date-row">

              <input
                type="date"
                value={formatDateInput(startDate)}
                onChange={(e)=>

                  setStartDate(
                    new Date(e.target.value)
                  )

                }
              />

              <input
                type="date"
                value={formatDateInput(endDate)}
                onChange={(e)=>

                  setEndDate(
                    new Date(e.target.value)
                  )

                }
              />

            </div>

          </div>

          {/* SUMMARY */}

          <div className="expense-summary-grid">

            <div className="summary-card">

              <span>
                Total Expense
              </span>

              <h1>
                ₹ {totalExpense.toLocaleString()}
              </h1>

            </div>

            <div className="summary-card">

              <span>
                Cash Expense
              </span>

              <h1>
                ₹ {cashTotal.toLocaleString()}
              </h1>

            </div>

            <div className="summary-card">

              <span>
                Online Expense
              </span>

              <h1>
                ₹ {onlineTotal.toLocaleString()}
              </h1>

            </div>

            <div className="summary-card">

              <span>
                Total Entries
              </span>

              <h1>
                {expenses.length}
              </h1>

            </div>

          </div>

          {/* ACTION BAR */}

          <div className="expense-action-bar">

            <button
              className="open-expense-btn"
              onClick={()=>
                setShowExpenseModal(true)
              }
            >

              + Add Expense

            </button>

          </div>

<div className="expense-filter-bar">

  <input
    type="text"
    placeholder="Search category or vendor..."
    value={searchTerm}
    onChange={(e)=>
      setSearchTerm(e.target.value)
    }
  />

  <select
    value={paymentFilter}
    onChange={(e)=>
      setPaymentFilter(e.target.value)
    }
  >

    <option value="all">
      All Payments
    </option>

    <option value="cash">
      Cash
    </option>

    <option value="upi">
      UPI
    </option>

    <option value="bank">
      Bank
    </option>

  </select>

  <select
    value={sortBy}
    onChange={(e)=>
      setSortBy(e.target.value)
    }
  >

    <option value="latest">
      Latest First
    </option>

    <option value="oldest">
      Oldest First
    </option>

    <option value="high">
      Amount High → Low
    </option>

    <option value="low">
      Amount Low → High
    </option>

  </select>

  <button
    className="export-btn"
    onClick={()=>{

  const headers = [

    "Date",

    "Category",

    "Vendor",

    "Payment",

    "Created By",

    "Amount",

    "Notes"

  ];

  const csvRows = [];

  csvRows.push(headers.join(","));

  filteredExpenses.forEach(item=>{

    const date =
      item.expenseDate?.seconds

      ? new Date(
          item.expenseDate.seconds * 1000
        )

      : new Date();

    const values = [

      date.toLocaleString("en-IN"),

      item.category || "",

      item.vendorName || "",

      item.paymentMode || "",

      item.createdBy || "",

      item.amount || 0,

      item.notes || ""

    ];

    const escaped = values.map(value => {

      return `"${String(value)
        .replace(/"/g, '""')
        .replace(/\n/g, " ")
      }"`;

    });

    csvRows.push(
      escaped.join(",")
    );

  });

  const csvContent =
    csvRows.join("\n");

  const blob = new Blob(

    [csvContent],

    {
      type:"text/csv;charset=utf-8;"
    }

  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `expenses-${branchCode}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

}}
  >

    Export CSV

  </button>

</div>

          {/* MODAL */}

          {showExpenseModal && (

            <div className="expense-modal-overlay">

              <div className="expense-modal">

                <div className="expense-modal-header">

                  <h3>
                    Add Expense
                  </h3>

                  <button
                    className="close-modal-btn"
                    onClick={()=>
                      setShowExpenseModal(false)
                    }
                  >

                    ✕

                  </button>

                </div>

                <div className="expense-form-grid">

                  <input
                    placeholder="Category"
                    value={expenseForm.category}
                    onChange={(e)=>

                      setExpenseForm({

                        ...expenseForm,

                        category:e.target.value

                      })

                    }
                  />

                  <input
                    placeholder="Vendor Name"
                    value={expenseForm.vendorName}
                    onChange={(e)=>

                      setExpenseForm({

                        ...expenseForm,

                        vendorName:e.target.value

                      })

                    }
                  />

                  <input
                    placeholder="Amount"
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e)=>

                      setExpenseForm({

                        ...expenseForm,

                        amount:e.target.value

                      })

                    }
                  />

                  <select
                    value={expenseForm.paymentMode}
                    onChange={(e)=>

                      setExpenseForm({

                        ...expenseForm,

                        paymentMode:e.target.value

                      })

                    }
                  >

                    <option value="cash">
                      Cash
                    </option>

                    <option value="upi">
                      UPI
                    </option>

                    <option value="bank">
                      Bank
                    </option>

                  </select>

                </div>

                <textarea

                  placeholder="Expense Notes"

                  value={expenseForm.notes}

                  onChange={(e)=>

                    setExpenseForm({

                      ...expenseForm,

                      notes:e.target.value

                    })

                  }

                />

                <button
                  className="expense-add-btn"
                  onClick={async ()=>{

                    await addExpense();

                    setShowExpenseModal(false);

                  }}
                >

                  Save Expense

                </button>

              </div>

            </div>

          )}

          {/* TABLE */}

          <div className="expense-table-wrapper">

            <table className="expense-table">

              <thead>

                <tr>

                  <th>Date</th>

                  <th>Category</th>

                  <th>Vendor</th>

                  <th>Payment</th>

                  <th>Created By</th>

                  <th>Amount</th>

                  <th>Notes</th>

                </tr>

              </thead>

              <tbody>

                {!loading &&

                  filteredExpenses.map(item=>{

                    const date =
                      item.expenseDate?.seconds

                      ? new Date(
                          item.expenseDate.seconds * 1000
                        )

                      : new Date(
                          item.expenseDate
                        );

                    return(

                      <tr key={item.id}>

                        <td>

                          {date.toLocaleString(
                            "en-IN",
                            {

                              day:"2-digit",

                              month:"short",

                              year:"numeric",

                              hour:"2-digit",

                              minute:"2-digit"

                            }
                          )}

                        </td>

                        <td>
                          {item.category}
                        </td>

                        <td>
                          {item.vendorName}
                        </td>

                        <td>
                          {item.paymentMode}
                        </td>

                        <td>
                          {item.createdBy}
                        </td>

                        <td className="amount-cell">

                          ₹ {
                            Number(
                              item.amount
                            ).toLocaleString()
                          }

                        </td>

                        <td>
                          {item.notes}
                        </td>

                      </tr>

                    )

                  })

                }

              </tbody>

            </table>

            {!loading &&
              filteredExpenses.length===0 && (

              <div className="expense-empty">

                No Expenses Found

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  );

};

export default ExpenseReport;