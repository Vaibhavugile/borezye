import {
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  documentId,
} from "firebase/firestore";

import { db } from "../../../../firebaseConfig";

/// FETCH ATTENDANCE LOGS
/// FETCH ATTENDANCE LOGS
export const fetchAttendanceLogs =
async({
  branchCode,
  month,
  year,
})=>{

  /// START DATE
  const startDate =

    new Date(
      year,
      month,
      1
    );



  /// NEXT MONTH
  const nextDate =

    new Date(
      year,
      month + 1,
      1
    );



  const q = query(

    collectionGroup(db,"logs"),



    where(
      "branchCode",
      "==",
      branchCode
    ),



    where(
      "date",
      ">=",
      startDate
    ),



    where(
      "date",
      "<",
      nextDate
    )
  );



  const snap =
    await getDocs(q);



  return snap.docs.map(doc=>({

    id:doc.id,

    ...doc.data(),
  }));
};

/// FETCH EMPLOYEE SALARY DATA
/// FETCH EMPLOYEE SALARY DATA
export const fetchEmployeeSalaryMap =
async({
  branchCode,
  attendanceData,
})=>{

  const uniqueUsers =

    [...new Set(

      attendanceData.map(
        item=>item.userId
      )
    )];



  let salaryMap = {};



  for(const uid of uniqueUsers){

    try{

      const userRef = doc(

        db,

        "products",

        branchCode,

        "subusers",

        uid
      );



      const userSnap =

        await getDoc(userRef);



      if(userSnap.exists()){

        const userData =
          userSnap.data();



        salaryMap[uid] = {

          /// SALARY
          salary:

            parseFloat(

              String(

                userData?.salary || 0

              ).replaceAll(
                ",",
                ""
              )

            ) || 0,



          /// WEEKOFFS
          weekOffs:

            userData?.weekOffs || [],



          /// SHIFT SETTINGS
          shiftStartTime:

            userData
              ?.shiftStartTime ||

            "09:00",



          shiftEndTime:

            userData
              ?.shiftEndTime ||

            "18:00",



          graceTime:

            Number(
              userData
                ?.graceTime || 0
            ),



          overtimeGraceMinutes:

            Number(

              userData
                ?.overtimeGraceMinutes || 0
            ),
        };
      }

    }catch(err){

      console.error(err);
    }
  }



  return salaryMap;
};