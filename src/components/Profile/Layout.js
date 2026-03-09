import React from 'react';
import { Outlet, NavLink ,useNavigate} from 'react-router-dom';
import { useUser } from '../Auth/UserContext'; // Import the context
import logo from '../../assets/profile-logo.png';
import './Profile.css';
import backIcon from '../../assets/arrowiosback_111116.png'
const NavigationItem = ({ to, label }) => (
  <li>
    <NavLink to={to}>{label}</NavLink>
  </li>
);

const Layout = () => {
  const { userData } = useUser(); // Access userData from the context
  const navigate =useNavigate();
  const isBranchManager = userData.role === 'Branch Manager';
  const isSuperAdmin = userData.role === 'Super Admin';
  const issubusers = userData.role === 'Subuser ';


  return (
    <div className="dashboard-container1">
      <header className="header">
      <div >
        <img
          src={backIcon}
          alt="button10"
          onClick={() => navigate(isSuperAdmin ?"/leads":"/usersidebar/dashboard")} // Navigate to the profile page
        />
      </div>

        <div className="logo">
          <img src={logo} alt="BOREZY Logo" />
        </div>
        <div className="profile">
          <h3>{userData.name}</h3> {/* Display the user name */}
          <p>{userData.branchName}</p> {/* Display the branch name */}
        </div>
      </header>
      
      <div className='profile1'>
        <nav>
          <ul>
            <NavigationItem to={isSuperAdmin ? "/profile" : "/overview"} label={isSuperAdmin ? "Overview" : "Templates"} />

            <NavigationItem to={isSuperAdmin ? "/superadmin" : "/usersidebar/users"} label={isSuperAdmin ? "Super Admin" : "Create Users"} />

            {/* <NavigationItem to="/transaction" label="Transaction" /> */}
            
            {isSuperAdmin && (
        <NavigationItem 
          to="/templates-dashboard" 
          label="Manage Templates" // Label for the new link
        />
      )}
            {isBranchManager ? (
              <NavigationItem to="/change-password" label="Change Password" /> // Link to Change Password
            ) : (
              <NavigationItem to="/change-password" label="Change Password" /> // Link to Settings
      
            )}
            
          </ul>
        </nav>
      </div>
      
      <main>
        <Outlet /> {/* Render the nested route content here */}
      </main>
    </div>
  );
};

export default Layout;
