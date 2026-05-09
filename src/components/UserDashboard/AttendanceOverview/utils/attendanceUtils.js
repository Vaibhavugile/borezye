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

/// CONVERT "10:30" => MINUTES
export const convertTimeToMinutes = (
  timeString
)=>{

  if(

    !timeString ||

    !timeString.includes(":")
  ){

    return 0;
  }

  const [hours,minutes] =

    timeString
      .split(":")
      .map(Number);

  return (

    hours * 60

  ) + minutes;
};



/// WORKED MINUTES
export const calculateWorkedMinutes = (
  checkIn,
  checkOut
)=>{

  if(!checkIn || !checkOut){

    return 0;
  }

  const inDate =
    checkIn.toDate();

  const outDate =
    checkOut.toDate();

  return Math.floor(

    (
      outDate - inDate
    ) /

    (1000 * 60)
  );
};
export const generateEmployeeAttendanceRows = ({
  attendance,
  employeeData,
  selectedMonth,
  selectedYear,
})=>{

  const rows = [];
  /// SHIFT SETTINGS
const shiftStartMinutes =

  convertTimeToMinutes(
    employeeData?.shiftStartTime
  );



const shiftEndMinutes =

  convertTimeToMinutes(
    employeeData?.shiftEndTime
  );



const graceTime =
  employeeData?.graceTime || 0;

  const overtimeGraceMinutes =

  employeeData
    ?.overtimeGraceMinutes || 0;



/// TOTAL SHIFT MINUTES
/// TOTAL SHIFT MINUTES
const shiftDuration =

  Math.max(

    0,

    shiftEndMinutes -
    shiftStartMinutes
  );
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
        /// CHECK IN/OUT DATES
const checkInDate =

  existing.checkInTime
    ?.toDate();



const checkOutDate =

  existing.checkOutTime
    ?.toDate();




/// CHECK IN MINUTES
const checkInMinutes =

  (
    checkInDate?.getHours() || 0
  ) * 60 +

  (
    checkInDate?.getMinutes() || 0
  );



/// CHECK OUT MINUTES
const checkOutMinutes =

  (
    checkOutDate?.getHours() || 0
  ) * 60 +

  (
    checkOutDate?.getMinutes() || 0
  );



/// TOTAL WORKED MINUTES
const workedMinutes =

  calculateWorkedMinutes(

    existing.checkInTime,

    existing.checkOutTime
  );



/// LATE CHECK IN
const isLateCheckIn =

  checkInMinutes >

  (
    shiftStartMinutes +
    graceTime
  );



/// EARLY CHECK OUT
const isEarlyCheckOut =

  checkOutMinutes <
  shiftEndMinutes;



/// HALF DAY
const isHalfDay =

  shiftDuration > 0 &&

  workedMinutes <

  (
    shiftDuration * 0.5
  );
  /// OVERTIME
/// OVERTIME
const isOvertime =

  checkOutMinutes >

  (
    shiftEndMinutes +

    overtimeGraceMinutes
  );

/// LABELS
/// LABELS
console.log({

  shiftStartMinutes,

  shiftEndMinutes,

  shiftDuration,

  graceTime,

  overtimeGraceMinutes,

  checkInMinutes,

  checkOutMinutes,

  workedMinutes,

  isLateCheckIn,

  isEarlyCheckOut,

  isHalfDay,

  isOvertime,
});
const labels = [];



/// HALF DAY = ONLY LABEL
if(isHalfDay){

  labels.push(
    "Half Day"
  );
}



/// FULL DAY LOGIC
else{

  /// LATE + EARLY CAN EXIST TOGETHER
  if(isLateCheckIn){

    labels.push(
      "Late Check-In"
    );
  }



  if(isEarlyCheckOut){

    labels.push(
      "Early Check-Out"
    );
  }



  /// OVERTIME
  if(isOvertime){

    labels.push(
      "Overtime"
    );
  }
}

      rows.push({

  date:currentDate,

  type,

  checkIn:
    existing.checkInTime,

  checkOut:
    existing.checkOutTime,



  /// WORK DATA
  workedMinutes,



  /// FLAGS
  labels,



  /// STATUS FLAGS
  isLateCheckIn,

  isEarlyCheckOut,

  isHalfDay,
isOvertime,



overtimeMinutes:

  isOvertime

    ? checkOutMinutes -

      (
        shiftEndMinutes +

        overtimeGraceMinutes
      )

    : 0,

  selfie:
    existing.selfieUrl || "",
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