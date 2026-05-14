import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import './EditLead.css';
import Header from './Header';
import Sidebar from './Sidebar';

const EditLead = () => {
  const { id } = useParams(); // Get lead ID from URL
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    contactNumber: '',
    emailId: '',
    location: '',
    assignedTo: '',
    source: '',
    nextFollowup: '',
    status: '',
    comment: '' // Added comment field

  });

  // Get today's date in yyyy-mm-dd format
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        const leadDoc = doc(db, 'leads', id);
        const leadSnapshot = await getDoc(leadDoc);
        if (leadSnapshot.exists()) {
          setFormData(leadSnapshot.data());
        } else {
          toast.error('Lead not found.');
        }
      } catch (error) {
        toast.error('Error fetching lead details.');
      }
    };

    fetchLeadData();
  }, [id]);

  // Function to handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();

    const { dateTimestamp } = formData;
    if (new Date(dateTimestamp) < new Date(today)) {
      toast.error('Date timestamp cannot be in the past.');
      return;
    }

    try {
      const leadDoc = doc(db, 'leads', id);
      await updateDoc(leadDoc, formData);
      toast.success('Lead details updated successfully.');
      setTimeout(() => {
        navigate('/leads'); // Navigate after a short delay
      }, 3500);
    } catch (error) {
      toast.error('Failed to update lead details. Please try again.');
    }
  };



  return (
   <div className={`edit-lead-page ${sidebarOpen ? 'sidebar-expanded' : ''}`}>

  <Sidebar
    isOpen={sidebarOpen}
    onToggle={handleSidebarToggle}
  />

  <div className="edit-lead-main">

    <Header
      onMenuClick={handleSidebarToggle}
      isSidebarOpen={sidebarOpen}
    />

    <div className="edit-lead-wrapper">

      {/* PAGE HEADER */}

      <div className="edit-page-header">

        <div className="edit-header-left">

          <h1 className="edit-page-title">
            Edit Lead
          </h1>

          <p className="edit-page-subtitle">
            Update and manage customer lead information
          </p>

        </div>

      </div>

      {/* FORM CARD */}

      <form
        onSubmit={handleUpdateLead}
        className="lead-form-card"
      >

        <div className="lead-form-grid">

          {/* LEFT COLUMN */}

          <div className="lead-form-column">

            <div className="lead-form-group">

              <label>Business Name</label>

              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter business name"
                
              />

            </div>

            <div className="lead-form-group">

              <label>Contact Number</label>

              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="Enter contact number"
                required
              />

            </div>

            <div className="lead-form-group">

              <label>Email Address</label>

              <input
                type="email"
                name="emailId"
                value={formData.emailId}
                onChange={handleChange}
                placeholder="Enter email address"
                
              />

            </div>

            <div className="lead-form-group">

              <label>Next Follow-up</label>

              <input
                type="datetime-local"
                name="nextFollowup"
                value={formData.nextFollowup}
                onChange={handleChange}
                
              />

            </div>

          </div>

          {/* RIGHT COLUMN */}

          <div className="lead-form-column">

            <div className="lead-form-group">

              <label>Business Type</label>

              <input
                type="text"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                placeholder="Enter business type"
              
              />

            </div>

            <div className="lead-form-group">

              <label>Lead Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
               
              >

                <option value="details shared">
                  Details Shared
                </option>

                <option value="demo scheduled">
                  Demo Scheduled
                </option>

                <option value="demo done">
                  Demo Done
                </option>

                <option value="lead won">
                  Lead Won
                </option>

                <option value="lead lost">
                  Lead Lost
                </option>

              </select>

            </div>

            <div className="lead-form-group">

              <label>Lead Source</label>

              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                required
              >

                <option value="google">
                  Google
                </option>

                <option value="walk in">
                  Walk In
                </option>

                <option value="insta">
                  Instagram
                </option>

                <option value="facebook">
                  Facebook
                </option>

              </select>

            </div>

            <div className="lead-form-group">

              <label>Location</label>

              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter location"
                required
              />

            </div>

          </div>

        </div>

        {/* COMMENT SECTION */}

        <div className="lead-form-group full-width-group">

          <label>Comments</label>

          <textarea
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            placeholder="Enter additional notes or comments..."
          />

        </div>

        {/* ACTION BUTTONS */}

        <div className="lead-form-actions">

          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate('/leads')}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-btn"
          >
            Update Lead
          </button>

        </div>

      </form>

      <ToastContainer />

    </div>

  </div>

</div>
  );
};

export default EditLead;
