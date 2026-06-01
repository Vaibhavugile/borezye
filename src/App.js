
import CreateTemplatePage from './components/UserDashboard/CreateTemplatePage';
import TemplatesDashboard from './components/Admin/TemplatesDashboard';
import SCreateTemplate from './components/Admin/CreateTempS';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Auth/Login';
import PrivateRoute from './components/Auth/PrivateRoute';
import Dashboard from './components/UserDashboard/Dashboard/Dashboard';
import ChangePassword from './components/Auth/ChangePassword';
import AdminDashboard from './components/Admin/AdminDashboard';
import Welcome from './components/UserDashboard/UserDashboard';
import CreateBranch from './components/Branch/CreateBranch';
import EditBranch from './components/Branch/EditBranch';
import ActiveLog from './components/Log/ActiveLog';
import Leads from './components/Leads/Leads';
import BookProduct from './components/UserDashboard/Availability/Booking';
import Customize from './components/Customize/Customize';
import CreateSuperAdmin from './components/Profile/CreateSuperAdmin';
import Profile from './components/Profile/Profile';
import Layout from './components/Profile/Layout';
import Lead from './components/Leads/Addlead';
import EditLead from './components/Leads/EditLead';
import { UserProvider } from './components/Auth/UserContext';
import DetailsShared from './components/Leads/Leads';
import DemoScheduled from './components/Leads/Leads';
import Active from './components/Admin/AdminDashboard';
import DemoDone from './components/Leads/Leads';
import LeadWon from './components/Leads/Leads';
import LeadLost from './components/Leads/Leads';
import User from './components/UserDashboard/User';
import FreshLeads from './components/Leads/Leads';
import AddUser from './components/UserDashboard/Adduser';
import AddProduct from './components/Product/AddProduct';
import ProductDashboard from './components/Product/Product';
import CheckAvailability from './components/UserDashboard/Availability/Availability';
import Booking from './components/UserDashboard/Availability/Booking';
import EditUser from './components/UserDashboard/EditUser';
import ClientLeadsDashboard from './components/UserDashboard/Clienleads/CleadsDashboard';
import ClientLeads from './components/UserDashboard/Clienleads/Cleads';
import EditProduct from './components/Product/EditProduct';
import BookingDashboard from './components/UserDashboard/Availability/Availability';
import ClientDashboard from './components/UserDashboard/Availability/ClientDetail';
import SingleComponent from './components/Profile/Profile';
import Overview from './components/Profile/overview';
import EditCLead from './components/UserDashboard/Clienleads/Editlead';
import ForgotPassword from './components/Auth/ForgotPassword';
import ProductReport from './components/UserDashboard/productreport';
import BookingDetailsPage from './components/UserDashboard/Availability/BookingDetailsPage';
import Logout from './components/Auth/Logout';
import EditTemplate from './components/Profile/edittemplate';
import Landing from './components/Auth/landing';
import DeletedHistoryPage from './components/UserDashboard/Availability/Deletehistory';
import CreditNoteDashboard from './components/UserDashboard/Availability/Creditnote';
import GenerateCreditNote from './components/UserDashboard/Availability/GenerateCreditNote';
import EditCreditNote from './components/UserDashboard/Availability/EditCreditNote';
import ResetPassword from './components/Auth/ResetPassword';
import FirebaseAuthActionHandler from './components/Auth/FirebaseAuthActionHandler';
import AccountPage from './components/UserDashboard/Availability/AccountsReportPage';
import AccountPageLogic from './components/UserDashboard/Availability/AccountsReportPage';
import UpdateRentalPeriodHardcoded from './components/UserDashboard/Availability/UpdateRentalPeriodHardcoded';
import InactivityGuard from "./components/Auth/InactivityGuard";
import PrivacyPolicy from './components/UserDashboard/PrivacyPolicy';
import Support from './components/UserDashboard/Support';
import ManageBanners from './components/UserDashboard/Banners/ManageBanners';
import ManageCollections from './components/UserDashboard/Banners/ManageCollections';
import ManagePromotions from './components/UserDashboard/Banners/ManagePromotions';
import ManageSubCollections from './components/UserDashboard/Banners/ManageSubCollections';
import ManageOccasions from './components/UserDashboard/Banners/ManageOccasions';
import AttendanceOverviewPage from './components/UserDashboard/AttendanceOverview/AttendanceOverviewPage';
import EmployeeAttendanceDetailsPage from './components/UserDashboard/AttendanceOverview/EmployeeAttendanceDetailsPage';
import LeaveRequestsPage from './components/UserDashboard/AttendanceOverview/LeaveRequestsPage';
import CreditHistory from './components/UserDashboard/Availability/CreditHistory';
import ExpenseReport from './components/UserDashboard/Availability/ExpenseReport';
import BranchSettings from './components/UserDashboard/Availability/BranchSettings';
import CallsPage from './components/UserDashboard/Availability/CallsPage';
const App = () => (

  <UserProvider>
    <Router>
      <InactivityGuard>
      <Routes>
        {/* Public Route - Login Page */}
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/support" element={<Support />} />

        {/* Public Route - Login Page */}
        <Route path="/Login" element={<Login />} />
        <Route path="/__/auth/action" element={<FirebaseAuthActionHandler />} />
        <Route path="/reset-password" element={<ResetPassword />} />
       <Route path="/admin/update-period" element={<UpdateRentalPeriodHardcoded />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/change-password" element={
          <PrivateRoute>
            <ChangePassword />
          </PrivateRoute>
        } />


        <Route path="/Logout" element={
          <PrivateRoute>
            <Logout />
          </PrivateRoute>
        } />

        <Route path="/branches" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />

        <Route path="/branches/active" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/branches/deactive" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />

        <Route path="/branches/expiring-soon" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />



        <Route path="/leads" element={
          <PrivateRoute>
            <Leads />
          </PrivateRoute>
        } />

        <Route path="/welcome" element={
          <PrivateRoute>
            <Welcome />
          </PrivateRoute>
        } />

        <Route path="/create-branch" element={
          <PrivateRoute>
            <CreateBranch />
          </PrivateRoute>
        } />
        <Route path="/Screate-Template" element={
          <PrivateRoute>
            <SCreateTemplate />
          </PrivateRoute>
        } />

        <Route path="/edit-branch/:id" element={
          <PrivateRoute>
            <EditBranch />
          </PrivateRoute>
        } />

        <Route path="/customize" element={
          <PrivateRoute>
            <Customize />
          </PrivateRoute>
        } />

        <Route path="/active-log" element={
          <PrivateRoute>
            <ActiveLog />
          </PrivateRoute>
        } />

        <Route path="/create-lead" element={
          <PrivateRoute>
            <Lead />
          </PrivateRoute>
        } />

        <Route path="/edit-lead/:id" element={
          <PrivateRoute>
            <EditLead />
          </PrivateRoute>
        } />

        <Route path="/leads/detail-shared" element={
          <PrivateRoute>
            <DetailsShared />
          </PrivateRoute>
        } />

        <Route path="/leads/fresh-lead" element={
          <PrivateRoute>
            <FreshLeads />
          </PrivateRoute>
        } />

        <Route path="/leads/demo-scheduled" element={
          <PrivateRoute>
            <DemoScheduled />
          </PrivateRoute>
        } />

        <Route path="/leads/demo-done" element={
          <PrivateRoute>
            <DemoDone />
          </PrivateRoute>
        } />

        <Route path="/leads/lead-won" element={
          <PrivateRoute>
            <LeadWon />
          </PrivateRoute>
        } />

        <Route path="/leads/lead-lost" element={
          <PrivateRoute>
            <LeadLost />
          </PrivateRoute>
        } />

        <Route path="/usersidebar/users" element={
          <PrivateRoute>
            <User />
          </PrivateRoute>
        } />

        <Route path="/adduser" element={
          <PrivateRoute>
            <AddUser />
          </PrivateRoute>
        } />

        <Route path="/addproduct" element={
          <PrivateRoute>
            <AddProduct />
          </PrivateRoute>
        } />

        <Route path="/productdashboard" element={
          <PrivateRoute>
            <ProductDashboard />
          </PrivateRoute>
        } />

        <Route path="/usersidebar/availability" element={
          <PrivateRoute>
            <Booking />
          </PrivateRoute>
        } />

        <Route path="/edituser/:id" element={
          <PrivateRoute>
            <EditUser />
          </PrivateRoute>
        } />

        <Route path="/usersidebar/leads" element={
          <PrivateRoute>
            <ClientLeadsDashboard />
          </PrivateRoute>
        } />

        <Route path="/addlead" element={
          <PrivateRoute>
            <ClientLeads />
          </PrivateRoute>
        } />

        <Route path="/editproduct/:productCode" element={
          <PrivateRoute>
            <EditProduct />
          </PrivateRoute>
        } />
        <Route
  path="/usersidebar/expense-report"
  element={
    <ExpenseReport/>
  }
/>

        <Route path="/usersidebar/billing" element={
          <PrivateRoute>
            <BookingDashboard />
          </PrivateRoute>
        } />
        <Route path="/usersidebar/accountreport" element={
          <PrivateRoute>
            <AccountPage />
          </PrivateRoute>
        } />
         <Route path="/usersidebar/settings" element={
          <PrivateRoute>
            <BranchSettings />
          </PrivateRoute>
        } />
        <Route path="/usersidebar/clients" element={
          <PrivateRoute>
            <BookingDashboard />
          </PrivateRoute>
        } />
        <Route path="/usersidebar/Deletedbooking" element={
          <PrivateRoute>
            <DeletedHistoryPage />
          </PrivateRoute>
        } />
         <Route path="/usersidebar/calls" element={
          <PrivateRoute>
            <CallsPage />
          </PrivateRoute>
        } />
        <Route path="/usersidebar/creditnote" element={
          <PrivateRoute>
            <CreditNoteDashboard />
          </PrivateRoute>
        } />
         <Route path="/add-credit-note" element={
          <PrivateRoute>
            <GenerateCreditNote />
          </PrivateRoute>
        } />
        <Route path="/edit-credit-note/:id" element={
          <PrivateRoute>
            <EditCreditNote />
          </PrivateRoute>
        } />
        <Route path="/attendanceoverview" element={
  <PrivateRoute>
  <AttendanceOverviewPage />
  </PrivateRoute>
} />

<Route path="/manage-banners" element={
  <PrivateRoute>
  <ManageBanners />
  </PrivateRoute>
} />
<Route path="/manage-collections" element={
  <PrivateRoute>
  <ManageCollections />
  </PrivateRoute>
} />
<Route path="/manage-promotions" element={
  <PrivateRoute>
  <ManagePromotions/>
  </PrivateRoute>
} />
<Route path="/manage-subcollection" element={
  <PrivateRoute>
  <ManageSubCollections/>
  </PrivateRoute>
} />
<Route path="/manage-occasions" element={
  <PrivateRoute>
  <ManageOccasions/>
  </PrivateRoute>
} />
<Route
  path="/attendance/:userId"
  element={
    <EmployeeAttendanceDetailsPage />
  }
/>
<Route path="/leaverequest" element={
  <PrivateRoute>
  <LeaveRequestsPage/>
  </PrivateRoute>
} />
<Route
  path="/credit-history/:id"
  element={
      <PrivateRoute>
  <CreditHistory />
  </PrivateRoute>}
/>
        <Route path="/usersidebar/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path='/editclientlead/:id' element={
          <PrivateRoute>
            <EditCLead />
          </PrivateRoute>
        } />
        <Route path='/edittemplate/:id' element={
          <PrivateRoute>
            <EditTemplate />
          </PrivateRoute>
        } />

        <Route path="/forgot-password" element={
          <PrivateRoute>
            <ForgotPassword />
          </PrivateRoute>
        } />

        <Route path="/report" element={
          <PrivateRoute>
            <ProductReport />
          </PrivateRoute>
        } />

        <Route path="/booking-details/:receiptNumber" element={
          <PrivateRoute>
            <BookingDetailsPage />
          </PrivateRoute>
        } />

        <Route path="/addtemplate" element={
          <PrivateRoute>
            <CreateTemplatePage />
          </PrivateRoute>
        } />

        {/* Nested Routes Example */}
        <Route path="/" element={<Layout />}>
          <Route path="superadmin" element={
            <PrivateRoute>
              <CreateSuperAdmin />
            </PrivateRoute>
          } />
          <Route path="profile" element={
            <PrivateRoute>
              <SingleComponent />
            </PrivateRoute>
          } />

          
          <Route path="overview" element={
            <PrivateRoute>
              <Overview />
            </PrivateRoute>
          } />
          <Route path="templates-dashboard" element={
            <PrivateRoute>
              <TemplatesDashboard />
            </PrivateRoute>
          } />
        </Route>
      </Routes>
      </InactivityGuard>
    </Router>
  </UserProvider>
);

export default App;
