import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FaSearch, FaFilter, FaDownload,  FaCopy, FaPlus, FaEdit, FaTrash, FaUpload} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse'; // Import PapaParse for CSV operations
import './CleadsDash.css';
import CSidebar from '../../UserDashboard/UserSidebar'; // Import the Sidebar component
import ClientHeader from '../../UserDashboard/UserHeader'; // Import the Header component
import { useUser } from '../../Auth/UserContext'; // Assuming you're using a UserContext for branchCode
import CRightSidebar from './rsidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ClientLeadsDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0); // State to keep track of total leads
  const [loading, setLoading] = useState(true); // Loading state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [searchField, setSearchField] = useState('leadName'); // Search field state
  const [originalLeads, setOriginalLeads] = useState([]);
  const navigate = useNavigate();
  const { userData } = useUser(); // Access userData from the context
  const [selectedLead, setSelectedLead] = useState(null);
const [isSidebarOpen, setIsSidebarOpen] = useState(false);


useEffect(() => {
  const fetchLeads = async () => {
    if (!userData?.branchCode) return; // Ensure branchCode exists

    setLoading(true);
    try {
      const leadsRef = collection(db, `products/${userData.branchCode}/clientleads`);
      const querySnapshot = await getDocs(leadsRef);

      const fetchedLeads = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLeads(fetchedLeads);
      setOriginalLeads(fetchedLeads);
      setTotalLeads(fetchedLeads.length);
    } catch (error) {
      console.error('Error fetching client leads:', error);
      toast.error('Failed to fetch client leads.');
    } finally {
      setLoading(false);
    }
  };

  fetchLeads();
}, [userData?.branchCode]); // Re-run when branchCode changes

const handleDelete = async (id) => {
  const confirmDelete = window.confirm('Are you sure you want to delete this lead?');
  if (confirmDelete) {
    try {
      const leadDocRef = doc(db, `products/${userData.branchCode}/clientleads`, id);
      await deleteDoc(leadDocRef);

      setLeads(leads.filter((lead) => lead.id !== id));
      setTotalLeads((prev) => prev - 1);
      toast.success('Client lead deleted successfully.');
    } catch (error) {
      console.error('Error deleting client lead:', error);
      toast.error('Failed to delete client lead.');
    }
  }
};

  const handleEdit = (id) => {
    navigate(`/editclientlead/${id}`);
  };
  const handleOpenSidebar = (lead) => {
    setSelectedLead(lead);
    setIsSidebarOpen(true);
  };


  const handlecopy = (lead) => {
    // Destructure product details from the product object
    const { leadName, mobileNo, requirement, email, source, stage, eventDate, followupDate } = lead;
  
    // Format the text for copying
    const formattedText = `
      Lead Name: ${leadName || '-'}
      Mobile No: ${mobileNo || '-'}
      Requirement: ${requirement || '-'}
      Email: ${email || '-'}
      Source: ${source || '-'}
      Stage: ${stage || '-'}
      Event Date: ${eventDate || '-'}
      Follow up Date: ${followupDate || '-'}
      
    `;
  
    // Copy to clipboard
    navigator.clipboard.writeText(formattedText.trim());
  
    // Display a confirmation alert
    toast.success("Product details copied to clipboard:\n" );
  };
  const handleSearch = () => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (lowerCaseQuery === '') {
      setLeads(originalLeads); // Show all leads if search query is empty
    } else {
      const filteredLeads = originalLeads.filter(lead =>
        lead[searchField]?.toLowerCase().includes(lowerCaseQuery)
      );
      setLeads(filteredLeads);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, searchField]);

  const exportToCSV = () => {
    const csv = Papa.unparse(leads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'clientleads.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <CSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="dashboard-content">
        <ClientHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <h2 style={{ marginLeft: '20px', marginTop: '100px' }} >Total Leads</h2>
        <p style={{ marginLeft: '20px' }}>{totalLeads} Leads</p>
        <div className="toolbar-container">
          <div className="search-bar-container7">
            
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="search-dropdown7"
              
            >
              <option value="leadName">Lead Name</option>
              <option value="mobileNo">Contact No</option>
              <option value="requirement">Requirement</option>
              <option value="email">Email</option>
              <option value="source">Source</option>
              <option value="stage">Status</option>
              <option value="followupDate">Next-Followup Date</option>
              
            </select>
            <input
              type="text"
              placeholder={`Search by..`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          

          <div className="action-buttons">
          <label className="export-button" onClick={exportToCSV}>
          <FaUpload />
              Export
              
            </label>
            
            
            <label className="add-product-button" onClick={() => navigate('/addlead')}>
          <FaPlus />
              Add lead
            </label>
          </div>

        </div>
        <div className="table-container">
          {loading ? (
            <p>Loading client leads...</p>
          ) : leads.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Contact No</th>
                  <th>Email</th>
                  <th>Event Date</th>
                  <th>Requirement</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Next Follow-up</th>
                  
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td onClick={() => handleOpenSidebar(lead)}>{lead.leadName}</td>
                    <td>{lead.mobileNo}</td>
                    <td>{lead.email}</td>
                    <td>{lead.eventDate ? lead.eventDate.toLocaleString() : 'N/A'}</td>

                    <td>{lead.requirement}</td>
                    <td>{lead.source}</td>
                    <td>{lead.stage}</td>
                    <td>{lead.followupDate ? lead.followupDate.toLocaleString() : 'N/A'}</td>
                    <td>
                    <div className="action-buttons">
                      <label onClick={() => handlecopy(lead)}><FaCopy style={{ color: '#757575', cursor: 'pointer' }} /> </label> {/* Pass the product object */}


                      <label onClick={() => handleEdit(lead.id)}><FaEdit style={{ color: '#757575' , cursor: 'pointer'}} /></label>
                      {userData?.role !== 'Subuser' && (
            <label onClick={() => handleDelete(lead.id)}>
              <FaTrash style={{ color: '#757575', cursor: 'pointer' }} />
            </label>
          )}
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No client leads found</p>
          )}
           <ToastContainer/>
        </div>
      </div>
      <CRightSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedLead={selectedLead}
      />
      
    </div>

  );
};

export default ClientLeadsDashboard;