import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc
} from 'firebase/firestore'; import { db } from '../../firebaseConfig';
import { useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import './Leads.css';
import 'react-toastify/dist/ReactToastify.css';
import '../UserDashboard/Clienleads/Cleads.css';

import Header from './Header';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import search from '../../assets/Search.png';

import { FaPlus, FaUpload, FaDownload, FaEdit, FaCopy } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('emailId');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [combinedLeads, setCombinedLeads] = useState([]);
  const [importedData, setImportedData] = useState([]); // Initialize as an empty array
  const [selectedLeads, setSelectedLeads] = useState([]);

  const [users, setUsers] = useState([]);

  const [bulkAssignedTo, setBulkAssignedTo] =
    useState('');

  // Update combined data when filteredLeads or importedData change
  useEffect(() => {
    setCombinedLeads([...filteredLeads, ...importedData]);
  }, [filteredLeads, importedData]);
  const handleBusinessNameClick = (lead) => {
    setSelectedLead(lead);
    setRightSidebarOpen(true);
    // ADDED LOG FOR DEBUGGING
    console.log("Leads.js: Selected Lead after click:", lead);
  };
  useEffect(() => {

    const fetchUsers = async () => {

      try {

        const snapshot =
          await getDocs(
            collection(db, 'superadmins')
          );

        const userList =
          snapshot.docs.map((doc) => ({

            id: doc.id,

            ...doc.data(),
          }));

        setUsers(userList);

      } catch (error) {

        console.error(
          'Error fetching users:',
          error
        );
      }
    };

    fetchUsers();

  }, []);
  const closeRightSidebar = () => {
    setRightSidebarOpen(false);
  };

  useEffect(() => {
    const fetchLeads = async () => {
      const leadsCollection = collection(db, 'leads');
      const leadSnapshot = await getDocs(leadsCollection);
      // MODIFIED LINE: Ensure doc.id takes precedence over any 'id' field in doc.data()
      const leadList = leadSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setLeads(leadList);
    };

    fetchLeads();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const status = path.split('/').pop();

    const applyFilter = () => {
      let filtered = leads;

      if (status === 'demo-scheduled') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'demo scheduled');
      } else if (status === 'detail-shared') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'details shared');
      } else if (status === 'fresh lead') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'fresh lead');
      } else if (status === 'fresh-lead') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'fresh lead');


      } else if (status === 'demo-done') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'demo done');
      } else if (status === 'lead-won') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'lead won');
      } else if (status === 'lead-lost') {
        filtered = filtered.filter(lead => (lead.status || '').toLowerCase() === 'lead lost');
      }

      filtered = filtered.filter(lead => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (searchField === 'nextFollowup') {
          // Return true immediately if the search query is empty to show all leads
          if (!searchQuery) return true;

          const leadDate = lead.nextFollowup ? new Date(lead.nextFollowup) : null;
          const queryDate = new Date(searchQuery);

          // Check if both dates are valid before comparing
          if (leadDate && !isNaN(leadDate) && !isNaN(queryDate)) {
            // Compare the dates by their string representation
            return leadDate.toDateString() === queryDate.toDateString();
          }
          return false; // If either date is invalid, it's not a match
        } else {
          return (lead[searchField] || '').toLowerCase().includes(lowerCaseQuery);
        }
      });

      setFilteredLeads(filtered);
    };

    applyFilter();
  }, [leads, location, searchQuery, searchField]);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'leads', id));
      setLeads(leads.filter(lead => lead.id !== id));
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-lead/${id}`);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const clearFilters = () => {

  setSearchQuery('');

  setSearchField('emailId');
};

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const filterTitleMap = {
    'all': 'All Leads',
    'fresh-lead': 'Fresh Lead',
    'detail-shared': 'Detail Shared',
    'demo-scheduled': 'Demo Scheduled',
    'demo-done': 'Demo Done',
    'lead-won': 'Lead Won',
    'lead-lost': 'Lead Lost',
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(filteredLeads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'leads.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    console.log("Selected File:", file); // Debug file selection

    if (file) {
      Papa.parse(file, {
        header: true, // Ensure CSV has headers
        skipEmptyLines: true, // Skip empty rows
        complete: async (result) => {
          console.log("Parsed Result:", result.data); // Debug parsed data
          const importedLeads = result.data
            .filter((row) => Object.values(row).some((value) => value !== null && value !== "")) // Remove empty rows
            .map((row) => {
              let parsedNextFollowup = null;
              if (row.nextFollowup && !isNaN(new Date(row.nextFollowup))) {
                parsedNextFollowup = new Date(row.nextFollowup).toISOString();
              }
              const newLead = { // Create a new object to avoid modifying the original row
                ...row,
                nextFollowup: parsedNextFollowup,
              };
              // IMPORTANT: Delete the 'id' field if it exists in the imported row
              // Firestore will generate its own unique ID with addDoc
              if (newLead.id !== undefined) {
                delete newLead.id;
              }
              return newLead;
            });

          console.log("Imported Leads:", importedLeads); // Debug processed leads
          setImportedData(importedLeads); // Update state

          try {
            // Save data to Firestore
            const leadsCollection = collection(db, 'leads'); // Replace 'leads' with your collection name
            for (const lead of importedLeads) {
              await addDoc(leadsCollection, lead);
            }
            console.log("Data saved to Firestore successfully!");
            toast.success("Leads imported and saved to database successfully!");
          } catch (error) {
            console.error("Error saving data to Firestore:", error); // Debug database save errors
            toast.error("Failed to save data to the database. Please try again.");
          }
        },
        error: (error) => {
          console.error("Error Parsing CSV:", error); // Debug any parsing errors
          toast.error("Error parsing the CSV file. Please check the file format.");
        },
      });
    }
  };




  const handlecopy = (leads) => {
    // Destructure product details from the product object
    const { businessName, contactNumber, emailId, location, source, status, nextFollowup } = leads;
    // Format the text for copying
    const formattedText = `
      Business Name: ${businessName || '-'}
      Mobile No: ${contactNumber || '-'}
      Email: ${emailId || '-'}
      Location: ${location || '-'}
      Source: ${source || '-'}
      Status: ${status || '-'}
      Follow up Date: ${nextFollowup || '-'}
      
    `;

    // Copy to clipboard
    navigator.clipboard.writeText(formattedText.trim());

    // Display a confirmation alert
    toast.success("Lead details copied to clipboard:\n");
  };
  const handleSelectLead = (id) => {

    setSelectedLeads((prev) =>

      prev.includes(id)

        ? prev.filter(
          (leadId) =>
            leadId !== id
        )

        : [...prev, id]
    );
  };
  const handleSelectAll = () => {

    if (
      selectedLeads.length ===
      filteredLeads.length
    ) {

      setSelectedLeads([]);

    } else {

      setSelectedLeads(
        filteredLeads.map(
          (lead) => lead.id
        )
      );
    }
  };
  const handleBulkAssign =
    async () => {

      if (!bulkAssignedTo) {

        toast.error(
          'Select user first'
        );

        return;
      }

      if (
        selectedLeads.length === 0
      ) {

        toast.error(
          'Select leads first'
        );

        return;
      }

      try {

        for (const leadId of selectedLeads) {

          await updateDoc(

            doc(db, 'leads', leadId),

            {
              assignedTo:
                bulkAssignedTo,
            }
          );
        }

        const updatedLeads =
          leads.map((lead) =>

            selectedLeads.includes(
              lead.id
            )

              ? {
                ...lead,

                assignedTo:
                  bulkAssignedTo,
              }

              : lead
          );

        setLeads(updatedLeads);

        setSelectedLeads([]);

        setBulkAssignedTo('');

        toast.success(
          'Leads assigned successfully'
        );

      } catch (error) {

        console.error(error);

        toast.error(
          'Error assigning leads'
        );
      }
    };
  return (
    <div className={`leads-dashboard ${sidebarOpen ? 'sidebar-expanded' : ''}`}>

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
      />

      <div
  className="leads-main-content"

  onClick={() => {

    if (sidebarOpen) {

      setSidebarOpen(false);
    }
  }}
>

        <Header
          onMenuClick={handleSidebarToggle}
          isSidebarOpen={sidebarOpen}
        />

        <div className="leads-page-wrapper">

          {/* TOP HEADER */}

          <div className="leads-top-section">

            <div className="page-heading-block">

              <h1 className="page-main-title">
                {filterTitleMap[location.pathname.split('/').pop()] || 'Total Leads'}
              </h1>

              <p className="page-subtitle">
                Track, manage and organize your customer leads efficiently
              </p>

            </div>

            <div className="top-stats-container">

              <div className="stats-card-modern">

                <span className="stats-label">
                  Total Leads
                </span>

                <h2 className="stats-value">
                  {filteredLeads.length}
                </h2>

              </div>

            </div>

          </div>

          {/* TOOLBAR */}

          <div className="toolbar-modern">

            {/* SEARCH */}

            <div className="search-box-modern">

              <img
                src={search}
                alt="search"
                className="search-icon-modern"
              />

              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="search-select-modern"
              >

                <option value="businessName">Business Name</option>
                <option value="contactNumber">Contact Number</option>
                <option value="emailId">Email ID</option>
                <option value="location">Location</option>
                <option value="assignedTo">Assigned To</option>
                <option value="source">Source</option>
                <option value="status">Status</option>
                <option value="nextFollowup">Next Followup Date</option>

              </select>

              {
                searchField === 'nextFollowup' ? (

                  <input
                    type="date"

                    className="search-input-modern"

                    value={searchQuery}

                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                  />

                ) : (

                  <input
                    type="text"

                    className="search-input-modern"

                    placeholder={`Search by ${searchField.replace(/([A-Z])/g, ' $1')}`}

                    value={searchQuery}

                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                  />
                )
              }
              <button
  className="clear-filter-btn"

  onClick={clearFilters}
>

  Clear

</button>

            </div>

            {/* ACTION BUTTONS */}

            <div className="toolbar-actions-modern">
              <select
                className="bulk-assign-select"
                value={bulkAssignedTo}

                onChange={(e) =>
                  setBulkAssignedTo(
                    e.target.value
                  )
                }

                className="search-select-modern"
              >

                <option value="">
                  Assign To
                </option>

                {users.map((user) => (

                  <option
                    key={user.id}

                    value={
                      user.name ||
                      user.email
                    }
                  >

                    {user.name ||
                      user.email}

                  </option>
                ))}
              </select>

              <button
                className="bulk-assign-btn"

                onClick={handleBulkAssign}
              >

                Bulk Assign

              </button>
              <button
                className="glass-btn"
                onClick={exportToCSV}
              >
                <FaUpload />
                Export
              </button>
              <button
                type="button"
                className="glass-btn"
                onClick={() => document.getElementById('import-file-input').click()}
              >

                <FaDownload />

                <span>Import</span>

                <input
                  type="file"
                  id="import-file-input"
                  accept=".csv"
                  onChange={handleImport}
                  hidden
                />

              </button>
              <button
                className="primary-btn-modern"
                onClick={() => navigate('/create-lead')}
              >

                <FaPlus />
                Add Lead

              </button>

            </div>

          </div>

          {/* TABLE SECTION */}

          <div className="table-card-modern">

            <div className="table-scroll-container">

              <table className="modern-leads-table">

                <thead>

                  <tr>

                    <th>

                      <input
                        type="checkbox"

                        checked={
                          selectedLeads.length ===
                          filteredLeads.length &&
                          filteredLeads.length > 0
                        }

                        onChange={handleSelectAll}
                      />

                    </th>

                    <th>Sr. No.</th>
                    <th>Business Name</th>
                    <th>Contact Number</th>
                    <th>Location</th>
                    <th>Business Type</th>

                    <th>Status</th>
                    <th>Next Followup</th>
                    <th>Source</th>
                    <th>Assigned To</th>



                    <th>Actions</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredLeads.map((lead, index) => (

                    <tr
                      key={lead.id}

                      className={`table-row-modern ${selectedLeads.includes(lead.id)
                          ? 'selected-row'
                          : ''
                        }`}
                    >
                      <td>

                        <input
                          type="checkbox"

                          checked={selectedLeads.includes(
                            lead.id
                          )}

                          onChange={() =>
                            handleSelectLead(
                              lead.id
                            )
                          }
                        />

                      </td>

                      <td>{index + 1}</td>


                      <td>

                        <span
                          className="business-name-modern"
                          onClick={() => handleBusinessNameClick(lead)}
                        >
                          {lead.businessName}
                        </span>

                      </td>


                      <td>{lead.contactNumber}</td>


                      <td>{lead.location}</td>
                      <td>{lead.businessType}</td>

                      <td>

                        <span className={`status-pill ${lead.status?.toLowerCase().replace(/\s/g, '-')}`}>
                          {lead.status}
                        </span>

                      </td>

                      <td>
                        {formatDate(lead.nextFollowup)}
                      </td>

                      <td>{lead.source}</td>
                      <td>{lead.assignedTo}</td>




                      <td>

                        <div className="table-actions-modern">

                          <button
                            className="table-icon-btn"
                            onClick={() => handleEdit(lead.id)}
                          >
                            <FaEdit />
                          </button>

                          <button
                            className="table-icon-btn"
                            onClick={() => handlecopy(lead)}
                          >
                            <FaCopy />
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

          <ToastContainer />

        </div>

      </div>

      <RightSidebar
        isOpen={rightSidebarOpen}
        onClose={closeRightSidebar}
        selectedLead={selectedLead}
      />

    </div>
  );
};

export default Leads;