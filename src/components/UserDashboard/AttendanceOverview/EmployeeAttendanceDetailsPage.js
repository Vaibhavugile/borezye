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



  const [selectedYear,setSelectedYear] =
    useState(
      new Date().getFullYear()
    );



  /// FILTER
  const [activeFilter,setActiveFilter] =
    useState("all");



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
  } = useAttendance({

    branchCode:
      userData?.branchCode,

    month:selectedMonth,

    year:selectedYear,
  });



  /// FIND EMPLOYEE
  const employeeData =

    employees.find(
      emp=>emp.userId === userId
    );



  /// GENERATE DAILY ROWS
  const rows =

    generateEmployeeAttendanceRows({

      attendance:

        attendance.filter(
          item=>
            item.userId === userId
        ),

      employeeData,

      selectedMonth,

      selectedYear,
    });



  /// FILTERED ROWS
  const filteredRows =

    activeFilter === "all"

      ? rows

      : rows.filter(
          row=>
            row.type === activeFilter
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



  const formatTime = (ts)=>{

    if(!ts) return "-";

    return ts
      .toDate()
      .toLocaleTimeString([],{

        hour:"2-digit",

        minute:"2-digit",
      });
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