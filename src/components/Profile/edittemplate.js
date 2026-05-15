import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUser } from '../Auth/UserContext';
import "./EditTemplate.css";
const EditTemplate = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const navigate = useNavigate();
  const { id } = useParams(); // Template ID from route params
  const { userData } = useUser(); // Access userData from the context
const [order, setOrder] = useState(1);



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
        
const {
  name,
  body,
  order,
} = docSnap.data();

setTemplateName(name);

setTemplateBody(body);

setOrder(order || 1);
        }

 else {
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

  order: order,

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

  <div className="edit-template-page">

    <div className="edit-template-card">

      {/* TITLE */}

      <h2 className="edit-template-title">
        Edit Template
      </h2>



      {/* FORM */}

      <form
        onSubmit={handleUpdateTemplate}
        className="edit-template-form"
      >



        {/* TEMPLATE NAME */}

        <div className="edit-template-field">

          <label htmlFor="templateName">

            Template Name

          </label>

          <input
            id="templateName"
            type="text"
            value={templateName}
            onChange={(e) =>
              setTemplateName(
                e.target.value
              )
            }
            placeholder="Enter template name"
            className="edit-template-input"
          />

        </div>



        {/* TEMPLATE BODY */}

        <div className="edit-template-field">

          <label htmlFor="templateBody">

            Template Body

          </label>

          <textarea
            id="templateBody"
            value={templateBody}
            onChange={(e) =>
              setTemplateBody(
                e.target.value
              )
            }
            placeholder="Enter template body"
            className="edit-template-textarea"
          />

        </div>
{/* TEMPLATE ORDER */}

<div className="edit-template-field">

  <label htmlFor="templateOrder">

    Template Order

  </label>

  <input
    id="templateOrder"
    type="number"
    value={order}
    onChange={(e) =>
      setOrder(
        Number(e.target.value)
      )
    }
    placeholder="Enter template order"
    className="edit-template-input"
  />

</div>





        {/* PLACEHOLDERS */}

        <div className="placeholder-section">

          <h3 className="placeholder-title">

            Insert Placeholders

          </h3>



          <div className="placeholder-grid">

            {placeholders.map(
              (placeholder) => (

                <button
                  key={placeholder.value}
                  type="button"
                  onClick={() =>
                    insertPlaceholder(
                      placeholder.value
                    )
                  }
                  className="placeholder-btn"
                >

                  {placeholder.label}

                </button>
              )
            )}

          </div>

        </div>



        {/* ACTIONS */}

        <div className="edit-template-actions">

          <button
            type="submit"
            className="update-btn"
          >

            Update Template

          </button>



          <button
            onClick={() =>
              navigate("/overview")
            }
            type="button"
            className="cancel-btn"
          >

            Cancel

          </button>

        </div>

      </form>

      <ToastContainer />

    </div>

  </div>
);
};

export default EditTemplate;
