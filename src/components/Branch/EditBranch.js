import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import './editBranch.css';

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
    <div className="create-branch">
      <h2>Edit Branch</h2>

      <form onSubmit={handleUpdateBranch}>
        {/* Email ID and Password */}
        <div className="field-row">
          <div>
            <label>Email ID</label>
            <input
              type="email"
              name="emailId"
              value={formData.emailId}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="field-row">
          <div>
            <label>Branch Code</label>
            <input
              type="text"
              name="branchCode"
              value={formData.branchCode}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="field-row">
          <div>
            <label>Branch Name</label>
            <input
              type="text"
              name="branchName"
              value={formData.branchName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Owner Name</label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="field-row">

          <div>
            <label>Contact Number</label>
            <input
              type="text"
              name="branchCode"
              value={formData.contactNumber||'N/A'}
              onChange={handleChange}
              required
            />
          </div>

          <div>

            <label>Subscription Type</label>
            <select
              name="subscriptionType"
              value={formData.subscriptionType}
              onChange={handleChange}
              required
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div>
            <label>Start Date</label>
            <input
              type="date"
              name="activeDate"
              value={formData.activeDate}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>End Date</label>
            <input
              type="date"
              name="deactiveDate"
              value={formData.deactiveDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="field-row">
          <div >
            <label >Number of Users</label>
            <input
              type="number"
              id="numberOfUsers"
              name="numberOfUsers"
              value={formData.numberOfUsers}
              onChange={handleChange}
            />
          </div>
          <div >
            <label>Amount</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
            />
          </div>


        </div>
        <div className="field-row">
          <div className="comments-history">
            {comments.map((comment, index) => (
              <div key={index} className="comment">

                <p>{comment.text} : {new Date(comment.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div>
            <textarea
              placeholder="Add a comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button onClick={handleAddComment}>Add Comment</button>
          </div>
        </div>
        <button className="editbtnvaisak1" onClick={() => navigate('/branches')} >Cancel</button>

        <button className='editbtnvaisak'>Edit Branch</button>
      </form>




      <ToastContainer />
    </div>
  );
};

export default EditBranch;
