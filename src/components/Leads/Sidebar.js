import React from 'react';

import {
  Link,
  useLocation
} from 'react-router-dom';

import {
  FaSignOutAlt,
  FaBuilding,
  FaUsers,
  FaChartLine,
  FaClipboardList,
  FaUserCheck,
  FaTimesCircle,
  FaClock,
  FaCheckCircle,
  FaBolt
} from 'react-icons/fa';

import './Sidebar.css';

const Sidebar = ({ isOpen }) => {

  const location = useLocation();

  return (

    <aside className={`premium-sidebar ${isOpen ? 'sidebar-expanded' : ''}`}>

      {/* LOGO */}

      <div className="sidebar-top-section">

        <div className="sidebar-logo-wrapper">

          <div className="sidebar-logo-icon">
            CRM
          </div>

          

        </div>

      </div>

      {/* NAVIGATION */}

      <nav className="sidebar-navigation">

        {/* LEADS */}

        <div className="sidebar-menu-section">

          <div className="sidebar-section-title">
            Leads Management
          </div>

          <ul className="sidebar-menu-list">

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads">

                <FaClipboardList />

                <span>
                  All Leads
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads/fresh-leads' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads/fresh-leads">

                <FaBolt />

                <span>
                  Fresh Leads
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads/detail-shared' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads/detail-shared">

                <FaUsers />

                <span>
                  Detail Shared
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads/demo-scheduled' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads/demo-scheduled">

                <FaClock />

                <span>
                  Demo Scheduled
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads/demo-done' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads/demo-done">

                <FaCheckCircle />

                <span>
                  Demo Done
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads/lead-won' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads/lead-won">

                <FaUserCheck />

                <span>
                  Lead Won
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/leads/lead-lost' ? 'sidebar-active' : ''
            }`}>

              <Link to="/leads/lead-lost">

                <FaTimesCircle />

                <span>
                  Lead Lost
                </span>

              </Link>

            </li>

          </ul>

        </div>

        {/* CLIENTS */}

        <div className="sidebar-menu-section">

          <div className="sidebar-section-title">
            Clients & Branches
          </div>

          <ul className="sidebar-menu-list">

            <li className={`sidebar-menu-item ${
              location.pathname === '/branches' ? 'sidebar-active' : ''
            }`}>

              <Link to="/branches">

                <FaBuilding />

                <span>
                  All Branches
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/branches/active' ? 'sidebar-active' : ''
            }`}>

              <Link to="/branches/active">

                <FaChartLine />

                <span>
                  Active Clients
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/branches/deactive' ? 'sidebar-active' : ''
            }`}>

              <Link to="/branches/deactive">

                <FaTimesCircle />

                <span>
                  Expired Clients
                </span>

              </Link>

            </li>

            <li className={`sidebar-menu-item ${
              location.pathname === '/branches/expiring-soon' ? 'sidebar-active' : ''
            }`}>

              <Link to="/branches/expiring-soon">

                <FaClock />

                <span>
                  Expiring Soon
                </span>

              </Link>

            </li>

          </ul>

        </div>

      </nav>

      {/* FOOTER */}

      <div className="sidebar-footer">

        <Link
          to="/logout"
          className="sidebar-logout-btn"
        >

          <FaSignOutAlt />

          <span>
            Logout
          </span>

        </Link>

      </div>

    </aside>

  );
};

export default Sidebar;