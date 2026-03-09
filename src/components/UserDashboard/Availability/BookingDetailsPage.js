import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import backIcon from '../../../assets/arrowiosback_111116.png';
import { db } from '../../../firebaseConfig';
import './BookingDetailsPage.css';
import { useUser } from '../../Auth/UserContext';
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import { FaWhatsapp } from 'react-icons/fa';
import { serverTimestamp } from 'firebase/firestore'; // Ensure this is imported
import { useLocation } from 'react-router-dom';
import { writeBatch } from "firebase/firestore";
import { orderBy } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'; // Handle empty timestamp

  let date;
  if (timestamp.seconds) {
    // Firestore Timestamp format
    date = new Date(timestamp.seconds * 1000);
  } else {
    // Assume ISO string
    date = new Date(timestamp);
  }

  if (isNaN(date)) return 'Invalid Date'; // Fallback for invalid inputs
  return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US')}`;
};

const formatDateDMY = (timestamp) => {
  if (!timestamp) return "N/A";

  let date;
  if (timestamp.seconds) {
    // Firestore Timestamp
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date)) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const BookingDetailsPage = () => {
  const { receiptNumber } = useParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize navigate
  const { userData } = useUser(); // Access userData from the context
const [searchParams] = useSearchParams();

  // State for editing specific fields
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedContactNo, setSelectedContactNo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [isEditingSecondPayment, setIsEditingSecondPayment] = useState(false);
  const [secondPaymentMode, setSecondPaymentMode] = useState('');
  const [secondPaymentDetails, setSecondPaymentDetails] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [stage, setStage] = useState('');
  // Personal Info State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [alternativeContact, setAlternativeContact] = useState('');
  const [identityProof, setIdentityProof] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [source, setSource] = useState('');
  const [customerBy, setCustomerBy] = useState('');
  const [receiptBy, setReceiptBy] = useState('');

  // Payment Details State
  const [grandTotalRent, setGrandTotalRent] = useState('');
  const [discountOnRent, setDiscountOnRent] = useState('');
  const [finalRent, setFinalRent] = useState('');
  const [grandTotalDeposit, setGrandTotalDeposit] = useState('');
  const [discountOnDeposit, setDiscountOnDeposit] = useState('');
  const [finalDeposit, setFinalDeposit] = useState('');
  const [amountToBePaid, setAmountToBePaid] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [balance, setBalance] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [firstPaymentDetails, setFirstPaymentDetails] = useState('');
  const [firstPaymentMode, setFirstPaymentMode] = useState('');
  const [branchName, setBranchName] = useState('');
  const activityLogs = bookings[0]?.activityLog || [];

  const location = useLocation();
  const isDeleted = location.state?.isDeleted || false;
  useEffect(() => {
    const fetchBookingAndProductDetails = async () => {
      setLoading(true);
      try {
        const productsCollection = collection(
          db,
          `products/${userData.branchCode}/products`
        );
        const productsSnapshot = await getDocs(productsCollection);

        // Prepare promises for both active and deleted bookings
        const allBookingPromises = productsSnapshot.docs.map((productDoc) => {
          const productId = productDoc.id;
          const productData = productDoc.data();

          // Active bookings
          const bookingsRef = collection(
            db,
            `products/${userData.branchCode}/products/${productId}/bookings`
          );
          const activeQuery = query(bookingsRef, where('receiptNumber', '==', receiptNumber));

          // Deleted bookings
          const deletedBookingsRef = collection(db, `products/${userData.branchCode}/deletedBookings`);
          const deletedQuery = query(deletedBookingsRef, where('receiptNumber', '==', receiptNumber));

          return Promise.all([getDocs(activeQuery), getDocs(deletedQuery)]).then(
            ([activeSnap, deletedSnap]) => {
              const allDocs = [...activeSnap.docs, ...deletedSnap.docs];
              return {
                productId,
                product: productData,
                bookings: allDocs.map((doc) => ({
                  ...doc.data(),
                  id: doc.id,
                  isDeleted: deletedSnap.docs.includes(doc), // Optional flag
                })),
              };
            }
          );
        });

        // Execute all booking queries in parallel
        const results = await Promise.all(allBookingPromises);

        const allBookings = results.flatMap((result) =>
          result.bookings.map((booking) => ({
            ...booking,
            productId: result.productId,
            product: result.product,
          }))
        );

        // Set customer details from the first booking
        if (allBookings.length > 0) {
          const details = allBookings[0].userDetails || {};
          setSecondPaymentMode(details.secondpaymentmode || '');
          setSecondPaymentDetails(details.secondpaymentdetails || '');
          setSpecialNote(details.specialnote || '');
          setStage(details.stage || '');
          setName(details.name || '');
          setEmail(details.email || '');
          setContact(details.contact || '');
          setAlternativeContact(details.alternativecontactno || '');
          setIdentityProof(details.identityproof || '');
          setIdentityNumber(details.identitynumber || '');
          setSource(details.source || '');
          setCustomerBy(details.customerby || '');
          setReceiptBy(details.receiptby || '');
          setGrandTotalRent(details.grandTotalRent || '');
          setDiscountOnRent(details.discountOnRent || '');
          setFinalRent(details.finalrent || '');
          setGrandTotalDeposit(details.grandTotalDeposit || '');
          setDiscountOnDeposit(details.discountOnDeposit || '');
          setFinalDeposit(details.finaldeposite || '');
          setAmountToBePaid(details.totalamounttobepaid || '');
          setAmountPaid(details.amountpaid || '');
          setBalance(details.balance || '');
          setPaymentStatus(details.paymentstatus || '');
          setFirstPaymentDetails(details.firstpaymentdtails || '');
          setFirstPaymentMode(details.firstpaymentmode || '');
        }

        setBookings(allBookings);
      } catch (error) {
        toast.error('Error fetching booking or product details: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingAndProductDetails();
  }, [receiptNumber, userData.branchCode]);
  useEffect(() => {
    const fetchBranchName = async () => {
      try {
        if (!userData?.branchCode) return;

        const branchRef = doc(db, "branches", userData.branchCode);
        const branchSnap = await getDoc(branchRef);

        if (branchSnap.exists()) {
          setBranchName(branchSnap.data().branchName || "");
        }
      } catch (error) {
        console.error("Error fetching branch name:", error);
      }
    };

    fetchBranchName();
  }, [userData?.branchCode]);


  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        if (!userData?.branchCode) return;

        const templatesCol = collection(
          db,
          `products/${userData.branchCode}/templates`
        );

        const templatesQuery = query(templatesCol, orderBy("order", "asc"));
        const templatesSnapshot = await getDocs(templatesQuery);

        const templatesList = templatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTemplates(templatesList);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Error fetching templates");
      }
    };

    fetchTemplates();
  }, [userData?.branchCode]);


  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [isModalOpen]);



  const handleSaveSecondPayment = async () => {
    if (bookings.length === 0) return;

    try {
      const batch = writeBatch(db);
      const changes = [];

      // Compare against FIRST booking (source of truth)
      const currentDetails = bookings[0].userDetails || {};

      // ---- build updates object ONCE ----
      const updates = {};

      if (currentDetails.secondpaymentmode !== secondPaymentMode) {
        updates["userDetails.secondpaymentmode"] = secondPaymentMode;
        changes.push({
          field: "Second Payment Mode",
          previous: currentDetails.secondpaymentmode || "N/A",
          updated: secondPaymentMode,
          updatedby: userData.name,
        });
      }

      if (currentDetails.secondpaymentdetails !== secondPaymentDetails) {
        updates["userDetails.secondpaymentdetails"] = secondPaymentDetails;
        changes.push({
          field: "Second Payment Details",
          previous: currentDetails.secondpaymentdetails || "N/A",
          updated: secondPaymentDetails,
          updatedby: userData.name,
        });
      }

      if (currentDetails.specialnote !== specialNote) {
        updates["userDetails.specialnote"] = specialNote;
        changes.push({
          field: "Special Note",
          previous: currentDetails.specialnote || "N/A",
          updated: specialNote,
          updatedby: userData.name,
        });
      }

      if (currentDetails.stage !== stage) {
        updates["userDetails.stage"] = stage;

        if (stage === "successful") {
          updates["userDetails.stageUpdatedAt"] = serverTimestamp();
        }

        if (stage === "cancelled") {
          updates["userDetails.stageCancelledAt"] = serverTimestamp();
        }

        changes.push({
          field: "Stage",
          previous: currentDetails.stage || "N/A",
          updated: stage,
          updatedby: userData.name,
        });
      }

      if (changes.length === 0) {
        toast.info("No changes detected");
        return;
      }

      const newLogEntry = {
        action: `Updated:\n${changes
          .map(
            (c) =>
              `${c.field} updated from "${c.previous}" to "${c.updated}" by "${c.updatedby}"`
          )
          .join("\n\n")}`,
        timestamp: new Date().toISOString(),
        updates: changes,
      };

      // 🔁 APPLY UPDATE TO ALL BOOKINGS
      bookings.forEach((booking) => {
        const bookingRef = doc(
          db,
          `products/${userData.branchCode}/products/${booking.productId}/bookings`,
          booking.id
        );

        batch.update(bookingRef, {
          ...updates,
          activityLog: arrayUnion(newLogEntry),
        });
      });

      await batch.commit();

      toast.success("Receipt updated for all products");
      setIsEditingSecondPayment(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update receipt");
    }
  };




  if (loading) {
    return <p>Loading...</p>;
  }

  if (bookings.length === 0) {
    return <p>No booking data found for receipt number: {receiptNumber}</p>;
  }

  // Get user details from the first booking
  const userDetails = bookings[0].userDetails || {};

  const handleSavePersonalInfo = async () => {
    if (bookings.length === 0) return;

    const bookingId = bookings[0].id;
    const productId = bookings[0].productId;
    const bookingRef = doc(db, `products/${userData.branchCode}/products/${productId}/bookings`, bookingId);

    try {
      await updateDoc(bookingRef, {
        'userDetails.name': name,
        'userDetails.email': email,
        'userDetails.contact': contact,
        'userDetails.alternativecontactno': alternativeContact,
        'userDetails.identityproof': identityProof,
        'userDetails.identitynumber': identityNumber,
        'userDetails.source': source,
        'userDetails.customerby': customerBy,
        'userDetails.receiptby': receiptBy,
      });

      toast.success('Personal Info Updated Successfully');
      setIsEditingPersonalInfo(false);
    } catch (error) {
      toast.error('Error updating personal info:', error);
    }
  };

  const handleSavePaymentDetails = async () => {
    if (bookings.length === 0) return;

    const bookingId = bookings[0].id;
    const productId = bookings[0].productId;
    const bookingRef = doc(db, `products/${userData.branchCode}/products/${productId}/bookings`, bookingId);

    try {
      await updateDoc(bookingRef, {
        'userDetails.grandTotalRent': grandTotalRent,
        'userDetails.discountOnRent': discountOnRent,
        'userDetails.finalrent': finalRent,
        'userDetails.grandTotalDeposit': grandTotalDeposit,
        'userDetails.discountOnDeposit': discountOnDeposit,
        'userDetails.finaldeposite': finalDeposit,
        'userDetails.totalamounttobepaid': amountToBePaid,
        'userDetails.amountpaid': amountPaid,
        'userDetails.balance': balance,
        'userDetails.paymentstatus': paymentStatus,
        'userDetails.firstpaymentdtails': firstPaymentDetails,
        'userDetails.firstpaymentmode': firstPaymentMode,
      });

      toast.success('Payment Details Updated Successfully');
      setIsEditingPayment(false);
    } catch (error) {
      toast.error('Error updating payment details:', error);
    }
  };
  const handleContactNumberClick = () => {
    const contactNo = userDetails?.contact || '';
    setSelectedContactNo(contactNo);
    setIsModalOpen(true);
  };


  // Function to send WhatsApp message
  const sendWhatsAppMessage = (contactNo, message) => {
    if (!contactNo) {
      toast.error("No contact number provided!");
      return;
    }

    // Check if the contact number starts with +91 or not
    const formattedContactNo = contactNo.startsWith("+91")
      ? contactNo
      : `+91${contactNo}`;

    const whatsappURL = `https://api.whatsapp.com/send?phone=${formattedContactNo}&text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank");
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',

    }).format(date);
  };



  // Handle template click and send WhatsApp message
  const handleTemplateClick = (template) => {
    if (!bookings.length) return;

    const booking = bookings[0];
    const contactNo = booking?.userDetails?.contact || '';
    const createdAt = booking?.createdAt;
    const pickupDate = booking?.pickupDate;
    const returnDate = booking?.returnDate;

    const productsList = bookings.map((b) => ({
      productCode: b.product?.productCode || '',
      productName: b.product?.productName || '',
      quantity: b.quantity || '',
    }));

    const productsString = productsList
      .map((p) => `${p.productCode} : ${p.quantity}`)
      .join(', ');

    const productsString1 = productsList
      .map((p) => `${p.productName}`)
      .join(', ');

    const templateBody = template.body;

    const message = templateBody
      .replace('{clientName}', name || '')
      .replace('{clientEmail}', email || '')
      .replace('{CustomerBy}', customerBy || '')
      .replace('{ReceiptBy}', receiptBy || '')
      .replace('{Alterations}', '') // optional, you can add this to state if needed
      .replace('{SpecialNote}', specialNote || '')
      .replace('{GrandTotalRent}', grandTotalRent || '')
      .replace('{DiscountOnRent}', discountOnRent || '')
      .replace('{FinalRent}', finalRent || '')
      .replace('{GrandTotalDeposit}', grandTotalDeposit || '')
      .replace('{DiscountOnDeposit}', discountOnDeposit || '')
      .replace('{FinalDeposit}', finalDeposit || '')
      .replace('{AmountToBePaid}', amountToBePaid || '')
      .replace('{AmountPaid}', amountPaid || '')
      .replace('{Balance}', balance || '')
      .replace('{PaymentStatus}', paymentStatus || '')
      .replace('{FirstPaymentDetails}', firstPaymentDetails || '')
      .replace('{FirstPaymentMode}', firstPaymentMode || '')
      .replace('{SecondPaymentMode}', secondPaymentMode || '')
      .replace('{SecondPaymentDetails}', secondPaymentDetails || '')
      .replace('{Products}', productsString || '')
      .replace('{Products1}', productsString1 || '')
      .replace('{createdAt}', createdAt ? formatDate(createdAt.toDate()) : '')
      .replace('{pickupDate}', pickupDate ? formatDate(pickupDate.toDate()) : '')
      .replace('{returnDate}', returnDate ? formatDate(returnDate.toDate()) : '')
      .replace('{receiptNumber}', receiptNumber || '')
      .replace('{stage}', stage || '')
      .replace('{ContactNo}', contactNo || '')
      .replace('{IdentityProof}', identityProof || '')
      .replace('{IdentityNumber}', identityNumber || '');

    sendWhatsAppMessage(contactNo, message);
    setIsModalOpen(false);
  };


  // Handle contact number selection


  return (
    <>
      <div className="booking-details-container">
        <div className="print-header">
          <h1>{branchName || "hhhhhh"}</h1>
          <h2>Receipt No: {receiptNumber}</h2>
        </div>

        {/* ================= HEADER ================= */}
        <div className="saas-topbar">
          <div className="topbar-left">
  <img
  src={backIcon}
  alt="Back"
  className="back-icon"
  onClick={() => navigate(-1)}
/>


            <div>
              <h2>Receipt #{receiptNumber}</h2>
              <span className="stage-pill">{stage}</span>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="print-button" onClick={() => window.print()}>
              Print
            </button>
            <button
              className="whatsapp-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleContactNumberClick();
              }}
            >
              <FaWhatsapp />
              WhatsApp
            </button>
          </div>
        </div>
        {isModalOpen && (
          <>
            {/* Modal Background Overlay */}
            <div
              className="modal-overlay"
              onClick={() => setIsModalOpen(false)} // Close the modal when clicking on the overlay
            ></div>

            {/* Modal Popup */}
            <div
              className="modal-popup"
              onClick={(e) => e.stopPropagation()} // Prevent modal from closing on click inside the modal
            >
              <h3>Select a Template</h3>
              <ul className="template-list">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className="template-item"
                  >
                    {template.name}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setIsModalOpen(false)}

              >
                Close
              </button>
            </div>
          </>
        )}


        {/* ================= LAYOUT ================= */}
        <div className="saas-layout">

          {/* ================= ACTIVITY LOG ================= */}
          <aside className="activity-log-container">
            <h3>Activity Log</h3>

            {activityLogs.length ? (
              <ul>
                {activityLogs.map((log, i) => (
                  <li key={i} className="timeline-item">
                    <span className="timeline-dot" />
                    <div>
                      <p>{log.action}</p>
                      <small>{formatTimestamp(log.timestamp)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No activity log available</p>
            )}
          </aside>


          {/* ================= MAIN CONTENT ================= */}
          <main className="main-content">

            {/* ================= PERSONAL DETAILS ================= */}
            <section className="card">
              <div className="card-header">
                <h3>Personal Details</h3>
                {!isEditingPersonalInfo && userData?.role !== "Subuser" && (
                  <button onClick={() => setIsEditingPersonalInfo(true)}>Edit</button>
                )}
              </div>

              {isEditingPersonalInfo ? (
                <>
                  <div className="info-row">
                    <label>Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                    <label>Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Contact No</label>
                    <input value={contact} onChange={(e) => setContact(e.target.value)} />
                    <label>Alternate Contact</label>
                    <input value={alternativeContact} onChange={(e) => setAlternativeContact(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Identity Proof</label>
                    <input value={identityProof} onChange={(e) => setIdentityProof(e.target.value)} />
                    <label>Identity Number</label>
                    <input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Source</label>
                    <input value={source} onChange={(e) => setSource(e.target.value)} />
                    <label>Customer By</label>
                    <input value={customerBy} onChange={(e) => setCustomerBy(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Receipt By</label>
                    <input value={receiptBy} onChange={(e) => setReceiptBy(e.target.value)} />
                  </div>

                  <div className="form-actions">
                    <button onClick={handleSavePersonalInfo}>Save</button>
                    <button onClick={() => setIsEditingPersonalInfo(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="info-row">
                    <p><strong>Name:</strong> {name || "N/A"}</p>
                    <p><strong>Email:</strong> {email || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Contact:</strong> {contact || "N/A"}</p>
                    <p><strong>Alt Contact:</strong> {alternativeContact || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>ID Proof:</strong> {identityProof || "N/A"}</p>
                    <p><strong>ID Number:</strong> {identityNumber || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Source:</strong> {source || "N/A"}</p>
                    <p><strong>Customer By:</strong> {customerBy || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Receipt By:</strong> {receiptBy || "N/A"}</p>
                  </div>
                </>
              )}
            </section>

            {/* ================= PRODUCT DETAILS ================= */}
            {!isDeleted && (
              <section className="card">
                <h3>Product Details</h3>

                <div className="product-table-wrapper">
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Code</th>
                        <th>Qty</th>
                        <th>Rent</th>
                        <th>Deposit</th>
                        <th>Extra</th>
                        <th>Pickup</th>
                        <th>Return</th>
                        <th>Alteration</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bookings.length === 0 ? (
                        <tr className="empty-row">
                          <td colSpan="10">No products added</td>
                        </tr>
                      ) : (
                        bookings.map((booking, index) => (
                          <tr key={index}>
                            {/* IMAGE */}
                            <td data-label="Image">
                              <img
                                src={booking.product?.imageUrls}
                                alt={booking.product?.productName}
                                className="product-table-img"
                                onClick={() => setPreviewImage(booking.product?.imageUrls)}
                              />

                            </td>

                            {/* PRODUCT */}
                            <td data-label="Product">
                              {booking.product?.productName}
                            </td>

                            {/* CODE */}
                            <td data-label="Code">
                              {booking.product?.productCode}
                            </td>

                            {/* QTY */}
                            <td data-label="Qty">
                              {booking.quantity}
                            </td>

                            {/* RENT */}
                            <td data-label="Rent">
                              ₹{booking.price}
                            </td>

                            {/* DEPOSIT */}
                            <td data-label="Deposit">
                              ₹{booking.deposit}
                            </td>

                            {/* EXTRA */}
                            <td data-label="Extra Rent">
                              ₹{booking.extraRent || "-"}
                            </td>

                            {/* PICKUP */}
                            <td data-label="Pickup">
                              {formatDateDMY(booking.pickupDate)}
                            </td>

                            {/* RETURN */}
                            <td data-label="Return">
                              {formatDateDMY(booking.returnDate)}
                            </td>

                            {/* ALTERATION */}
                            <td data-label="Alteration">
                              {userDetails?.alterations || "N/A"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}


            {/* ================= PAYMENT DETAILS (ALL FIELDS) ================= */}
            <section className="card">
              <div className="card-header">
                <h3>Payment Details</h3>
                {!isEditingPayment && userData?.role !== "Subuser" && (
                  <button onClick={() => setIsEditingPayment(true)}>Edit</button>
                )}
              </div>

              {isEditingPayment ? (
                <>
                  <div className="info-row">
                    <label>Grand Total Rent</label>
                    <input value={grandTotalRent} onChange={(e) => setGrandTotalRent(e.target.value)} />
                    <label>Grand Total Deposit</label>
                    <input value={grandTotalDeposit} onChange={(e) => setGrandTotalDeposit(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Discount on Rent</label>
                    <input value={discountOnRent} onChange={(e) => setDiscountOnRent(e.target.value)} />
                    <label>Discount on Deposit</label>
                    <input value={discountOnDeposit} onChange={(e) => setDiscountOnDeposit(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Final Rent</label>
                    <input value={finalRent} onChange={(e) => setFinalRent(e.target.value)} />
                    <label>Final Deposit</label>
                    <input value={finalDeposit} onChange={(e) => setFinalDeposit(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Amount To Be Paid</label>
                    <input value={amountToBePaid} onChange={(e) => setAmountToBePaid(e.target.value)} />
                    <label>Amount Paid</label>
                    <input value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Balance</label>
                    <input value={balance} onChange={(e) => setBalance(e.target.value)} />
                    <label>Payment Status</label>
                    <input value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>First Payment Details</label>
                    <input value={firstPaymentDetails} onChange={(e) => setFirstPaymentDetails(e.target.value)} />
                    <label>First Payment Mode</label>
                    <input value={firstPaymentMode} onChange={(e) => setFirstPaymentMode(e.target.value)} />
                  </div>

                  <div className="form-actions">
                    <button onClick={handleSavePaymentDetails}>Save</button>
                    <button onClick={() => setIsEditingPayment(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="info-row">
                    <p><strong>Grand Total Rent:</strong> ₹{userDetails.grandTotalRent || "N/A"}</p>
                    <p><strong>Grand Total Deposit:</strong> ₹{userDetails.grandTotalDeposit || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Discount on Rent:</strong> ₹{userDetails.discountOnRent || "N/A"}</p>
                    <p><strong>Discount on Deposit:</strong> ₹{userDetails.discountOnDeposit || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Final Rent:</strong> ₹{userDetails.finalrent || "N/A"}</p>
                    <p><strong>Final Deposit:</strong> ₹{userDetails.finaldeposite || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Amount To Be Paid:</strong> ₹{userDetails.totalamounttobepaid || "N/A"}</p>
                    <p><strong>Total Credits:</strong> ₹{userDetails.totalcredit || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Amount Paid:</strong> ₹{userDetails.amountpaid || "N/A"}</p>
                    <p><strong>Credit Used:</strong> ₹{userDetails.creditNoteAmountAppliedToRent || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Balance:</strong> ₹{userDetails.balance || "N/A"}</p>
                    <p><strong>Credit Balance:</strong> ₹{userDetails.Balance || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Payment Status:</strong> {userDetails.paymentstatus || "N/A"}</p>
                    <p><strong>First Payment Details:</strong> ₹{userDetails.firstpaymentdtails || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>First Payment Mode:</strong> {userDetails.firstpaymentmode || "N/A"}</p>
                  </div>
                </>
              )}
            </section>

            {/* ================= CLIENT TYPE ================= */}
            <section className="card">
              <h3>Client Type</h3>

              {isEditingSecondPayment ? (
                <>
                  <div className="info-row">
                    <label>Second Payment Mode</label>
                    <select
                      value={secondPaymentMode}
                      onChange={(e) => setSecondPaymentMode(e.target.value)}
                    >
                      <option value="">Select payment mode</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  <div className="info-row">
                    <label>Second Payment Details</label>
                    <input value={secondPaymentDetails} onChange={(e) => setSecondPaymentDetails(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Special Note</label>
                    <input value={specialNote} onChange={(e) => setSpecialNote(e.target.value)} />
                  </div>

                  <div className="info-row">
                    <label>Stage</label>
                    <select value={stage} onChange={(e) => setStage(e.target.value)}>
                      <option value="Booking">Booking</option>
                      <option value="pickupPending">Pickup Pending</option>
                      <option value="pickup">Picked Up</option>
                      <option value="returnPending">Return Pending</option>
                      <option value="return">Returned</option>
                      <option value="successful">Successful</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="postponed">Postponed</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button onClick={handleSaveSecondPayment}>Save</button>
                    <button onClick={() => setIsEditingSecondPayment(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="info-row">
                    <p><strong>Second Payment Mode:</strong> {secondPaymentMode || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Second Payment Details:</strong> {secondPaymentDetails || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Special Note:</strong> {specialNote || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Stage:</strong> {stage || "N/A"}</p>
                  </div>

                  <button onClick={() => setIsEditingSecondPayment(true)}>Update</button>
                </>
              )}
            </section>

          </main>
        </div>
      </div>
      {previewImage && (
        <div
          className="image-preview-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="image-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewImage} alt="Preview" />
            <button
              className="image-preview-close"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}


      <ToastContainer />
    </>
  );



};

export default BookingDetailsPage