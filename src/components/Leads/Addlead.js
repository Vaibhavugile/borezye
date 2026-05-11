import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './EditLead.css';
import Header from './Header';
import Sidebar from './Sidebar';


const Lead = () => {
    const [formData, setFormData] = useState({
      businessName: '',
      businessType: '',
      contactNumber: '',
      emailId: '',
      location: '',
      assignedTo: '',
      source: '',
      nextFollowup: '',
      status: 'details shared',
      comment: '' // Added comment field
    });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleCreateClientLead = async (e) => {
    e.preventDefault();

    const { businessName, businessType, contactNumber, emailId, location, assignedTo, source, nextFollowup, status, comment } = formData;

    const today = new Date().toISOString().split('T')[0];
    if (new Date(nextFollowup) < new Date(today)) {
      toast.error('Next follow-up date cannot be in the past.');
      return;
    }

    try {
      await addDoc(collection(db, 'leads'), {
        businessName,
        businessType,
        contactNumber,
        emailId,
        location,
        assignedTo,
        source,
        nextFollowup,
        status,
        comment // Storing comment in the database
      });

      toast.success('Client lead created successfully.');
      setTimeout(() => {
        navigate('/leads');
      }, 1500);
    } catch (error) {
      toast.error('Failed to create client lead. Please try again.');
    }
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
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
            Add Lead
          </h1>

          <p className="edit-page-subtitle">
            Create and manage a new customer lead
          </p>

        </div>

      </div>

      {/* FORM */}

      <form
        onSubmit={handleCreateClientLead}
        className="lead-form-card"
      >

        <div className="lead-form-grid">

          {/* LEFT COLUMN */}

          <div className="lead-form-column">

            {/* BUSINESS NAME */}

            <div className="lead-form-group">

              <label>
                Business Name
              </label>

              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter business name"
                required
              />

            </div>

            {/* CONTACT NUMBER */}

            <div className="lead-form-group">

              <label>
                Contact Number
              </label>

              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="Enter contact number"
                required
              />

            </div>

            {/* EMAIL */}

            <div className="lead-form-group">

              <label>
                Email Address
              </label>

              <input
                type="email"
                name="emailId"
                value={formData.emailId}
                onChange={handleChange}
                placeholder="Enter email address"
                
              />

            </div>

            {/* FOLLOWUP */}

            <div className="lead-form-group">

              <label>
                Next Follow-up
              </label>

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

            {/* BUSINESS TYPE */}

            <div className="lead-form-group">

              <label>
                Business Type
              </label>

              <input
                type="text"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                placeholder="Enter business type"
                required
              />

            </div>

            {/* STATUS */}

            <div className="lead-form-group">

              <label>
                Lead Status
              </label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >

                <option value="">
                  Select status
                </option>

                <option value="fresh lead">
                  Fresh Lead
                </option>

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

            {/* SOURCE */}

            <div className="lead-form-group">

              <label>
                Lead Source
              </label>

              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                required
              >

                <option value="">
                  Select source
                </option>

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

            {/* LOCATION */}

            <div className="lead-form-group">

              <label>
                Location
              </label>

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

        {/* COMMENTS */}

        <div className="lead-form-group full-width-group">

          <label>
            Comments
          </label>

          <textarea
            name="comment"
            value={formData.comment}
            onChange={handleChange}
            placeholder="Enter additional comments or notes..."
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
            Add Lead
          </button>

        </div>

      </form>

      <ToastContainer />

    </div>

  </div>

</div>
  );
};

export default Lead;
