import {
  useEffect,
  useState,
} from "react";

import {
  fetchAttendanceLogs,
  fetchEmployeeSalaryMap,
} from "../services/attendanceService";

import {
  calculateAttendanceData,
  calculateAttendanceStats,
} from "../utils/attendanceUtils";



const useAttendance = ({
  branchCode,
  month,
  year,
})=>{

  const [loading,setLoading] =
    useState(true);

  const [attendance,setAttendance] =
    useState([]);

  const [
    employeeSalaryMap,
    setEmployeeSalaryMap,
  ] = useState({});



  useEffect(()=>{

    if(branchCode){

      fetchAttendance();
    }

  },[
    branchCode,
    month,
    year,
  ]);



  const fetchAttendance = async()=>{

    try{

      setLoading(true);

      /// FETCH LOGS
      const attendanceData =

        await fetchAttendanceLogs({

          branchCode,
          month,
          year,
        });

      setAttendance(
        attendanceData
      );



      /// FETCH SALARY MAP
      const salaryMap =

        await fetchEmployeeSalaryMap({

          branchCode,
          attendanceData,
        });

      setEmployeeSalaryMap(
        salaryMap
      );

    }catch(err){

      console.error(err);

    }

    setLoading(false);
  };



  /// EMPLOYEE DATA
  const employees =

    calculateAttendanceData({

      attendance,

      employeeSalaryMap,

      selectedMonth:month,

      selectedYear:year,
    });



  /// STATS
  const stats =

    calculateAttendanceStats(
      attendance
    );



 return {

  employees,

  stats,

  loading,

  attendance,

  refreshAttendance:
    fetchAttendance,
};
};

export default useAttendance;