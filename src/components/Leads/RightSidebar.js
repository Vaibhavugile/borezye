import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, updateDoc ,doc,getDoc,setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FaWhatsapp } from 'react-icons/fa';
import './RightSidebar.css'; // Adjust the path as per your directory structure
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify

const RightSidebar = ({ isOpen, onClose, selectedLead }) => {
  // ADDED LOG FOR DEBUGGING: Log the prop as soon as the component receives it
  console.log("RightSidebar.js: selectedLead prop received at render:", selectedLead);

  const [status, setStatus] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);
  const [response, setResponse] = useState('');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedContactNo, setSelectedContactNo] = useState(null);

  const [templates, setTemplates] = useState([]);

  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    // ADDED LOG FOR DEBUGGING: Log when the selectedLead prop causes a useEffect re-run
    console.log("RightSidebar.js: useEffect - selectedLead changed:", selectedLead);
    if (selectedLead) {
      setStatus(selectedLead.status || '');
      setNextFollowup(selectedLead.nextFollowup || '');
      setAssignedTo(selectedLead.assignedTo || '');
      setComments(selectedLead.comments || []);
    }
  }, [selectedLead]);

  const handleSave = async () => {
    // ADDED LOG FOR DEBUGGING: Log the value of selectedLead right before the check
    console.log("RightSidebar.js: handleSave - selectedLead at start:", selectedLead);
    if (!selectedLead || !selectedLead.id) {
      toast.error('No lead selected for update.');
      // ADDED LOG FOR DEBUGGING: Log if the error condition is met
      console.error("RightSidebar.js: handleSave - selectedLead is null or missing ID:", selectedLead);
      return;
    }
    if (newComment.trim() === '') {
      toast.warn('Comment cannot be empty.'); // Added a warning if comment is empty
      return;
    }

    try {
      const leadRef = doc(db, 'leads', selectedLead.id);
      const currentDateTime = new Date().toLocaleString();
      const commentWithTimestamp = `${currentDateTime}: ${newComment}`;

      await updateDoc(leadRef, {
        status,
        nextFollowup,
        assignedTo,
        comments: arrayUnion(commentWithTimestamp),
        response,
      });

      toast.success('Lead updated successfully!');
      setComments([...comments, commentWithTimestamp]);
      setNewComment('');
      onClose();
    } catch (error) {
      console.error('Error updating lead: ', error);
      toast.error('Failed to update lead. Please try again.');
    }
  };


  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesCol = query(
          collection(db, "Stemplates"),
      

        );

        const templatesSnapshot = await getDocs(templatesCol);
        const templatesList = templatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTemplates(templatesList);
      } catch (error) {
        toast.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [isModalOpen]);

  // Function to send WhatsApp message
  const sendWhatsAppMessage = (contactNumber, message) => {
    if (!contactNumber) {
      toast.error("No contact number provided!");
      return;
    }

    // Check if the contact number starts with +91 or not
    const formattedContactNo = contactNumber.startsWith("+91")
      ? contactNumber
      : `+91${contactNumber}`;

    const whatsappURL = `https://api.whatsapp.com/send?phone=${formattedContactNo}&text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");
  };


  // Handle template click and send WhatsApp message
  const handleTemplateClick = (template) => {
    if (!selectedLead) {
      toast.error("No booking selected!");
      return;
    }

    const templateBody = template.body;

    // Replace placeholders with booking data
    const message = templateBody
      .replace("{location}", selectedLead.location || "")
      .replace("{businessName}", selectedLead.businessName || "")
      .replace("{contactNumber}", selectedLead.contactNumber || "")
      .replace("{emailId}", selectedLead.emailId || "")
      .replace("{assignedTo}", selectedLead.assignedTo || "")
      .replace("{source}", selectedLead.source || "")
      .replace("{status}", selectedLead.status || "")
      .replace("{nextFollowup}", selectedLead.nextFollowup || "");

    sendWhatsAppMessage(selectedContactNo, message);

    // Close modal after sending the message
    setIsModalOpen(false);
  };

  // Handle contact number selection
  const handleContactNumberClick = (selectedLead) => {
    setSelectedContactNo(selectedLead.contactNumber);
    setSelectedBooking(selectedLead);
    setIsModalOpen(true);
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
        <h2>Business Details</h2>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Business Name:</h3>
            <p>{selectedLead?.businessName}</p>
          </div>
          <div className="sidebar-item">
            <h3>Business Type:</h3>
            <p>{selectedLead?.businessType}</p>
          </div>
        </div>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Contact:</h3>
            <p>{selectedLead?.contactNumber}</p>
          </div>
          <div className="sidebar-item">
            <h3>Email ID:</h3>
            <p>{selectedLead?.emailId}</p>
          </div>
        </div>
        <div className="sidebar-row">
          <div className="sidebar-item">
            <h3>Status:</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="fresh lead">Fresh Lead</option>
              <option value="details shared">Details Shared</option>
              <option value="demo scheduled">Demo Scheduled</option>
              <option value="demo done">Demo Done</option>
              <option value="lead won">Lead Won</option>
              <option value="lead lost">Lead Lost</option>
            </select>
          </div>
          <div className="sidebar-item">
            <h3>Next Follow-up Date:</h3>
            <input
              type="date"
              value={nextFollowup ? new Date(nextFollowup).toISOString().split('T')[0] : ''}
              onChange={(e) => setNextFollowup(e.target.value)}
            />
          </div>
        </div>
        <div className="sidebar-row full-width-row">
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
            <div className="action-buttons">
              <button
                onClick={() => handleContactNumberClick(selectedLead)}
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                  backgroundColor: "#25D366",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <FaWhatsapp style={{ marginRight: "5px" }} />
              </button>

              {/* Modal for Templates */}
              {isModalOpen && (
                <>
                  {/* Modal Background Overlay */}
                  <div
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "transparent", // Dimming effect
                      zIndex: 999,
                    }}
                  ></div>

                  {/* Modal Popup */}
                  <div
                    style={{
                      position: "fixed",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      backgroundColor: "white",
                      padding: "20px",
                      borderRadius: "10px",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                      zIndex: 1000,
                      maxWidth: "400px",
                      width: "90%",
                    }}
                  >
                    <h3>Select a Template</h3>
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                      {templates.map((template) => (
                        <li
                          key={template.id}
                          onClick={() => handleTemplateClick(template)}
                          style={{
                            padding: "10px",
                            margin: "5px 0",
                            border: "1px solid #ddd",
                            borderRadius: "5px",
                            cursor: "pointer",
                            backgroundColor: "#f9f9f9",
                          }}
                        >
                          {template.name}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        marginTop: "10px",
                        padding: "10px",
                        borderRadius: "5px",
                        backgroundColor: "#ccc",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                    <ToastContainer/>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RightSidebar;