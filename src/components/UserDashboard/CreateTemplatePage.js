import React, { useState,useEffect, } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useUser } from '../Auth/UserContext'; // Assuming you're using a UserContext for branchCode
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import "./CreateTemplate.css";
const CreateTemplate = () => {
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [message, setMessage] = useState("");
  
const [order, setOrder] = useState(1);


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
     
await addDoc(
  collection(
    db,
    `products/${branchCode}/templates`
  ),
  {
    name: templateName,

    body: templateBody,

    branchCode: branchCode,

    
order: order,



    createdAt: new Date(),

    updatedAt: new Date(),
  }
);


  
      toast.success("Template created successfully!");
      setTemplateName("");
      setTemplateBody("");
      
setOrder(1);


  
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

  <div className="create-template-page">

    <div className="create-template-card">



      {/* TITLE */}

      <h2 className="create-template-title">

        Create Template

      </h2>



      {/* MESSAGE */}

      {message && (

        <div className="template-message">

          {message}

        </div>
      )}



      {/* FORM */}

      <form
        onSubmit={handleCreateTemplate}
        className="create-template-form"
      >



        {/* TEMPLATE NAME */}

        <div className="create-template-field">

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
            className="create-template-input"
          />

        </div>



        {/* TEMPLATE BODY */}

        <div className="create-template-field">

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
            className="create-template-textarea"
          />

        </div>
        
{/* TEMPLATE ORDER */}

<div className="create-template-field">

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
    className="create-template-input"
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

        <div className="create-template-actions">

          <button
            type="submit"
            className="create-btn"
          >

            Create Template

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

export default CreateTemplate;