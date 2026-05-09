import React,{
  useState,
} from "react";

import { useParams } from "react-router-dom";

import useAttendance from "./hooks/useAttendance";

import {
  generateEmployeeAttendanceRows,
} from "./utils/attendanceUtils";

import { useUser } from "../../Auth/UserContext";

import UserHeader from "../../UserDashboard/UserHeader";
import UserSidebar from "../../UserDashboard/UserSidebar";

import "./EmployeeAttendanceDetailsPage.css";

const EmployeeAttendanceDetailsPage = ()=>{

  const { userId } = useParams();

  const { userData } = useUser();



  const [sidebarOpen,setSidebarOpen] =
    useState(false);



  const [selectedMonth,setSelectedMonth] =
    useState(
      new Date().getMonth()
    );
    const [dateView,setDateView] =
  useState("month");



  const [selectedYear,setSelectedYear] =
    useState(
      new Date().getFullYear()
    );



  /// FILTER
  const [activeFilter,setActiveFilter] =
    useState("all");

const [
  activeLabelFilter,

  setActiveLabelFilter,
] = useState("all");

  const handleSidebarToggle = ()=>{

    setSidebarOpen(
      !sidebarOpen
    );
  };



  /// SHARED ATTENDANCE HOOK
  const {
    employees,
    loading,
    attendance,
     employeeSalaryMap,
  } = useAttendance({

    branchCode:
      userData?.branchCode,

    month:selectedMonth,

    year:selectedYear,
  });



  /// FIND EMPLOYEE
const employeeData = {

  ...(employees.find(
    emp=>emp.userId === userId
  ) || {}),



  ...(employeeSalaryMap[
    userId
  ] || {}),
};



  /// GENERATE DAILY ROWS
  const rows =

    generateEmployeeAttendanceRows({

  attendance:

    attendance.filter(
      item=>
        item.userId === userId
    ),



  employeeData:

    employeeSalaryMap[
      userId
    ],



  selectedMonth,

  selectedYear,
});
/// LABEL COUNTS
const labelCounts = {

  "Late Check-In":0,

  "Early Check-Out":0,

  "Half Day":0,

  "Overtime":0,
};



rows.forEach(row=>{

  row.labels?.forEach(label=>{

    if(labelCounts[label] !== undefined){

      labelCounts[label]++;
    }
  });
});
const currentDate =
  new Date();



const startOfWeek =
  new Date(currentDate);

startOfWeek.setDate(

  currentDate.getDate() -

  currentDate.getDay()
);

startOfWeek.setHours(
  0,
  0,
  0,
  0
);



const endOfWeek =
  new Date(startOfWeek);

endOfWeek.setDate(
  startOfWeek.getDate() + 6
);

endOfWeek.setHours(
  23,
  59,
  59,
  999
);
  /// FILTERED ROWS
const filteredRows =

  rows

    .filter(row=>{

      /// TYPE FILTER
      const matchesType =

        activeFilter === "all"

          ? true

          : row.type ===
            activeFilter;



      /// LABEL FILTER
      const matchesLabel =

        activeLabelFilter ===
        "all"

          ? true

          : row.labels?.includes(
              activeLabelFilter
            );



      /// DATE FILTER
      const matchesDateView =

        dateView === "month"

          ? true

          : (

              row.date >=
              startOfWeek &&

              row.date <=
              endOfWeek
            );



      return (

        matchesType &&

        matchesLabel &&

        matchesDateView
      );
    })



    /// LATEST FIRST
    .sort(

      (a,b)=>

        b.date - a.date
    );



  /// SHARED STATS
  const presentDays =
    employeeData?.presentDays || 0;

  const weekOffDays =
    employeeData?.autoWeekOffs || 0;

  const paidLeaveDays =
    employeeData?.paidLeaveDays || 0;

  const absentDays =
    employeeData?.absentDays || 0;

  const checkoutPending =
    employeeData?.checkoutPending || 0;

  const totalSalary =
    employeeData?.totalSalary || 0;



  const employeeName =

    employeeData?.userName ||
    "Employee";



  const selfie =

    employeeData?.selfieUrl ||
    "";


const monthNames = [

  "January",

  "February",

  "March",

  "April",

  "May",

  "June",

  "July",

  "August",

  "September",

  "October",

  "November",

  "December",
];
  const formatTime = (ts)=>{

    if(!ts) return "-";

    return ts
      .toDate()
      .toLocaleTimeString([],{

        hour:"2-digit",

        minute:"2-digit",
      });
  };
  const exportAttendanceCSV = ()=>{

  const headers = [

    "Date",

    "Check In",

    "Check Out",

    "Duration",

    "Type",

    "Flags",

    "Status",
  ];



  const csvRows =

    filteredRows.map(item=>[

      formatDate(item.date),

      formatTime(item.checkIn),

      formatTime(item.checkOut),

      formatDuration(
        item.checkIn,
        item.checkOut
      ),

      item.type,

      item.labels?.join(" | ") ||

      "Perfect",

      item.type === "present" ||

      item.type === "weekoff" ||

      item.type === "paidleave"

        ? "Paid"

        : "Unpaid",
    ]);



  const csvContent = [

    headers,

    ...csvRows,

  ]

    .map(row=>
      row.join(",")
    )

    .join("\n");



  const blob = new Blob(

    [csvContent],

    {
      type:
        "text/csv;charset=utf-8;"
    }
  );



  const url =
    URL.createObjectURL(blob);



  const link =
    document.createElement("a");



  link.href = url;

  link.setAttribute(

    "download",

    `${employeeName}-attendance.csv`
  );



  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );
};
  const formatDuration = (
  checkIn,
  checkOut
)=>{

  if(!checkIn || !checkOut){

    return "-";
  }

  const inTime =
    checkIn.toDate();

  const outTime =
    checkOut.toDate();

  const diffMs =
    outTime - inTime;

  const hours =
    Math.floor(
      diffMs / (1000 * 60 * 60)
    );

  const minutes =
    Math.floor(

      (
        diffMs %
        (1000 * 60 * 60)
      ) /

      (1000 * 60)
    );

  return `${hours}h ${minutes}m`;
};



  const formatDate = (date)=>{

    if(!date) return "-";

    return date.toLocaleDateString();
  };



  return(

    <div
      className={`dashboard-container ${
        sidebarOpen
          ? "sidebar-open"
          : ""
      }`}
    >

      <UserSidebar
        isOpen={sidebarOpen}
        onToggle={
          handleSidebarToggle
        }
      />



      <div className="employee-attendance-container">

        <UserHeader
          onMenuClick={
            handleSidebarToggle
          }

          isSidebarOpen={
            sidebarOpen
          }
        />



        <section className="employee-attendance-section">

          <div className="employee-header-card">

            <div className="employee-profile">

              <img

                src={
                  selfie ||

                  "https://ui-avatars.com/api/?name=User"
                }

                alt="employee"
              />



              <div>

                <h2>
                  {employeeName}
                </h2>

                <p>
                  Employee Payroll Overview
                </p>

              </div>

            </div>
            <div className="employee-shift-info">



  <div className="shift-info-card">

    <span>

      Shift Start

    </span>

    <strong>

      {
        employeeData
          ?.shiftStartTime ||

        "--:--"
      }

    </strong>

  </div>



  <div className="shift-info-card">

    <span>

      Shift End

    </span>

    <strong>

      {
        employeeData
          ?.shiftEndTime ||

        "--:--"
      }

    </strong>

  </div>



  <div className="shift-info-card">

    <span>

      Grace Time

    </span>

    <strong>

      {

        employeeData
          ?.graceTime || 0

      } mins

    </strong>

  </div>



  <div className="shift-info-card">

    <span>

      OT Grace

    </span>

    <strong>

      {

        employeeData
          ?.overtimeGraceMinutes || 0

      } mins

    </strong>

  </div>



  <div className="shift-info-card weekoff">

    <span>

      Weekly Offs

    </span>

    <strong>

      {

        employeeData
          ?.weekOffs?.length

            ? employeeData
                ?.weekOffs
                ?.join(", ")

            : "None"
      }

    </strong>

  </div>

</div>

          </div>



          <div className="employee-summary-grid">



            {/* ALL */}

            <div

              className={`summary-card ${
                activeFilter === "all"
                  ? "active"
                  : ""
              }`}

              onClick={()=>
                setActiveFilter("all")
              }
            >

              <span>
                All
              </span>

              <strong>
                {rows.length}
              </strong>

            </div>



            {/* PRESENT */}

            <div

              className={`summary-card success ${
                activeFilter === "present"
                  ? "active"
                  : ""
              }`}

              onClick={()=>
                setActiveFilter(
                  "present"
                )
              }
            >

              <span>
                Present Days
              </span>

              <strong>
                {presentDays}
              </strong>

            </div>



            {/* WEEKOFF */}

            <div

              className={`summary-card ${
                activeFilter === "weekoff"
                  ? "active"
                  : ""
              }`}

              onClick={()=>
                setActiveFilter(
                  "weekoff"
                )
              }
            >

              <span>
                Week Off
              </span>

              <strong>
                {weekOffDays}
              </strong>

            </div>



            {/* PAID LEAVE */}

            <div

              className={`summary-card ${
                activeFilter === "paidleave"
                  ? "active"
                  : ""
              }`}

              onClick={()=>
                setActiveFilter(
                  "paidleave"
                )
              }
            >

              <span>
                Paid Leave
              </span>

              <strong>
                {paidLeaveDays}
              </strong>

            </div>



            {/* ABSENT */}

            <div

              className={`summary-card danger ${
                activeFilter === "absent"
                  ? "active"
                  : ""
              }`}

              onClick={()=>
                setActiveFilter(
                  "absent"
                )
              }
            >

              <span>
                Absent Days
              </span>

              <strong>
                {absentDays}
              </strong>

            </div>



            {/* PENDING */}

            <div

              className={`summary-card warning ${
                activeFilter ===
                "checkoutpending"

                  ? "active"
                  : ""
              }`}

              onClick={()=>
                setActiveFilter(
                  "checkoutpending"
                )
              }
            >

              <span>
                Checkout Pending
              </span>

              <strong>
                {checkoutPending}
              </strong>

            </div>



            {/* SALARY */}

            <div className="summary-card dark">

              <span>
                Salary
              </span>

              <strong>

                ₹
                {totalSalary}

              </strong>

            </div>

          </div>

<div className="attendance-top-controls">



  <div className="attendance-period-controls">



    {selectedMonth ===
new Date().getMonth() &&

selectedYear ===
new Date().getFullYear() && (

  <button

    className={

      dateView === "week"

        ? "attendance-period-btn active"

        : "attendance-period-btn"
    }

    onClick={()=>

      setDateView("week")
    }
  >

    This Week

  </button>
)}



    <button

      className={

        dateView === "month"

          ? "attendance-period-btn active"

          : "attendance-period-btn"
      }

      onClick={()=>

        setDateView("month")
      }
    >

      This Month

    </button>



    <select

      value={selectedMonth}

      onChange={(e)=>

        setSelectedMonth(

          Number(
            e.target.value
          )
        )
      }
    >

      {monthNames.map(
        (month,index)=>(

          <option
            key={month}
            value={index}
          >

            {month}

          </option>
        )
      )}

    </select>

  </div>



  <button

    className="attendance-export-btn"

    onClick={
      exportAttendanceCSV
    }
  >

    Export CSV

  </button>

</div>
<div className="attendance-label-filters">



  {/* ALL */}

  <button

    className={

      activeLabelFilter ===
      "all"

        ? "attendance-filter-chip active"

        : "attendance-filter-chip"
    }

    onClick={()=>

      setActiveLabelFilter(
        "all"
      )
    }
  >

    All

  </button>



  {/* LATE */}

  <button

    className={

      activeLabelFilter ===
      "Late Check-In"

        ? "attendance-filter-chip late active"

        : "attendance-filter-chip late"
    }

    onClick={()=>

      setActiveLabelFilter(
        "Late Check-In"
      )
    }
  >

    Late Check-In

    <span>

      {
        labelCounts[
          "Late Check-In"
        ]
      }

    </span>

  </button>



  {/* EARLY */}

  <button

    className={

      activeLabelFilter ===
      "Early Check-Out"

        ? "attendance-filter-chip early active"

        : "attendance-filter-chip early"
    }

    onClick={()=>

      setActiveLabelFilter(
        "Early Check-Out"
      )
    }
  >

    Early Check-Out

    <span>

      {
        labelCounts[
          "Early Check-Out"
        ]
      }

    </span>

  </button>



  {/* HALFDAY */}

  <button

    className={

      activeLabelFilter ===
      "Half Day"

        ? "attendance-filter-chip halfday active"

        : "attendance-filter-chip halfday"
    }

    onClick={()=>

      setActiveLabelFilter(
        "Half Day"
      )
    }
  >

    Half Day

    <span>

      {
        labelCounts[
          "Half Day"
        ]
      }

    </span>

  </button>



  {/* OVERTIME */}

  <button

    className={

      activeLabelFilter ===
      "Overtime"

        ? "attendance-filter-chip overtime active"

        : "attendance-filter-chip overtime"
    }

    onClick={()=>

      setActiveLabelFilter(
        "Overtime"
      )
    }
  >

    Overtime

    <span>

      {
        labelCounts[
          "Overtime"
        ]
      }

    </span>

  </button>

</div>
          <div className="attendance-log-card">

            {loading ? (

              <div className="attendance-loading">

                Loading attendance...

              </div>

            ) : (

              <table className="attendance-log-table">

                <thead>

                  <tr>

                    <th>Date</th>

                    <th>Check In</th>

                    <th>Check Out</th>
                    <th>Total Duration</th>

                    <th>Type</th>
                    <th>Flags</th>

                    <th>Status</th>

                  </tr>

                </thead>



                <tbody>

                  {filteredRows.map((item,index)=>{

                    const completed =

                      item.type ===
                      "present" ||

                      item.type ===
                      "weekoff" ||

                      item.type ===
                      "paidleave";



                    return(

                      <tr key={index}>

                        <td>
                          {formatDate(
                            item.date
                          )}
                        </td>



                        <td>
                          {formatTime(
                            item.checkIn
                          )}
                        </td>



                        <td>
                          {formatTime(
                            item.checkOut
                          )}
                        </td>
                        <td>

  {formatDuration(
    item.checkIn,
    item.checkOut
  )}

</td>



                        <td>

                          <span
                            className="attendance-type"
                          >

                            {item.type}

                          </span>

                        </td>
                        <td>

  <div className="attendance-flags">

    {item.labels?.length ? (

      item.labels.map(
        (label,index)=>(

          <span

            key={index}

            className={

              label ===
              "Late Check-In"

                ? "attendance-flag late"

                :

              label ===
              "Early Check-Out"

                ? "attendance-flag early"

                :

              label ===
              "Half Day"

                ? "attendance-flag halfday"

                :
                

label ===
"Overtime"

  ? "attendance-flag overtime"
  :

              "attendance-flag"
            }
          >

            {label}

          </span>
        )
      )

    ) : (

      <span className="attendance-clear">

        Perfect

      </span>
    )}

  </div>

</td>



                        <td>

                          <span
                            className={

                              completed

                                ? "attendance-status completed"

                                : "attendance-status active"
                            }
                          >

                            {completed
                              ? "Paid"
                              : "Unpaid"}

                          </span>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            )}

          </div>

        </section>

      </div>

    </div>
  );
};

export default EmployeeAttendanceDetailsPage;