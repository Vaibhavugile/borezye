import React, { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { FaWhatsapp } from 'react-icons/fa';
import './RightSidebar.css'; // Adjust the path as per your directory structure
import { useUser } from '../../Auth/UserContext'; // Assuming you're using a UserContext for branchCode

const   CRightSidebar = ({ isOpen, onClose, selectedLead }) => {
  const [stage, setStage] = useState('');
  const [followupDate, setfollowupDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [response, setResponse] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateBody, setTemplateBody] = useState('');
const { userData } = useUser(); // Get user data from context

  const templates = {
    'Details Shared': 'Thank you for your interest. Let us know if you have any further questions!',
    'Demo Scheduled': 'Hello, this is a reminder for your demo scheduled tomorrow.',
    'Demo Done': 'Congratulations! Your demo has been successfully completed.',
  };

  useEffect(() => {
    if (selectedLead) {
      setStage(selectedLead.stage || '');
      setfollowupDate(selectedLead.followupDate || '');
      setAssignedTo(selectedLead.assignedTo || '');
      setComments(selectedLead.comments || []);
    }
  }, [selectedLead]);

  const handleSave = async () => {
    if (newComment.trim() === '') return;
  
    if (!userData?.branchCode || !selectedLead?.id) {
      alert('Invalid lead or branchCode');
      return;
    }
  
    try {
      const leadRef = doc(db, `products/${userData.branchCode}/clientleads`, selectedLead.id);
      const currentDateTime = new Date().toLocaleString();
      const commentWithTimestamp = `${currentDateTime}: ${newComment}`;
  
      await updateDoc(leadRef, {
        stage,
        followupDate,
        assignedTo,
        comments: arrayUnion(commentWithTimestamp),
        response,
      });
  
      alert('Lead updated successfully!');
      setComments((prev) => [...prev, commentWithTimestamp]); // Update state correctly
      setNewComment('');
      onClose();
    } catch (error) {
      console.error('Error updating lead: ', error);
      alert('Failed to update lead. Please try again.');
    }
  };
  

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setTemplateBody(templates[template] || '');
  };

  const handleTemplateBodyChange = (event) => {
    setTemplateBody(event.target.value);
  };

  const handleSendTemplate = () => {
    const whatsappLink = `https://api.whatsapp.com/send?phone=${selectedLead.contactNumber}&text=${encodeURIComponent(templateBody)}`;
    window.open(whatsappLink, '_blank');
    setIsOverlayOpen(false);
  };

  const toggleOverlay = () => {
    setIsOverlayOpen(!isOverlayOpen);
  };

  return (
    <div className={`right-sidebar ${isOpen ? 'open' : ''}`}>
      <button className="close-button" onClick={onClose}>
        &times;
      </button>
      <div className="sidebar-content">
        <h2>Lead Details</h2>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Lead Name:</h3>
            <p>{selectedLead?.leadName}</p>
          </div>
          <div className="sidebar-item">
            <h3>Event Date:</h3>
            <p>{selectedLead?.eventDate.toLocaleString()}</p>
          </div>
        </div>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Contact:</h3>
            <p>{selectedLead?.mobileNo}</p>
          </div>
          <div className="sidebar-item">
            <h3>Email ID:</h3>
            <p>{selectedLead?.email}</p>
          </div>
        </div>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Requirement:</h3>
            <p>{selectedLead?.requirement}</p>
          </div>
          <div className="sidebar-item">
            <h3>Source:</h3>
            <p>{selectedLead?.source}</p>
          </div>
        </div>
        
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>stage:</h3>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="fresh lead">Fresh Lead</option>
              <option value="requirement fulfilled">Requirement Fulfilled</option>
              <option value="not interested">Not Interested</option>
              <option value="interested">Interested</option>
            </select>
          </div>
          <div className="sidebar-item">
            <h3>Next Follow-up Date:</h3>
            <input
              type="date"
              value={followupDate ? new Date(followupDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setfollowupDate(e.target.value)}
            />
          </div>
        </div>
        <div className="sidebar-row">
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="attended"
                checked={response === 'attended'}
                onChange={(e) => setResponse(e.target.value)}
              />
              Attended
            </label>
            <label>
              <input
                type="radio"
                value="rejected"
                checked={response === 'rejected'}
                onChange={(e) => setResponse(e.target.value)}
              />
              Rejected
            </label>
            <label>
              <input
                type="radio"
                value="postponed"
                checked={response === 'postponed'}
                onChange={(e) => setResponse(e.target.value)}
              />
              Postponed
            </label>
            <label>
              <input
                type="radio"
                value="no reply"
                checked={response === 'no reply'}
                onChange={(e) => setResponse(e.target.value)}
              />
              No Reply
            </label>
          </div>
        </div>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Assigned To:</h3>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            />
          </div>
        </div>
        <div className="sidebar-row full-width-row">
          <div className="sidebar-item full-width">
            <h3>Add a Comment:</h3>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Enter your comment here..."
              className="comment-input"
            />
          </div>
        </div>
        <div className="sidebar-row full-width-row">
          <div className="sidebar-item full-width">
            <h3>Previous Comments:</h3>
            {comments && comments.length > 0 ? (
              <ul className="comments-list">
                {comments.map((comment, index) => (
                  <li key={index}>{comment}</li>
                ))}
              </ul>
            ) : (
              <p>No comments yet.</p>
            )}
          </div>
        </div>
        <div className="sidebar-row full-width-row">
          <div className="save-button-container">
            <button className="save-button" onClick={handleSave}>Save</button>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRightSidebar;
