export const calculateAttendanceData = ({
  attendance,
  employeeSalaryMap,
  selectedMonth,
  selectedYear,
})=>{

  const groupedEmployees =

    Object.values(

      attendance.reduce((acc,item)=>{

        if(!acc[item.userId]){

          acc[item.userId] = {

            userId:item.userId,

            userName:
              item.userName ||
              "Unknown",

            selfieUrl:
              item.selfieUrl || "",

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
        if(type === "present"){

          acc[item.userId]
            .presentDays++;
        }

        /// PAID LEAVE
        if(type === "paidleave"){

          acc[item.userId]
            .paidLeaveDays++;
        }

        /// PENDING
        if(type === "checkoutpending"){

          acc[item.userId]
            .checkoutPending++;
        }

        return acc;

      },{})
    );



  return groupedEmployees.map(employee=>{

    const monthlySalary =

      employeeSalaryMap[
        employee.userId
      ]?.salary || 0;

    const employeeWeekOffs =

      employeeSalaryMap[
        employee.userId
      ]?.weekOffs || [];



    /// DAYS IN MONTH
    const daysInMonth =

      new Date(
        selectedYear,
        selectedMonth + 1,
        0
      ).getDate();



    /// AUTO WEEKOFFS
    let autoWeekOffs = 0;

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



    /// SALARY
    const perDaySalary =
      monthlySalary / daysInMonth;

    const totalPaidDays =

      employee.presentDays +

      autoWeekOffs +

      employee.paidLeaveDays;

    const totalSalary =

      Math.round(
        totalPaidDays *
        perDaySalary
      );



    /// ATTENDANCE %
    const attendancePercentage =

      Math.round(

        (
          employee.presentDays /
          daysInMonth
        ) * 100
      );



    return {

      ...employee,

      autoWeekOffs,

      absentDays,

      totalSalary,

      attendancePercentage,
    };
  });
};




/// OVERVIEW STATS
export const calculateAttendanceStats =
(attendance)=>{

  return {

    totalEmployees:

      new Set(
        attendance.map(
          a=>a.userId
        )
      ).size,

    completedDays:

      attendance.filter(
        a=>a.checkOutTime
      ).length,

    activeEmployees:

      attendance.filter(
        a=>!a.checkOutTime
      ).length,
  };
};
export const generateEmployeeAttendanceRows = ({
  attendance,
  employeeData,
  selectedMonth,
  selectedYear,
})=>{

  const rows = [];

  const employeeWeekOffs =
    employeeData?.weekOffs || [];

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
      });
    }



    /// WEEKOFF
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



  return rows;
};