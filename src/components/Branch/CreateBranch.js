import React, { useState } from 'react';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { sendEmail } from '../../utils/sendEmail';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the default CSS for Toastify
import './createBranch.css'; // Using the same CSS file

import Sidebar from '../Leads/Sidebar';
import Header from '../Leads/Header';

const CreateBranch = () => {
  const [formData, setFormData] = useState({
    emailId: '',
    branchCode: '',
    branchName: '',
    ownerName: '',
    contactNumber: '',
    subscriptionType: 'monthly',
    activeDate: '',
    deactiveDate: '',
    numberOfUsers: 5,
    amount: '',
    password: '',
    location: '',
  });
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

const handleSidebarToggle = () => {
  setSidebarOpen(!sidebarOpen);
};

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();

    const { emailId, branchCode, branchName, ownerName, contactNumber, subscriptionType, activeDate, deactiveDate, numberOfUsers, amount, password, location } = formData;

    if (new Date(activeDate) < new Date(today)) {
      toast.error('Start date cannot be before today.');
      return;
    }

    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, emailId, password);

      await setDoc(doc(db, 'branches', branchCode), {
        emailId,
        branchCode,
        branchName,
        ownerName,
        contactNumber,
        subscriptionType,
        activeDate,
        deactiveDate,
        numberOfUsers,
        amount,
        password,
        location
      });

      await sendEmail(emailId, password, ownerName, activeDate, deactiveDate, amount);

      toast.success('Branch created, user account set up, and email sent successfully.');
      setFormData({ // Reset form data on success
        emailId: '',
        branchCode: '',
        branchName: '',
        ownerName: '',
        contactNumber: '',
        subscriptionType: 'monthly',
        activeDate: '',
        deactiveDate: '',
        numberOfUsers: 5,
        amount: '',
        password: '',
        location: '',
      });

      setTimeout(() => {
        navigate('/branches'); // Navigate after a short delay
      }, 1500); // Adjust the delay as needed
    } catch (error) {
      console.error('Error creating branch or user:', error);
      toast.error('Failed to create branch or user. Please try again.');
    }
  };

  return (
    <div className={`branch-create-page ${sidebarOpen ? 'branch-sidebar-open' : ''}`}>

  <Sidebar
    isOpen={sidebarOpen}
    onToggle={handleSidebarToggle}
  />

  <div className="branch-create-main">

    <Header
      onMenuClick={handleSidebarToggle}
      isSidebarOpen={sidebarOpen}
    />

    <div className="branch-create-wrapper">

      {/* PAGE HEADER */}

      <div className="branch-create-header">

        <div className="branch-create-header-left">

          <h1 className="branch-create-title">
            Add Branch
          </h1>

          <p className="branch-create-subtitle">
            Create and manage a new business branch
          </p>

        </div>

      </div>

      {/* FORM CARD */}

      <form
        onSubmit={handleCreateBranch}
        className="branch-form-card"
      >

        <div className="branch-form-grid">

          {/* LEFT COLUMN */}

          <div className="branch-form-column">

            {/* EMAIL */}

            <div className="branch-form-group">

              <label>
                Email Address
              </label>

              <input
                type="email"
                name="emailId"
                value={formData.emailId}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />

            </div>

            {/* PASSWORD */}

            <div className="branch-form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />

            </div>

            {/* BRANCH CODE */}

            <div className="branch-form-group">

              <label>
                Branch Code
              </label>

              <input
                type="text"
                name="branchCode"
                value={formData.branchCode}
                onChange={handleChange}
                placeholder="Enter branch code"
                required
              />

            </div>

            {/* LOCATION */}

            <div className="branch-form-group">

              <label>
                Location
              </label>

              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter branch location"
                required
              />

            </div>

            {/* OWNER NAME */}

            <div className="branch-form-group">

              <label>
                Owner Name
              </label>

              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Enter owner name"
                required
              />

            </div>

          </div>

          {/* RIGHT COLUMN */}

          <div className="branch-form-column">

            {/* BRANCH NAME */}

            <div className="branch-form-group">

              <label>
                Branch Name
              </label>

              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                placeholder="Enter branch name"
                required
              />

            </div>

            {/* CONTACT NUMBER */}

            <div className="branch-form-group">

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

            {/* SUBSCRIPTION */}

            <div className="branch-form-group">

              <label>
                Subscription Type
              </label>

              <select
                name="subscriptionType"
                value={formData.subscriptionType}
                onChange={handleChange}
                required
              >

                <option value="daily">
                  Daily
                </option>

                <option value="monthly">
                  Monthly
                </option>

                <option value="yearly">
                  Yearly
                </option>

              </select>

            </div>

            {/* START DATE */}

            <div className="branch-form-group">

              <label>
                Start Date
              </label>

              <input
                type="date"
                name="activeDate"
                value={formData.activeDate}
                onChange={handleChange}
                min={today}
                required
              />

            </div>

            {/* END DATE */}

            <div className="branch-form-group">

              <label>
                End Date
              </label>

              <input
                type="date"
                name="deactiveDate"
                value={formData.deactiveDate}
                onChange={handleChange}
                required
              />

            </div>

          </div>

        </div>

        {/* BOTTOM GRID */}

        <div className="branch-bottom-grid">

          {/* USERS */}

          <div className="branch-form-group">

            <label>
              Number Of Users
            </label>

            <input
              type="number"
              name="numberOfUsers"
              value={formData.numberOfUsers}
              onChange={handleChange}
              placeholder="Enter users count"
            />

          </div>

          {/* AMOUNT */}

          <div className="branch-form-group">

            <label>
              Amount
            </label>

            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
            />

          </div>

        </div>

        {/* ACTION BUTTONS */}

        <div className="branch-form-actions">

          <button
            type="button"
            className="branch-secondary-btn"
            onClick={() => navigate('/branches')}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="branch-primary-btn"
          >
            Create Branch
          </button>

        </div>

      </form>

      <ToastContainer />

    </div>

  </div>

</div>
  );
};

export default CreateBranch;
