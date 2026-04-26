import React from "react";
import  { useState, useEffect } from 'react';

import { useUser } from "../../Auth/UserContext";
import DailyLedger from "./DailyLedger";
import "./AccountsReportPage.css";
import StaffPerformance from "./StaffPerformance";
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';


const AccountPage = () => {

  const { userData } = useUser();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!userData?.branchCode) {
    return <div className="report-loading">Loading ledger...</div>;
  }

  return (

    <div className="account-report-page">
      <UserHeader onMenuClick={toggleSidebar} />
      <div className="issidebar">
        <UserSidebar isOpen={isSidebarOpen} />
      
            <div className="account-report-page">

      <h2 className="report-page-title">
        Ledger Report
      </h2>

      <DailyLedger branchCode={userData.branchCode} />
      <StaffPerformance />
      </div>
      </div>
      </div>

   

  );

};

export default AccountPage;