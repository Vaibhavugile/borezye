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
    <div className={`add-lead-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="add-lead-content">
        <Header onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />
        <h2 style={{ marginLeft: '20px', marginTop: '70px' }}>
          Edit lead
        </h2>
        <p className="subheading">Fill out the form below to update the lead</p>
        <form onSubmit={handleUpdateLead}>
          <form className="add-user-form">
            <div className="form-left">
              <div className='lead'>
                <div className="lead-details">
                  <label htmlFor="leadName">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Enter Lead Name"
                    required
                  />
                </div>
                <div className="lead-details">
                  <label htmlFor="mobileNo">Contact No.</label>
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
                    type="email"
                    name="emailId"
                    value={formData.emailId}
                    onChange={handleChange}
                    placeholder="Enter Email-ID"
                    required
                  />
                </div>
              </div>
              <div className="sub-left">
                <label htmlFor="followupDate">Next Follow-up Date</label>
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
                  placeholder="Enter business type"
                  required
                />
              </div>
              <div className="source-field">
                <label htmlFor="source">Source</label>
                <select
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
                <label htmlFor="eventDate">Location</label>
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
            <button type="submit" className="btn add-clead">Update Lead</button>
          </div>
        </form>
        <ToastContainer />
      </div>
    </div>
  );
};

export default EditLead;
