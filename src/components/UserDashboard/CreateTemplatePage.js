import React, { useState,useEffect, } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useUser } from '../Auth/UserContext'; // Assuming you're using a UserContext for branchCode
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify

const CreateTemplate = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  // Placeholder options for booking data
  const placeholders = [
    {label: "Client Name", value: "{clientName}" },
    {label: "Client Email", value: "{clientEmail}" },
    {label:"Contact No",value:"{ContactNo}"},
    {label:"Identity Proof",value:"{IdentityProof}"},
    {label:"Identity Number",value:"{IdentityNumber}"},
    {label:"Stage",value:"{stage}"},
    {label:"CustomerBy",value:"{CustomerBy}"},
    {label:"ReceiptBy",value:"{ReceiptBy}"},
    {label:"Alterations",value:"{Alterations}"},
    {label:"SpecialNote",value:"{SpecialNote}"},
    {label:"GrandTotalRent",value:"{GrandTotalRent}"},
    {label:"DiscountOnRent",value:"{DiscountOnRent}"},
    {label:"FinalRent",value:"{FinalRent}"},
    {label:"GrandTotalDeposit",value:"{GrandTotalDeposit}"},
    {label:"DiscountOnDeposit",value:"{DiscountOnDeposit}"},
    {label:"FinalDeposit",value:"{FinalDeposit}"},
    {label:"AmountToBePaid",value:"{AmountToBePaid}"},
    {label:"AmountPaid",value:"{AmountPaid}"},
    {label:"Balance",value:"{Balance}"},
    {label:"PaymentStatus",value:"{PaymentStatus}"},
    {label:"FirstPaymentDetails",value:"{FirstPaymentDetails}"},
    {label:"FirstPaymentMode",value:"{FirstPaymentMode}"},
    {label:"SecondPaymentMode",value:"{SecondPaymentMode}"},
    {label:"SecondPaymentDetails",value:"{SecondPaymentDetails}"},
    { label: "Receipt Number", value: "{receiptNumber}" },
    { label: "Pickup Date", value: "{pickupDate}" },
    { label: "Return Date", value: "{returnDate}" },
    { label: "Product Code And Quantity", value: "{Products}" },
    { label: "Product Name", value: "{Products1}" },

    { label: "Booking Creation Date", value: "{createdAt}" },

    
  ];
  const [branchCode, setBranchCode] = useState(''); // Store branch code

  const { userData } = useUser(); // Get user data from context
  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  }, [userData]);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
  
    if (!templateName || !templateBody) {
      toast.warn("Both fields are required!");
      return;
    }
  
    try {
      // ⬇️ Save the template under the correct branch path
      await addDoc(collection(db, `products/${branchCode}/templates`), {
        name: templateName,
        body: templateBody,
        createdAt: new Date(),
        branchCode: branchCode,
      });
  
      toast.success("Template created successfully!");
      setTemplateName("");
      setTemplateBody("");
  
      setTimeout(() => navigate("/overview"), 1500); // Redirect after short delay
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
        <button onClick={() => navigate('/overview')}
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

export default CreateTemplate;