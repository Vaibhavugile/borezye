
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse'; // Import PapaParse for CSV handling
import editIcon from '../../assets/Edit.png';
import deleteIcon from '../../assets/Trash Can - Copy.png';
import downloadIcon from '../../assets/Download.png'; // Add icon for download
import uploadIcon from '../../assets/Upload.png'; // Add icon for upload
import Sidebar from '../Leads/Sidebar';
import Header from '../Leads/Header';
import './AdminDashboard.css';
import search from '../../assets/Search.png';
import RightSidebar from '../Leads/RightSidebar';
import { FaDownload, FaUpload, FaPlus, FaEdit, FaCopy, FaWhatsapp } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify


const AdminDashboard = () => {
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('branchName');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedContactNo, setSelectedContactNo] = useState(null);

  const [templates, setTemplates] = useState([]);




  const handleBranchClick = (branch) => {
    setSelectedBranch(branch);
    setRightSidebarOpen(true);
  };

  const closeRightSidebar = () => {
    setRightSidebarOpen(false);
  };

  useEffect(() => {
    const fetchBranches = async () => {
      const branchesCollection = collection(db, 'branches');
      const branchSnapshot = await getDocs(branchesCollection);
      const branchList = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBranches(branchList);
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const status = path.split('/').pop();

    const applyFilter = () => {
      let filtered = branches;

      if (status === 'active') {
        filtered = filtered.filter(branch => calculateRemainingDays(branch.deactiveDate) > 0);
      } else if (status === 'deactive') {
        filtered = filtered.filter(branch => calculateRemainingDays(branch.deactiveDate) <= 0);
      } else if (status === 'expiring-soon') {
        const currentDate = new Date();
        filtered = filtered.filter(branch => calculateRemainingDays(branch.deactiveDate) <= 7 && calculateRemainingDays(branch.deactiveDate) > 0);
      }

      filtered = filtered.filter(branch => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const fieldValue = branch[searchField]?.toString().toLowerCase();
        return fieldValue && fieldValue.includes(lowerCaseQuery);
      });

      setFilteredBranches(filtered);
    };

    applyFilter();
  }, [branches, location.pathname, searchQuery, searchField]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'branches', id));
      setBranches(branches.filter(branch => branch.id !== id));
    } catch (error) {
      console.error('Error deleting branch:', error);
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-branch/${id}`);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'object' && date.seconds) { // Check if it's a Firestore timestamp
      const formattedDate = new Date(date.seconds * 1000);
      return formattedDate.toLocaleDateString();
    }
    return new Date(date).toLocaleDateString(); // Fallback for other date formats
  };



  const filterTitleMap = {
    'all': 'All Branches',
    'active': 'Active Branches',
    'deactive': 'Deactive Branches',
    'expiring-soon': 'Expiring Soon',
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(filteredBranches);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'branches.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const calculateRemainingDays = (deactiveDate) => {
    if (!deactiveDate) return 'N/A'; // Check if deactiveDate is null or invalid

    let endDate;

    // Check if deactiveDate is a Firestore timestamp
    if (typeof deactiveDate === 'object' && deactiveDate.seconds) {
      endDate = new Date(deactiveDate.seconds * 1000); // Convert Firestore timestamp to Date
    } else {
      endDate = new Date(deactiveDate); // Fallback for other date formats
    }

    const today = new Date();
    const diffTime = endDate - today;

    if (diffTime < 0) {
      return 0; // If the date has already passed, return 0
    }

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Calculate remaining days
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (result) => {
          const importedBranches = result.data.map((row) => ({
            ...row,
            endDate: new Date(row.endDate).toISOString(),
          }));
          setBranches(importedBranches);
        },
      });
    }
  };

  const handlecopy = (branch) => {
    // Destructure product details from the product object
    const { branchName, branchCode, emailId, location, ownerName, subscriptionType, status, activeDate, deactiveDate, amount } = branch;
    // Format the text for copying
    const formattedText = `
      Business Name: ${branchName || '-'}
      Branch Code: ${branchCode || '-'}
      Email ID: ${emailId || '-'}
      Location: ${location || '-'}
      Owner Name: ${ownerName || '-'}
      Subscription Type: ${subscriptionType || '-'}
      
      Status: ${status || '-'}
      Active Date: ${activeDate || '-'}
      Deactive Date: ${deactiveDate || '-'}
      Amount: ${amount || '-'}
      
    `;

    // Copy to clipboard
    navigator.clipboard.writeText(formattedText.trim());

    // Display a confirmation alert
    alert("Branch details copied to clipboard:\n");
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesCol = query(
          collection(db, "Stemplates"),


        );

        const templatesSnapshot = await getDocs(templatesCol);
        const templatesList = templatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTemplates(templatesList);
      } catch (error) {
        toast.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [isModalOpen]);

  // Function to send WhatsApp message
  const sendWhatsAppMessage = (contactNumber, message) => {
    if (!contactNumber) {
      toast.error("No contact number provided!");
      return;
    }

    // Check if the contact number starts with +91 or not
    const formattedContactNo = contactNumber.startsWith("+91")
      ? contactNumber
      : `+91${contactNumber}`;

    const whatsappURL = `https://api.whatsapp.com/send?phone=${formattedContactNo}&text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");
  };


  // Handle template click and send WhatsApp message
  const handleTemplateClick = (template) => {
    if (!selectedBranch) {
      toast.error("No branch selected!");
      return;
    }

    const templateBody = template.body;

    // Replace placeholders with branch data
    const message = templateBody
      .replace("{branchCode}", selectedBranch.branchCode || "")
      .replace("{branchName}", selectedBranch.branchName || "")
      .replace("{contactNumber}", selectedBranch.contactNumber || "")
      .replace("{emailId}", selectedBranch.emailId || "")
      .replace("{ownerName}", selectedBranch.ownerName || "")
      .replace("{subscriptionType}", selectedBranch.subscriptionType || "")
      .replace("{activeDate}", selectedBranch.activeDate || "")
      .replace("{deactiveDate}", selectedBranch.deactiveDate || "")
      .replace("{amount}", selectedBranch.amount || "")
      .replace("{password}", selectedBranch.password || "")
      .replace("{location}", selectedBranch.location || "")

      .replace("{numberOfUsers}", selectedBranch.numberOfUsers || "");

    sendWhatsAppMessage(selectedContactNo, message);

    // Close modal after sending the message
    setIsModalOpen(false);
  };

  // Handle contact number selection
  const handleContactNumberClick = (branch) => {
    setSelectedContactNo(branch.contactNumber);
    setSelectedBranch(branch);
    setIsModalOpen(true);
  };
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const toggleOverlay = () => {
    setIsOverlayOpen((prevState) => !prevState);
  };
   useEffect(() => {
      if (isModalOpen) {
        document.body.classList.add('modal-open'); // Add class when modal is open
      } else {
        document.body.classList.remove('modal-open'); // Remove class when modal is closed
      }
    }, [isModalOpen]);

  return (
    <div className={`branches-page ${sidebarOpen ? 'branches-sidebar-open' : ''}`}>

  <Sidebar
    isOpen={sidebarOpen}
    onToggle={handleSidebarToggle}
  />

  <div className="branches-main-content">

    <Header
      onMenuClick={handleSidebarToggle}
      isSidebarOpen={sidebarOpen}
    />

    <div className="branches-content-wrapper">

      {/* PAGE HEADER */}

      <div className="branches-header-section">

        <div className="branches-title-wrapper">

          <h1 className="branches-page-title">

            {filterTitleMap[location.pathname.split('/').pop()] || 'All Branches'}

          </h1>

          <p className="branches-page-description">

            Manage all branch subscriptions, users and business operations

          </p>

        </div>

        <div className="branches-stats-wrapper">

          <div className="branches-stat-card">

            <span className="branches-stat-label">
              Total Branches
            </span>

            <h2 className="branches-stat-value">
              {filteredBranches.length}
            </h2>

          </div>

        </div>

      </div>

      {/* TOOLBAR */}

      <div className="branches-toolbar">

        {/* SEARCH */}

        <div className="branches-search-container">

          <img
            src={search}
            alt="search"
            className="branches-search-icon"
          />

          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="branches-search-select"
          >

            <option value="branchName">
              Branch Name
            </option>

            <option value="branchCode">
              Branch Code
            </option>

            <option value="location">
              Location
            </option>

            <option value="ownerName">
              Owner Name
            </option>

            <option value="status">
              Status
            </option>

            <option value="activeDate">
              Start Date
            </option>

            <option value="deactiveDate">
              End Date
            </option>

            <option value="amount">
              Amount
            </option>

          </select>

          <input
            type="text"
            className="branches-search-input"
            placeholder={`Search by ${searchField.replace(/([A-Z])/g, ' $1')}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

        </div>

        {/* ACTION BUTTONS */}

        <div className="branches-toolbar-actions">

          {/* EXPORT */}

          <button
            className="branches-secondary-btn"
            onClick={exportToCSV}
          >

            <FaUpload />

            Export

          </button>

          {/* IMPORT */}

          <button
            type="button"
            className="branches-secondary-btn"
            onClick={() => document.getElementById('branches-import-file').click()}
          >

            <FaDownload />

            Import

            <input
              type="file"
              id="branches-import-file"
              accept=".csv"
              onChange={handleImport}
              hidden
            />

          </button>

          {/* ADD BRANCH */}

          <button
            className="branches-primary-btn"
            onClick={() => navigate('/create-branch')}
          >

            <FaPlus />

            Add Branch

          </button>

        </div>

      </div>

      {/* TABLE CARD */}

      <div className="branches-table-card">

        <div className="branches-table-scroll">

          <table className="branches-table">

            <thead>

              <tr>

                <th>Sr. No.</th>
                <th>Branch Code</th>
                <th>Branch / Email</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Owner</th>
                <th>Subscription</th>
                <th>Users</th>
                <th>Password</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Fees</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Actions</th>
                <th>WhatsApp</th>

              </tr>

            </thead>

            <tbody>

              {filteredBranches.map((branch, index) => (

                <tr
                  key={branch.id}
                  className="branches-table-row"
                >

                  <td>{index + 1}</td>

                  <td>
                    {branch.branchCode}
                  </td>

                  {/* BRANCH INFO */}

                  <td>

                    <div className="branches-name-block">

                      <span className="branches-name-text">
                        {branch.branchName}
                      </span>

                      <small className="branches-email-text">
                        {branch.emailId}
                      </small>

                    </div>

                  </td>

                  <td>
                    {branch.contactNumber || 'N/A'}
                  </td>

                  <td>
                    {branch.location}
                  </td>

                  <td>
                    {branch.ownerName}
                  </td>

                  <td>
                    {branch.subscriptionType}
                  </td>

                  <td>
                    {branch.numberOfUsers}
                  </td>

                  <td>
                    {branch.password}
                  </td>

                  <td>
                    {formatDate(branch.activeDate) || 'N/A'}
                  </td>

                  <td>
                    {formatDate(branch.deactiveDate) || 'N/A'}
                  </td>

                  <td>
                    ₹{branch.amount}
                  </td>

                  <td>
                    {calculateRemainingDays(branch.deactiveDate)} days
                  </td>

                  {/* STATUS */}

                  <td>

                    <span
                      className={`branches-status-pill ${
                        calculateRemainingDays(branch.deactiveDate) > 7
                          ? 'branches-status-active'
                          : calculateRemainingDays(branch.deactiveDate) > 0
                          ? 'branches-status-warning'
                          : 'branches-status-expired'
                      }`}
                    >

                      {calculateRemainingDays(branch.deactiveDate) > 7
                        ? 'Active'
                        : calculateRemainingDays(branch.deactiveDate) > 0
                        ? 'Expiring Soon'
                        : 'Deactive'}

                    </span>

                  </td>

                  {/* ACTIONS */}

                  <td>

                    <div className="branches-action-group">

                      <button
                        className="branches-icon-btn"
                        onClick={() => handleEdit(branch.id)}
                      >

                        <FaEdit />

                      </button>

                      <button
                        className="branches-icon-btn"
                        onClick={() => handlecopy(branch)}
                      >

                        <FaCopy />

                      </button>

                    </div>

                  </td>

                  {/* WHATSAPP */}

                  <td>

                    <button
                      className="branches-whatsapp-btn"
                      onClick={() => handleContactNumberClick(branch)}
                    >

                      <FaWhatsapp />

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* TEMPLATE MODAL */}

      {isModalOpen && (

        <div className="branches-modal-overlay">

          <div className="branches-modal-card">

            <h3 className="branches-modal-title">
              Select a Template
            </h3>

            <div className="branches-template-list">

              {templates.map((template) => (

                <div
                  key={template.id}
                  className="branches-template-item"
                  onClick={() => handleTemplateClick(template)}
                >

                  {template.name}

                </div>

              ))}

            </div>

            <button
              className="branches-secondary-btn"
              onClick={() => setIsModalOpen(false)}
            >

              Close

            </button>

          </div>

        </div>

      )}

    </div>

  </div>

  <RightSidebar
    isOpen={rightSidebarOpen}
    onClose={closeRightSidebar}
    selectedBranch={selectedBranch}
  />

</div>
  );
};

export default AdminDashboard;
