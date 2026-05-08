import React, {
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

import { db } from "../../../firebaseConfig";

import { useUser } from "../../Auth/UserContext";

import UserHeader from "../../UserDashboard/UserHeader";
import UserSidebar from "../../UserDashboard/UserSidebar";

import "./AttendanceOverviewPage.css";

const AttendanceOverviewPage = () => {

  const { userData } = useUser();

  const [sidebarOpen,setSidebarOpen] =
      useState(false);

  const [attendance,setAttendance] =
      useState([]);

  const [loading,setLoading] =
      useState(true);

  const [employeeSalaryMap,
      setEmployeeSalaryMap] =
      useState({});

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

      fetchAttendance();
    }

  },[
    userData?.branchCode,
    selectedMonth,
    selectedYear,
  ]);

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
          "checkInTime",
          ">=",
          startDate
        ),

        where(
          "checkInTime",
          "<",
          endDate
        )
      );

      const snap =
          await getDocs(q);

      const data =
          snap.docs.map(doc=>({

        id:doc.id,
        ...doc.data(),

      }));

      setAttendance(data);

      /// FETCH EMPLOYEE DATA
      const uniqueUsers =
          [...new Set(
            data.map(
              item=>item.userId
            )
          )];

      let salaryMap = {};

      for(const uid of uniqueUsers){

        try{

          const userRef = doc(

            db,

            "products",

            userData?.branchCode,

            "subusers",

            uid
          );

          const userSnap =
              await getDoc(userRef);

          if(userSnap.exists()){

            salaryMap[uid] = {

              salary:

                parseFloat(

                  String(
                    userSnap.data()
                        ?.salary || 0
                  ).replaceAll(",","")

                ) || 0,

              weekOffs:

                userSnap.data()
                    ?.weekOffs || [],
            };
          }

        }catch(err){

          console.error(err);
        }
      }

      setEmployeeSalaryMap(
        salaryMap
      );

    }catch(err){

      console.error(err);

    }

    setLoading(false);
  };

  const totalEmployees =
      new Set(
        attendance.map(
          a=>a.userId
        )
      ).size;

  const completedDays =
      attendance.filter(
        a=>a.checkOutTime
      ).length;

  const activeEmployees =
      attendance.filter(
        a=>!a.checkOutTime
      ).length;

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

      <div className="attendance-container">

        <UserHeader
          onMenuClick={
            handleSidebarToggle
          }

          isSidebarOpen={
            sidebarOpen
          }
        />

        <section className="attendance-section">

          <div className="attendance-topbar">

            <div>

              <h2>
                Attendance Overview
              </h2>

              <p>
                Staff attendance,
                payroll & salary
              </p>

            </div>

            <div className="attendance-filters">

              <select
                value={selectedMonth}

                onChange={(e)=>
                  setSelectedMonth(
                    Number(e.target.value)
                  )
                }
              >

                {[
                  "Jan","Feb","Mar",
                  "Apr","May","Jun",
                  "Jul","Aug","Sep",
                  "Oct","Nov","Dec"
                ].map((m,i)=>(

                  <option
                    value={i}
                    key={i}
                  >
                    {m}
                  </option>

                ))}

              </select>

            </div>

          </div>

          <div className="attendance-stats">

            <div className="attendance-stat-card">

              <span>
                Employees
              </span>

              <strong>
                {totalEmployees}
              </strong>

            </div>

            <div className="attendance-stat-card success">

              <span>
                Present Logs
              </span>

              <strong>
                {completedDays}
              </strong>

            </div>

            <div className="attendance-stat-card warning">

              <span>
                Checkout Pending
              </span>

              <strong>
                {activeEmployees}
              </strong>

            </div>

          </div>

          {loading ? (

            <div className="attendance-loading">

              Loading attendance...

            </div>

          ) : (

            <div className="employee-grid">

              {Object.values(

                attendance.reduce((acc,item)=>{

                  if(!acc[item.userId]){

                    acc[item.userId] = {

                      userId:item.userId,

                      userName:
                          item.userName ||
                          "Unknown",

                      selfieUrl:
                          item.selfieUrl ||
                          "",

                      presentDays:0,

                      paidLeaveDays:0,

                      checkoutPending:0,
                    };
                  }

                  const type =

                      item.attendanceType ||

                      (
                        item.checkOutTime
                          ? "present"
                          : "checkoutpending"
                      );

                  /// PRESENT
                  if(
                    type === "present"
                  ){

                    acc[item.userId]
                        .presentDays++;
                  }

                  /// PAID LEAVE
                  if(
                    type === "paidleave"
                  ){

                    acc[item.userId]
                        .paidLeaveDays++;
                  }

                  /// CHECKOUT PENDING
                  if(
                    type ===
                    "checkoutpending"
                  ){

                    acc[item.userId]
                        .checkoutPending++;
                  }

                  return acc;

                },{})

              ).map((employee)=>{

                const monthlySalary =

                    employeeSalaryMap[
                      employee.userId
                    ]?.salary || 0;

                const employeeWeekOffs =

                    employeeSalaryMap[
                      employee.userId
                    ]?.weekOffs || [];

                /// AUTO WEEKOFFS
                let autoWeekOffs = 0;

               const daysInMonth =
    new Date(
      selectedYear,
      selectedMonth + 1,
      0
    ).getDate();

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

                  if(

                    employeeWeekOffs.includes(
                      dayName
                    )

                  ){

                    autoWeekOffs++;
                  }
                }

                /// ABSENT
                /// ABSENT
const absentDays =

    Math.max(

      0,

      daysInMonth -

      (
        employee.presentDays +

        autoWeekOffs +

        employee.paidLeaveDays +

        employee.checkoutPending
      )

    );

                /// PER DAY
                const perDaySalary =
    monthlySalary / daysInMonth;

                /// TOTAL PAID DAYS
                const totalPaidDays =

                    employee.presentDays +

                    autoWeekOffs +

                    employee.paidLeaveDays;

                /// FINAL SALARY
                const totalSalary =

                    Math.round(
                      totalPaidDays *
                      perDaySalary
                    );

                return(

                  <div

                    key={employee.userId}

                    className="employee-card"
                  >

                    <div className="employee-card-top">

                      <img

                        src={
                          employee.selfieUrl ||

                          "https://ui-avatars.com/api/?name=User"
                        }

                        alt="employee"
                      />

                      <div>

                        <h3>
                          {employee.userName}
                        </h3>

                        <p>
                          ID :
                          {employee.userId}
                        </p>

                      </div>

                    </div>

                    <div className="employee-card-stats">

                      <div>

                        <span>
                          Present
                        </span>

                        <strong>
                          {employee.presentDays}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Week Off
                        </span>

                        <strong>
                          {autoWeekOffs}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Paid Leave
                        </span>

                        <strong>
                          {employee.paidLeaveDays}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Absent
                        </span>

                        <strong>
                          {absentDays}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Pending
                        </span>

                        <strong>
                          {employee.checkoutPending}
                        </strong>

                      </div>

                    </div>

                    <div className="employee-card-footer">

                      <div>

                        <span>
                          Salary
                        </span>

                        <strong>

                          ₹
                          {totalSalary}

                        </strong>

                      </div>

                      <button

                        onClick={()=>{

                          window.location.href =

                            `/attendance/${employee.userId}`;

                        }}
                      >

                        View Details

                      </button>

                    </div>

                  </div>
                );
              })}

            </div>

          )}

        </section>

      </div>

    </div>
  );
};

export default AttendanceOverviewPage;