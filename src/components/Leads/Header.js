import React from 'react';

import {
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  FaBars,
  FaBell,
  FaSearch
} from 'react-icons/fa';

import logo1 from '../../assets/Bore.jpg';

import profileIcon from '../../assets/Profile.png';

import './Header.css';

const Header = ({ onMenuClick, isSidebarOpen }) => {

  const navigate = useNavigate();

  const location = useLocation();

  /* HIDE HEADER ROUTES */

  const hiddenRoutes = [
    '/login',
    '/signup'
  ];

  const shouldHideHeader =
    hiddenRoutes.includes(location.pathname);

  if (shouldHideHeader) return null;

  return (

    <header className={`premium-header ${isSidebarOpen ? 'header-sidebar-open' : ''}`}>

      {/* LEFT SECTION */}

      <div className="header-left-section">

        {/* MENU BUTTON */}

        <button
          className="header-menu-btn"
          onClick={onMenuClick}
        >

          <FaBars />

        </button>

        {/* LOGO */}

        <div className="header-brand-wrapper">

          <img
            src={logo1}
            alt="logo"
            className="header-brand-logo"
          />

          

        </div>

      </div>

      {/* CENTER SEARCH */}

      
      {/* RIGHT SECTION */}

      <div className="header-right-section">

        {/* NOTIFICATION */}

        <button className="header-notification-btn">

          <FaBell />

          <span className="notification-dot"></span>

        </button>

        {/* PROFILE */}

        <div
          className="header-profile-wrapper"
          onClick={() => navigate('/profile')}
        >

          <img
            src={profileIcon}
            alt="profile"
            className="header-profile-image"
          />

          <div className="header-profile-info">

            <h4>
              Admin User
            </h4>

            <span>
              Super Admin
            </span>

          </div>

        </div>

      </div>

    </header>

  );
};

export default Header;