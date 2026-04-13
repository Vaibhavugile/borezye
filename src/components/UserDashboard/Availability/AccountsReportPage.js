import React from "react";
import { useUser } from "../../Auth/UserContext";
import DailyLedger from "./DailyLedger";
import "./AccountsReportPage.css";
import StaffPerformance from "./StaffPerformance";

const AccountPage = () => {

  const { userData } = useUser();

  if (!userData?.branchCode) {
    return <div className="report-loading">Loading ledger...</div>;
  }

  return (

    <div className="account-report-page">

      <h2 className="report-page-title">
        Ledger Report
      </h2>

      <DailyLedger branchCode={userData.branchCode} />
      <StaffPerformance />

    </div>

  );

};

export default AccountPage;