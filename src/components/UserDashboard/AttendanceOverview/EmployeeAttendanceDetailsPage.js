import React,{
  useEffect,
  useState,
} from "react";

import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useParams } from "react-router-dom";

import { db } from "../../../firebaseConfig";

import { useUser } from "../../Auth/UserContext";

import UserHeader from "../../UserDashboard/UserHeader";
import UserSidebar from "../../UserDashboard/UserSidebar";

import "./EmployeeAttendanceDetailsPage.css";

const EmployeeAttendanceDetailsPage = () => {

  const { userId } = useParams();

  const { userData } = useUser();

  const [sidebarOpen,setSidebarOpen] =
      useState(false);

  const [attendance,setAttendance] =
      useState([]);

  const [loading,setLoading] =
      useState(true);

  const [employeeData,setEmployeeData] =
      useState(null);

  const [selectedMonth,setSelectedMonth] =
      useState(
        new Date().getMonth()
      );

  const [selectedYear,setSelectedYear] =
      useState(
        new Date().getFullYear()
      );

  const handleSidebarToggle = () =>
      setSidebarOpen(!sidebarOpen);

  useEffect(()=>{

    if(userData?.branchCode){

      fetchEmployee();

      fetchAttendance();
    }

  },[
    userId,
    selectedMonth,
    selectedYear,
    userData?.branchCode,
  ]);

  const fetchEmployee = async()=>{

    try{

      const ref = doc(

        db,

        "products",

        userData?.branchCode,

        "subusers",

        userId
      );

      const snap =
          await getDoc(ref);

      if(snap.exists()){

        setEmployeeData(
          snap.data()
        );
      }

    }catch(err){

      console.error(err);
    }
  };

  const fetchAttendance = async()=>{

    try{

      setLoading(true);

      const startDate =
          new Date(
            selectedYear,
            selectedMonth,
            1
          );

      const endDate =
          new Date(
            selectedYear,
            selectedMonth + 1,
            1
          );

      const q = query(

        collectionGroup(db,"logs"),

        where(
          "branchCode",
          "==",
          userData?.branchCode
        ),

        where(
          "userId",
          "==",
          userId
        ),

        where(
          "checkInTime",
          ">=",
          startDate
        ),

        where(
          "checkInTime",
          "<",
          endDate
        ),
      );

      const snap =
          await getDocs(q);

      const data =
          snap.docs.map(doc=>({

        id:doc.id,
        ...doc.data(),

      }));

      data.sort((a,b)=>{

        return (
          b.checkInTime?.seconds || 0
        ) - (
          a.checkInTime?.seconds || 0
        );
      });

      setAttendance(data);

    }catch(err){

      console.error(err);

    }

    setLoading(false);
  };

  const formatTime=(ts)=>{

    if(!ts) return "-";

    return ts
      .toDate()
      .toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit",
      });
  };

  const formatDate=(date)=>{

    if(!date) return "-";

    return date.toLocaleDateString();
  };

  const employeeName =
      employeeData?.name ||
      attendance[0]?.userName ||
      "Employee";

  const selfie =
      attendance[0]?.selfieUrl || "";

  const employeeWeekOffs =
      employeeData?.weekOffs || [];

  /// MONTHLY SALARY
  const monthlySalary =

      parseFloat(

        String(
          employeeData?.salary || 0
        ).replaceAll(",","")

      ) || 0;

  /// PER DAY
  

  /// GENERATE MONTH ROWS
  const rows = [];

const daysInMonth =
    new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();
    const perDaySalary =
    monthlySalary / daysInMonth;

for(
  let day = 1;
  day <= daysInMonth;
  day++
){

    const currentDate =
        new Date(
          selectedYear,
          selectedMonth,
          day
        );

    const dayName =
        currentDate.toLocaleDateString(
          "en-US",
          {
            weekday:"long"
          }
        );

    const existing =
        attendance.find(item=>{

      const d =
          item.checkInTime
              ?.toDate();

      if(!d) return false;

      return (

        d.getDate() ===
        currentDate.getDate()

      );
    });

    /// PRESENT
    if(existing){

      const type =

          existing.attendanceType ||

          (
            existing.checkOutTime
              ? "present"
              : "checkoutpending"
          );

      rows.push({

        date:currentDate,

        type,

        checkIn:
            existing.checkInTime,

        checkOut:
            existing.checkOutTime,

        selfie:
            existing.selfieUrl || "",
      });

    }

    /// WEEK OFF
    else if(

      employeeWeekOffs.includes(
        dayName
      )

    ){

      rows.push({

        date:currentDate,

        type:"weekoff",
      });
    }

    /// ABSENT
    else{

      rows.push({

        date:currentDate,

        type:"absent",
      });
    }
  }

  /// PRESENT
  const presentDays =
      rows.filter(
        r=>r.type === "present"
      ).length;

  /// WEEKOFF
  const weekOffDays =
      rows.filter(
        r=>r.type === "weekoff"
      ).length;

  /// PAID LEAVE
  const paidLeaveDays =
      rows.filter(
        r=>r.type === "paidleave"
      ).length;

  /// ABSENT
  const absentDays =
      rows.filter(
        r=>r.type === "absent"
      ).length;

  /// PENDING
  const checkoutPending =
      rows.filter(
        r=>
          r.type ===
          "checkoutpending"
      ).length;

  /// PAID DAYS
  const totalPaidDays =

      presentDays +
      weekOffDays +
      paidLeaveDays;

  /// FINAL SALARY
  const totalSalary =

      Math.round(
        totalPaidDays *
        perDaySalary
      );

  return (

    <div
      className={`dashboard-container ${
        sidebarOpen
          ? "sidebar-open"
          : ""
      }`}
    >

      <UserSidebar
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
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

            <div className="summary-card success">

              <span>
                Present Days
              </span>

              <strong>
                {presentDays}
              </strong>

            </div>

            <div className="summary-card">

              <span>
                Week Off
              </span>

              <strong>
                {weekOffDays}
              </strong>

            </div>

            <div className="summary-card">

              <span>
                Paid Leave
              </span>

              <strong>
                {paidLeaveDays}
              </strong>

            </div>

            <div className="summary-card danger">

              <span>
                Absent Days
              </span>

              <strong>
                {absentDays}
              </strong>

            </div>

            <div className="summary-card warning">

              <span>
                Checkout Pending
              </span>

              <strong>
                {checkoutPending}
              </strong>

            </div>

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

                    <th>Type</th>

                    <th>Status</th>

                  </tr>

                </thead>

                <tbody>

                  {rows.map((item,index)=>{

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