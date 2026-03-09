import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../UserDashboard/Clienleads/Cleads.css';
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
    <div className={`add-lead-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
        <div className="add-lead-content">
          <Header onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />
          <h2 style={{ marginLeft: '20px', marginTop: '70px' }}>
            Add lead
          </h2>
          <p className="subheading">Fill out the form below to add a new lead</p>
            <form onSubmit={handleCreateClientLead} >
            <form className="add-user-form">
              <div className="form-left">
                <div className='lead'>
                <div className="lead-details">
                  <label htmlFor="name">Business Name</label>
                    <input 
                        type="text" 
                        name="businessName" 
                        value={formData.businessName} 
                        onChange={handleChange} 
                        placeholder="Enter Business Name" 
                        required 
                    />
                  </div>
                  <div className="lead-details">
                    <label htmlFor="contactno">Contact No.</label>
                      <input 
                          type="text" 
                          name="contactNumber" 
                          value={formData.contactNumber} 
                          onChange={handleChange} 
                          placeholder="Enter Mobile No" 
                          required 
                      />
                  </div>
                  <div className="lead-details">
                    <label htmlFor="email">Email</label>
                      <input 
                          type="text" 
                          name="emailId" 
                          value={formData.emailId} 
                          onChange={handleChange} 
                          placeholder="Enter Email-ID" 
                          required 
                      />
                  </div>
                  </div>

                  <div className="sub-left">
                  <label>Next Follow-Up</label>
                    <input 
                    type="datetime-local" 
                    name="nextFollowup" 
                    value={formData.nextFollowup} 
                    onChange={handleChange} 
                    required 
                    />
                  </div>
              

                  <div className="sub-right">
                    <label htmlFor="stage">Status</label>
                    <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleChange} 
                    required
                    >
                  <option value="">Select Stage</option>
                   <option value="fresh lead">Fresh Lead</option>
                   <option value="details shared">Details Shared</option>
                    <option value="demo scheduled">Demo Scheduled</option>
                    <option value="demo done">Demo Done</option>
                    <option value="lead won">Lead Won</option>
                    <option value="lead lost">Lead Lost</option>
                    </select>
                  </div>
              </div>
        
              <div className="form-right">
                <div className="requirement-field">
                  <label htmlFor="require">Business Type</label>
                  <input 
                      type="text" 
                      name="businessType" 
                      value={formData.businessType} 
                      onChange={handleChange} 
                      placeholder="Enter Business Type" 
                      required 
                    />
                </div>
                <div className="source-field">
                  <label htmlFor="source">Source</label>
                  
                  <select className='opt'
                      name="source" 
                      value={formData.source} 
                      onChange={handleChange} 
                      required
                    >
                      <option value="google">Google</option>
                      <option value="walk in">Walk In</option>
                      <option value="insta">Instagram</option>
                      <option value="facebook">Facebook</option>
                    </select>
                    
                </div>
                <div className="eventdate-field">
                <label>Location</label>
                    <input 
                    type="text" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    placeholder="Enter Location" 
                    required 
                    />
                </div>
                <div className="comment-field">
                  <label htmlFor="comment">Comment</label>
                    <textarea
                      name="comment"
                      value={formData.comment}
                      onChange={handleChange}
                      placeholder="Enter any comments here"
                    />
                </div>
              </div>
            </form>
            <div className="button-group">
              <button onClick={() => navigate('/leads')} type="button" className="btn cancel">Cancel</button>
              
              <button type="submit" className="btn add-clead">Add Lead</button>
            </div>
            </form>
            <ToastContainer />
      </div>
    </div>
  );
};

export default Lead;
