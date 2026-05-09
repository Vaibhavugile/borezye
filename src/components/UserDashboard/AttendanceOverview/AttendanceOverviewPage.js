import React,{
  useState,
} from "react";

import useAttendance from "./hooks/useAttendance";

import { useUser } from "../../Auth/UserContext";

import UserHeader from "../../UserDashboard/UserHeader";
import UserSidebar from "../../UserDashboard/UserSidebar";

import "./AttendanceOverviewPage.css";

const AttendanceOverviewPage = ()=>{

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



  const handleSidebarToggle = ()=>{

    setSidebarOpen(
      !sidebarOpen
    );
  };



  /// ATTENDANCE HOOK
  const {
    employees,
    stats,
    loading,
  } = useAttendance({

    branchCode:
      userData?.branchCode,

    month:selectedMonth,

    year:selectedYear,
  });



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
                    Number(
                      e.target.value
                    )
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
                    key={i}
                    value={i}
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
                {stats.totalEmployees}
              </strong>

            </div>



            <div className="attendance-stat-card success">

              <span>
                Present Logs
              </span>

              <strong>
                {stats.completedDays}
              </strong>

            </div>



            <div className="attendance-stat-card warning">

              <span>
                Checkout Pending
              </span>

              <strong>
                {stats.activeEmployees}
              </strong>

            </div>

          </div>



          {loading ? (

            <div className="attendance-loading">

              Loading attendance...

            </div>

          ) : (

            <div className="employee-grid">

              {employees.map((employee)=>{

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
                          {employee.autoWeekOffs}
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
                          {employee.absentDays}
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
                          {employee.totalSalary}
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