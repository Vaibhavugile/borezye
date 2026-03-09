import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUser } from '../Auth/UserContext';

const EditTemplate = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const navigate = useNavigate();
  const { id } = useParams(); // Template ID from route params
  const { userData } = useUser(); // Access userData from the context


  const placeholders = [
    { label: "Client Name", value: "{clientName}" },
    { label: "Client Email", value: "{clientEmail}" },
    { label: "Contact No", value: "{ContactNo}" },
    { label: "Identity Proof", value: "{IdentityProof}" },
    { label: "Identity Number", value: "{IdentityNumber}" },
    { label: "Stage", value: "{stage}" },
    { label: "Customer By", value: "{CustomerBy}" },
    { label: "Receipt By", value: "{ReceiptBy}" },
    { label: "Alterations", value: "{Alterations}" },
    { label: "Special Note", value: "{SpecialNote}" },
    { label: "Grand Total Rent", value: "{GrandTotalRent}" },
    { label: "Discount On Rent", value: "{DiscountOnRent}" },
    { label: "Final Rent", value: "{FinalRent}" },
    { label: "Grand Total Deposit", value: "{GrandTotalDeposit}" },
    { label: "Discount On Deposit", value: "{DiscountOnDeposit}" },
    { label: "Final Deposit", value: "{FinalDeposit}" },
    { label: "Amount To Be Paid", value: "{AmountToBePaid}" },
    { label: "Amount Paid", value: "{AmountPaid}" },
    { label: "Balance", value: "{Balance}" },
    { label: "Payment Status", value: "{PaymentStatus}" },
    { label: "First Payment Details", value: "{FirstPaymentDetails}" },
    { label: "First Payment Mode", value: "{FirstPaymentMode}" },
    { label: "Second Payment Mode", value: "{SecondPaymentMode}" },
    { label: "Second Payment Details", value: "{SecondPaymentDetails}" },
    { label: "Receipt Number", value: "{receiptNumber}" },
    { label: "Pickup Date", value: "{pickupDate}" },
    { label: "Return Date", value: "{returnDate}" },
    { label: "Booking Creation Date", value: "{createdAt}" },
    { label: "Product Code And Quantity", value: "{Products}" },
    { label: "Product Name", value: "{Products1}" },


  ];

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        if (!userData?.branchCode) return;
  
        const docRef = doc(db, `products/${userData.branchCode}/templates`, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { name, body } = docSnap.data();
          setTemplateName(name);
          setTemplateBody(body);
        } else {
          toast.error("Template not found!");
          navigate("/overview");
        }
      } catch (error) {
        console.error("Error fetching template:", error);
        toast.error("Failed to fetch template.");
      }
    };
  
    fetchTemplate();
  }, [id, navigate, userData?.branchCode]);
  

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
  
    if (!templateName || !templateBody) {
      toast.warn("Both fields are required!");
      return;
    }
  
    try {
      const docRef = doc(db, `products/${userData.branchCode}/templates`, id);
      await updateDoc(docRef, {
        name: templateName,
        body: templateBody,
        updatedAt: new Date(),
      });
      toast.success("Template updated successfully!");
      setTimeout(() => navigate("/overview"), 1500);
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template.");
    }
  };
  

  const insertPlaceholder = (placeholder) => {
    setTemplateBody((prev) => `${prev} ${placeholder}`);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      <h2>Edit Template</h2>
      <form onSubmit={handleUpdateTemplate}>
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "5px",
              }}
            >
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
          Update Template
        </button>
        <button
          onClick={() => navigate("/overview")}
          type="button"
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "10px 15px",
            marginLeft: "10px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </form>
      <ToastContainer />
    </div>
  );
};

export default EditTemplate;
