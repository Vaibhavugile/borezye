import React, { useState,useEffect, } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify

const SCreateTemplate = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  // Placeholder options for booking data
  const placeholders = [
    {label: "Branch Email Id", value: "{emailId}" },
    {label: "Branch branchcode", value: "{branchCode}" },
    {label:"Branch Name",value:"{branchName}"},
    {label:"Branch  Owner Name",value:"{ownerName}"},
    {label:"Branch subscriptionType",value:"{subscriptionType}"},
    {label:"Branch Active Date",value:"{activeDate}"},
    {label:"Branch DeActive Date",value:"{deactiveDate}"},
    {label:"Branch Number Of Users",value:"{numberOfUsers}"},
    {label:"Branch Amount",value:"{amount}"},
    {label:"Branch Password",value:"{password}"},
    {label:"Branch location",value:"{location}"},
    {label:"Leads location",value:"{location}"},
    {label:"Leads Business Name",value:"{businessName}"},
    {label:"Leads Contact Number",value:"{contactNumber}"},
    {label:"Leads Email ID",value:"{emailId}"},
    {label:"Leads Assigned To",value:"{assignedTo}"},
    {label:"Leads Source",value:"{source}"},
    {label:" Leads Status",value:"{status}"},
    {label:"Next Followup Date",value:"{nextFollowup}"},
    
  ];

  const handleCreateTemplate = async (e) => {
    e.preventDefault();

    if (!templateName || !templateBody) {
      toast.warn("Both fields are required!");
      return;
    }

    try {
      await addDoc(collection(db, "Stemplates"), {
        name: templateName,
        body: templateBody,
        createdAt: new Date(),
      });
      toast.success("Template created successfully!");
      setTemplateName("");
      setTemplateBody("");

      setTimeout(() =>navigate("/templates-dashboard"),5000);
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template.");
    }
  };

  // Function to insert a placeholder into the template body
  const insertPlaceholder = (placeholder) => {
    setTemplateBody((prev) => `${prev} ${placeholder}`);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      <h2>Create Template</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleCreateTemplate}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="templateName" style={{ display: "block" }}>
            Template Name
          </label>
          <input
            id="templateName"
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="templateBody" style={{ display: "block" }}>
            Template Body
          </label>
          <textarea
            id="templateBody"
            value={templateBody}
            onChange={(e) => setTemplateBody(e.target.value)}
            placeholder="Enter template body"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              minHeight: "100px",
            }}
          ></textarea>
          <div style={{ marginTop: "10px" }}>
            <label>Insert Placeholders:</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "5px" }}>
              {placeholders.map((placeholder) => (
                <button
                  key={placeholder.value}
                  type="button"
                  onClick={() => insertPlaceholder(placeholder.value)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "4px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {placeholder.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="submit"
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "10px 15px",
            cursor: "pointer",
          }}
        >
          Create Template
        </button>
        <button onClick={() => navigate("/templates-dashboard")}
         type="button" 
         style={{
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "10px 15px",
            marginLeft:"10px",
            cursor: "pointer",
          }}>Cancel</button>

      </form>
      <ToastContainer/>
    </div>
  );
};

export default SCreateTemplate;
