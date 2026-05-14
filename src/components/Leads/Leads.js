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
  const [isImporting, setIsImporting] = useState(false);

const [importProgress, setImportProgress] = useState(0);

const [duplicateCount, setDuplicateCount] = useState(0);

const [successCount, setSuccessCount] = useState(0);

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

  const handleImport = async (event) => {

  const file = event.target.files[0];

  if (file) {

    setIsImporting(true);

    setImportProgress(0);

    setDuplicateCount(0);

    setSuccessCount(0);

    Papa.parse(file, {

      header: true,

      skipEmptyLines: true,

      complete: async (result) => {

        try {

          const existingNumbers = new Set(

            leads
              .map((lead) =>
                String(
                  lead.contactNumber || ''
                ).trim()
              )
              .filter(Boolean)
          );

          const csvNumbers = new Set();

          const duplicateLeads = [];

          const uniqueLeads = [];

          result.data.forEach((row) => {

            const phone = String(
              row.contactNumber || ''
            ).trim();

            if (!phone) return;

            // duplicate in database
            if (existingNumbers.has(phone)) {

              duplicateLeads.push(row);

              return;
            }

            // duplicate inside csv
            if (csvNumbers.has(phone)) {

              duplicateLeads.push(row);

              return;
            }

            csvNumbers.add(phone);

            let parsedNextFollowup = null;

            if (
              row.nextFollowup &&
              !isNaN(new Date(row.nextFollowup))
            ) {

              parsedNextFollowup =
                new Date(
                  row.nextFollowup
                ).toISOString();
            }

            const newLead = {
              ...row,
              nextFollowup:
                parsedNextFollowup,
            };

            delete newLead.id;

            uniqueLeads.push(newLead);
          });

          setDuplicateCount(
            duplicateLeads.length
          );

          // SAVE WITH LIVE PROGRESS
          const leadsCollection =
            collection(db, 'leads');

          let savedCount = 0;

          for (const lead of uniqueLeads) {

            await addDoc(
              leadsCollection,
              lead
            );

            savedCount++;

            setSuccessCount(savedCount);

            setImportProgress(

              Math.round(
                (savedCount /
                  uniqueLeads.length) *
                100
              )
            );
          }

          toast.success(
            `${savedCount} leads imported successfully`
          );

          if (
            duplicateLeads.length > 0
          ) {

            toast.warning(
              `${duplicateLeads.length} duplicate leads skipped`
            );
          }

        } catch (error) {

          console.error(error);

          toast.error(
            'Import failed'
          );

        } finally {

          setIsImporting(false);
        }
      },

      error: (error) => {

        console.error(error);

        toast.error(
          'CSV parsing failed'
        );

        setIsImporting(false);
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
  const handleRemoveDuplicates = async () => {

  try {

    toast.info('Checking duplicates...');

    const snapshot = await getDocs(
      collection(db, 'leads')
    );

    const allLeads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // STATUS PRIORITY
    const statusPriority = {
      'fresh lead': 1,
      'details shared': 2,
      'demo scheduled': 3,
      'demo done': 4,
      'lead won': 5,
      'lead lost': 0,
    };

    // GROUP LEADS BY PHONE NUMBER
    const groupedLeads = {};

    allLeads.forEach((lead) => {

      const phone = String(
        lead.contactNumber || ''
      ).trim();

      if (!phone) return;

      if (!groupedLeads[phone]) {

        groupedLeads[phone] = [];
      }

      groupedLeads[phone].push(lead);
    });

    const idsToDelete = [];

    Object.values(groupedLeads).forEach((group) => {

      // NO DUPLICATES
      if (group.length <= 1) return;

      // SORT BY HIGHEST STATUS
      group.sort((a, b) => {

        const priorityA =
          statusPriority[
            (a.status || '').toLowerCase()
          ] || 0;

        const priorityB =
          statusPriority[
            (b.status || '').toLowerCase()
          ] || 0;

        return priorityB - priorityA;
      });

      // KEEP FIRST LEAD
      const originalLead = group[0];

      console.log(
        'Keeping Original:',
        originalLead
      );

      // DELETE REST
      for (let i = 1; i < group.length; i++) {

        idsToDelete.push(group[i].id);
      }
    });

    console.log(
      'Duplicate IDs:',
      idsToDelete
    );

    // DELETE DUPLICATES
    await Promise.all(

      idsToDelete.map((id) =>

        deleteDoc(doc(db, 'leads', id))
      )
    );

    toast.success(
      `${idsToDelete.length} duplicate leads deleted successfully`
    );

    // REFRESH LEADS
    const refreshedSnapshot =
      await getDocs(
        collection(db, 'leads')
      );

    const refreshedLeads =
      refreshedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    setLeads(refreshedLeads);

  } catch (error) {

    console.error(error);

    toast.error(
      'Duplicate cleanup failed'
    );
  }
};
const [isUpdatingLost, setIsUpdatingLost] =
  useState(false);

const [lostProgress, setLostProgress] =
  useState(0);

const [lostUpdatedCount, setLostUpdatedCount] =
  useState(0);

const handleNoContactLeads = async () => {

  try {

    setIsUpdatingLost(true);

    setLostProgress(0);

    setLostUpdatedCount(0);

    const noContactLeads =
      leads.filter((lead) => {

        const contact = String(
          lead.contactNumber || ''
        ).trim();

        return !contact;
      });

    if (noContactLeads.length === 0) {

      toast.info(
        'No leads without contact number'
      );

      setIsUpdatingLost(false);

      return;
    }

    let updatedCount = 0;

    for (const lead of noContactLeads) {

      await updateDoc(
        doc(db, 'leads', lead.id),
        {
          status: 'Lead Lost',
        }
      );

      updatedCount++;

      setLostUpdatedCount(
        updatedCount
      );

      setLostProgress(
        Math.round(
          (updatedCount /
            noContactLeads.length) *
          100
        )
      );
    }

    // UPDATE LOCAL STATE
    const updatedLeads = leads.map(
      (lead) => {

        const contact = String(
          lead.contactNumber || ''
        ).trim();

        if (!contact) {

          return {
            ...lead,
            status: 'Lead Lost',
          };
        }

        return lead;
      }
    );

    setLeads(updatedLeads);

    toast.success(
      `${updatedCount} leads moved to Lead Lost`
    );

  } catch (error) {

    console.error(error);

    toast.error(
      'Failed to update leads'
    );

  } finally {

    setIsUpdatingLost(false);
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
  onClick={handleNoContactLeads}
>
  No Contact → Lead Lost
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
  className="glass-btn"
  onClick={handleRemoveDuplicates}
>
  Remove Duplicates
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
          {
  isUpdatingLost && (

    <div className="import-status-box">

      <h3>
        Updating Lead Lost...
      </h3>

      <p>
        Progress: {lostProgress}%
      </p>

      <p>
        Updated Leads:
        {lostUpdatedCount}
      </p>

      <div className="progress-bar">

        <div
          className="progress-fill"
          style={{
            width: `${lostProgress}%`
          }}
        />

      </div>

    </div>
  )
}
          {
  isImporting && (

    <div className="import-status-box">

      <h3>
        Importing Leads...
      </h3>

      <p>
        Progress: {importProgress}%
      </p>

      <p>
        Successfully Imported:
        {successCount}
      </p>

      <p>
        Duplicate Skipped:
        {duplicateCount}
      </p>

      <div className="progress-bar">

        <div
          className="progress-fill"
          style={{
            width: `${importProgress}%`
          }}
        />

      </div>

    </div>
  )
}

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