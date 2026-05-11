import React,{
  useEffect,
  useState,
} from "react";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../../firebaseConfig";

import { useUser } from "../../Auth/UserContext";

import "./LeaveRequestsPage.css";



const LeaveRequestsPage = ()=>{

  const { userData } =
    useUser();



  const [requests,setRequests] =
    useState([]);

  const [loading,setLoading] =
    useState(true);



  useEffect(()=>{

    if(userData?.branchCode){

      fetchRequests();
    }

  },[
    userData,
  ]);



  /// FETCH REQUESTS
  const fetchRequests =
  async()=>{

    try{

      const snap =
        await getDocs(

          collection(

            db,

            "products",

            userData.branchCode,

            "leaveRequests"
          )
        );



      setRequests(

        snap.docs.map(doc=>({

          id:doc.id,

          ...doc.data(),
        }))
      );

    }catch(err){

      console.error(err);
    }



    setLoading(false);
  };



  /// APPROVE LEAVE
  const approveLeave =
  async(request)=>{

    try{

      const fromDate =
        request.fromDate.toDate();

      const toDate =
        request.toDate.toDate();



      /// CREATE LEAVE LOGS
      for(

        let d =
          new Date(fromDate);

        d <= toDate;

        d.setDate(
          d.getDate() + 1
        )
      ){

        const dayId =

`${d.getFullYear()}-${
String(
  d.getMonth() + 1
).padStart(2,"0")
}-${
String(
  d.getDate()
).padStart(2,"0")
}`;



        const attendanceRef =

          doc(

            db,

            "attendance",

            request.userId,

            "logs",

            dayId
          );



        await setDoc(

          attendanceRef,

          {

            attendanceType:
              "paidleave",

            userId:
              request.userId,

            userName:
              request.userName,

            branchCode:
              request.branchCode,
                /// UNIVERSAL DATE
    date:
      Timestamp.fromDate(d),

            leaveRequestId:
              request.id,

            createdAt:
              Timestamp.now(),
          },

          {
            merge:true,
          }
        );
      }



      /// UPDATE STATUS
      await updateDoc(

        doc(

          db,

          "products",

          userData.branchCode,

          "leaveRequests",

          request.id
        ),

        {
          status:"approved",
        }
      );



      fetchRequests();

    }catch(err){

      console.error(err);
    }
  };



  /// REJECT LEAVE
  const rejectLeave =
  async(requestId)=>{

    try{

      await updateDoc(

        doc(

          db,

          "products",

          userData.branchCode,

          "leaveRequests",

          requestId
        ),

        {
          status:"rejected",
        }
      );



      fetchRequests();

    }catch(err){

      console.error(err);
    }
  };



  return(

    <div className="leave-requests-container">



      {/* HEADER */}

      <div className="leave-requests-header">

        <h2>
          Leave Requests
        </h2>

        <p>
          Manage employee leave approvals
        </p>

      </div>



      {/* LOADING */}

      {loading ? (

        <div className="leave-loading">

          Loading requests...

        </div>

      ) : requests.length === 0 ? (

        <div className="leave-empty">

          No leave requests found

        </div>

      ) : (

        <div className="leave-requests-grid">

          {requests.map(request=>{

            const from =
              request.fromDate
                ?.toDate();

            const to =
              request.toDate
                ?.toDate();



            return(

              <div

                key={request.id}

                className="leave-request-card"
              >



                {/* TOP */}

                <div className="leave-request-top">



                  <div className="leave-request-user">

                    <div className="leave-request-avatar">

                      {

                        request.userName
                          ?.charAt(0)
                      }

                    </div>



                    <div>

                      <h3>

                        {
                          request.userName
                        }

                      </h3>

                      <p>

                        ID :
                        {
                          request.userId
                        }

                      </p>

                    </div>

                  </div>



                  <div

                    className={`leave-status ${
                      request.status
                    }`}
                  >

                    {
                      request.status
                    }

                  </div>

                </div>



                {/* BODY */}

                <div className="leave-request-body">



                  <div className="leave-item">

                    <span>
                      From Date
                    </span>

                    <strong>

                      {

                        from
                          ?.toLocaleDateString()
                      }

                    </strong>

                  </div>



                  <div className="leave-item">

                    <span>
                      To Date
                    </span>

                    <strong>

                      {

                        to
                          ?.toLocaleDateString()
                      }

                    </strong>

                  </div>



                  <div className="leave-item">

                    <span>
                      Reason
                    </span>

                    <strong>

                      {
                        request.reason
                      }

                    </strong>

                  </div>

                </div>



                {/* ACTIONS */}

                {request.status ===
                "pending" && (

                  <div className="leave-actions">



                    <button

                      className="leave-approve"

                      onClick={()=>

                        approveLeave(
                          request
                        )
                      }
                    >

                      Approve

                    </button>



                    <button

                      className="leave-reject"

                      onClick={()=>

                        rejectLeave(
                          request.id
                        )
                      }
                    >

                      Reject

                    </button>

                  </div>
                )}

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default LeaveRequestsPage;