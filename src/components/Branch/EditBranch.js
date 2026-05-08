import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import './editBranch.css';
import Sidebar from '../Leads/Sidebar';
import Header from '../Leads/Header';

const EditBranch = () => {
  const { id } = useParams(); // Get branch ID from URL
  const navigate = useNavigate();

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

  const [comments, setComments] = useState([]); // State for comment history
  const [newComment, setNewComment] = useState(''); // State for the new comment
  const [sidebarOpen, setSidebarOpen] = useState(false);

const handleSidebarToggle = () => {
  setSidebarOpen(!sidebarOpen);
};

  // Get today's date in yyyy-mm-dd format
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        const branchDoc = doc(db, 'branches', id);
        const branchSnapshot = await getDoc(branchDoc);
        if (branchSnapshot.exists()) {
          const branchData = branchSnapshot.data();
          setFormData(branchData);
          setComments(branchData.comments || []); // Fetch comments if they exist
        } else {
          toast.error('Branch not found.');
        }
      } catch (error) {
        toast.error('Error fetching branch details.');
      }
    };

    fetchBranchData();
  }, [id]);

  // Function to handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();

    const { activeDate } = formData;
    if (new Date(activeDate) < new Date(today)) {
      toast.error('Start date cannot be before today.');
      return;
    }

    try {
      const branchDoc = doc(db, 'branches', id);
      await updateDoc(branchDoc, formData);
      toast.success('Branch details updated successfully.');
      setTimeout(() => {
        navigate('/branches'); // Navigate after a short delay
      }, 3500);
    } catch (error) {
      toast.error('Failed to update branch details. Please try again.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty.');
      return;
    }

    const comment = {
      text: newComment,
      timestamp: new Date().toISOString(),
    };

    try {
      const branchDoc = doc(db, 'branches', id);
      await updateDoc(branchDoc, {
        comments: arrayUnion(comment), // Add comment to Firestore
      });

      setComments((prevComments) => [...prevComments, comment]); // Update local comments state
      setNewComment(''); // Clear input field
      toast.success('Comment added successfully.');
    } catch (error) {
      toast.error('Failed to add comment. Please try again.');
    }
  };

  return (
   <div className={`branch-edit-page ${sidebarOpen ? 'branch-sidebar-open' : ''}`}>

  <Sidebar
    isOpen={sidebarOpen}
    onToggle={handleSidebarToggle}
  />

  <div className="branch-edit-main">

    <Header
      onMenuClick={handleSidebarToggle}
      isSidebarOpen={sidebarOpen}
    />

    <div className="branch-edit-wrapper">

      {/* PAGE HEADER */}

      <div className="branch-edit-header">

        <div className="branch-edit-header-left">

          <h1 className="branch-edit-title">
            Edit Branch
          </h1>

          <p className="branch-edit-subtitle">
            Update and manage branch information
          </p>

        </div>

      </div>

      {/* FORM CARD */}

      <form
        onSubmit={handleUpdateBranch}
        className="branch-edit-form-card"
      >

        <div className="branch-edit-grid">

          {/* LEFT COLUMN */}

          <div className="branch-edit-column">

            {/* EMAIL */}

            <div className="branch-edit-group">

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

            <div className="branch-edit-group">

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

            <div className="branch-edit-group">

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

            <div className="branch-edit-group">

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

            {/* OWNER */}

            <div className="branch-edit-group">

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

          <div className="branch-edit-column">

            {/* BRANCH NAME */}

            <div className="branch-edit-group">

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

            {/* CONTACT */}

            <div className="branch-edit-group">

              <label>
                Contact Number
              </label>

              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber || ''}
                onChange={handleChange}
                placeholder="Enter contact number"
                required
              />

            </div>

            {/* SUBSCRIPTION */}

            <div className="branch-edit-group">

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

            <div className="branch-edit-group">

              <label>
                Start Date
              </label>

              <input
                type="date"
                name="activeDate"
                value={formData.activeDate}
                onChange={handleChange}
                required
              />

            </div>

            {/* END DATE */}

            <div className="branch-edit-group">

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

        <div className="branch-edit-bottom-grid">

          {/* USERS */}

          <div className="branch-edit-group">

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

          <div className="branch-edit-group">

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

        {/* COMMENTS SECTION */}

        <div className="branch-comments-wrapper">

          {/* COMMENT HISTORY */}

          <div className="branch-comments-history">

            <div className="branch-comments-header">

              <h3>
                Comment History
              </h3>

            </div>

            <div className="branch-comments-list">

              {comments.map((comment, index) => (

                <div
                  key={index}
                  className="branch-comment-card"
                >

                  <p className="branch-comment-text">
                    {comment.text}
                  </p>

                  <span className="branch-comment-date">

                    {new Date(comment.timestamp).toLocaleString()}

                  </span>

                </div>

              ))}

            </div>

          </div>

          {/* ADD COMMENT */}

          <div className="branch-add-comment-card">

            <label>
              Add Comment
            </label>

            <textarea
              placeholder="Write your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="branch-comment-input"
            />

            <button
              type="button"
              className="branch-comment-btn"
              onClick={handleAddComment}
            >

              Add Comment

            </button>

          </div>

        </div>

        {/* ACTION BUTTONS */}

        <div className="branch-edit-actions">

          <button
            type="button"
            className="branch-edit-secondary-btn"
            onClick={() => navigate('/branches')}
          >

            Cancel

          </button>

          <button
            type="submit"
            className="branch-edit-primary-btn"
          >

            Update Branch

          </button>

        </div>

      </form>

      <ToastContainer />

    </div>

  </div>

</div>
  );
};

export default EditBranch;
