import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc, addDoc, setDoc
} from 'firebase/firestore';
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
import AddProductBooking from './AddProductBooking';
import { collectionGroup } from "firebase/firestore";

const formatTimestamp = (timestamp) => {

  if (!timestamp) return "N/A";

  let date;

  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date)) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);

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
  const [paymentTransactions, setPaymentTransactions] = useState([]);
  // State for editing specific fields
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [refundLocked, setRefundLocked] = useState(false);
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedContactNo, setSelectedContactNo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentMode, setNewPaymentMode] = useState("");
  const [newPaymentDetails, setNewPaymentDetails] = useState("");
  const [isEditingSecondPayment, setIsEditingSecondPayment] = useState(false);
  const [secondPaymentMode, setSecondPaymentMode] = useState('');
  const [secondPaymentDetails, setSecondPaymentDetails] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [stage, setStage] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
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
  const [isReturningDeposit, setIsReturningDeposit] = useState(false);

  const [refundAmount, setRefundAmount] = useState("");
  const [refundMode, setRefundMode] = useState("");
  const [refundDetails, setRefundDetails] = useState("");
  const [deletePreview, setDeletePreview] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
  const [paymentDoc, setPaymentDoc] = useState(null);
  const location = useLocation();
  const isDeleted = location.state?.isDeleted || false;

useEffect(() => {

  const fetchBookingAndProductDetails = async () => {

    setLoading(true);

    try {

      // 1️⃣ Fetch bookings directly
      const bookingsQuery = query(
        collectionGroup(db, "bookings"),
        where("receiptNumber", "==", receiptNumber)
      );

      const bookingSnap = await getDocs(bookingsQuery);

      if (bookingSnap.empty) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // 2️⃣ Collect productIds from bookings
      const productIds = new Set();

      bookingSnap.docs.forEach(doc => {
        const productId = doc.ref.parent.parent.id;
        productIds.add(productId);
      });

      // 3️⃣ Fetch only those products
      const productDocs = await Promise.all(
        [...productIds].map(id =>
          getDoc(
            doc(
              db,
              `products/${userData.branchCode}/products/${id}`
            )
          )
        )
      );

      const productsMap = {};

      productDocs.forEach(d => {
        if (d.exists()) {
          productsMap[d.id] = d.data();
        }
      });

      // 4️⃣ Merge bookings + product data
      const bookingList = bookingSnap.docs.map(doc => {

        const data = doc.data();
        const productId = doc.ref.parent.parent.id;

        return {
          ...data,
          id: doc.id,
          productId,
          product: productsMap[productId] || null,
          archived: data.archived || false
        };

      });

      setBookings(bookingList);

      // 5️⃣ Customer details
      const details = bookingList[0]?.userDetails || {};

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

    } catch (error) {

      toast.error(
        "Error fetching booking or product details: " + error.message
      );

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

    const fetchPaymentDoc = async () => {

      if (!userData?.branchCode || !receiptNumber) return;

      try {

        const paymentRef = doc(
          db,
          `products/${userData.branchCode}/payments`,
          receiptNumber
        );

        const paymentSnap = await getDoc(paymentRef);

        if (paymentSnap.exists()) {
          setPaymentDoc(paymentSnap.data());
        }

      } catch (error) {
        console.error("Error fetching payment doc:", error);
      }

    };

    fetchPaymentDoc();

  }, [receiptNumber, userData?.branchCode]);

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

  useEffect(() => {

    const fetchTransactions = async () => {

      if (!userData?.branchCode || !receiptNumber) return;

      try {

        const transactionsRef = collection(
          db,
          `products/${userData.branchCode}/payments/${receiptNumber}/transactions`
        );

        const q = query(transactionsRef, orderBy("paymentNumber", "asc"));

        const snapshot = await getDocs(q);

        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPaymentTransactions(transactions);

      } catch (error) {
        console.error("Error fetching transactions:", error);
      }

    };

    fetchTransactions();

  }, [receiptNumber, userData?.branchCode]);
  const [accountSummary, setAccountSummary] = useState(null);

  useEffect(() => {

    if (!paymentDoc) return;

    let totalPaid = 0;
    let totalRefunded = 0;

    paymentTransactions.forEach(tx => {

      if (tx.type === "depositReturn") {
        totalRefunded += Number(tx.amount || 0);
      } else {
        totalPaid += Number(tx.amount || 0);
      }

    });

    const rent = Number(paymentDoc.finalRent || 0);
    const deposit = Number(paymentDoc.finalDeposit || 0);

    const rentCollected = Math.min(totalPaid, rent);
    const rentPending = rent - rentCollected;

   const depositCollected = Math.max(0, totalPaid - rent);

const depositPending = Math.max(deposit - depositCollected, 0);

    const depositReturned = totalRefunded;

    const depositWithYou = Math.max(
      depositCollected - depositReturned,
      0
    );
    setAccountSummary({
      rent,
      deposit,
      rentCollected,
      rentPending,
      depositCollected,
      depositPending,
      depositReturned,
      depositWithYou,
      totalPaid
    });

  }, [paymentTransactions, paymentDoc]);
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [isModalOpen]);



  const handleSaveSecondPayment = async () => {
    if (bookings.length === 0) return;

    try {

      const batch = writeBatch(db);
      const changes = [];

      const currentDetails = bookings[0].userDetails || {};

      const updates = {};

      // Second payment mode
      if (currentDetails.secondpaymentmode !== secondPaymentMode) {
        updates["userDetails.secondpaymentmode"] = secondPaymentMode;

        changes.push({
          field: "Second Payment Mode",
          previous: currentDetails.secondpaymentmode || "N/A",
          updated: secondPaymentMode,
          updatedby: userData.name,
        });
      }

      // Second payment details
      if (currentDetails.secondpaymentdetails !== secondPaymentDetails) {
        updates["userDetails.secondpaymentdetails"] = secondPaymentDetails;

        changes.push({
          field: "Second Payment Details",
          previous: currentDetails.secondpaymentdetails || "N/A",
          updated: secondPaymentDetails,
          updatedby: userData.name,
        });
      }

      // Special note
      if (currentDetails.specialnote !== specialNote) {
        updates["userDetails.specialnote"] = specialNote;

        changes.push({
          field: "Special Note",
          previous: currentDetails.specialnote || "N/A",
          updated: specialNote,
          updatedby: userData.name,
        });
      }

      // Stage update
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

      // 🔁 Update ALL bookings for this receipt
      bookings
  .filter(b => !b.archived)
  .forEach((booking) => {

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

      // 🔥 Sync stage to payment document
      const paymentRef = doc(
        db,
        `products/${userData.branchCode}/payments`,
        receiptNumber
      );

      await updateDoc(paymentRef, {
        bookingStage: stage
      });

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

  try {

    const batch = writeBatch(db);

    // 🔹 Update only ACTIVE bookings (skip deleted/archived)
    bookings
      .filter(b => !b.archived)
      .forEach((booking) => {

        const bookingRef = doc(
          db,
          `products/${userData.branchCode}/products/${booking.productId}/bookings`,
          booking.id
        );

        batch.update(bookingRef, {
          "userDetails.grandTotalRent": Number(grandTotalRent),
          "userDetails.discountOnRent": Number(discountOnRent),
          "userDetails.finalrent": Number(finalRent),

          "userDetails.grandTotalDeposit": Number(grandTotalDeposit),
          "userDetails.discountOnDeposit": Number(discountOnDeposit),
          "userDetails.finaldeposite": Number(finalDeposit),

          "userDetails.totalamounttobepaid": Number(amountToBePaid),
          "userDetails.amountpaid": Number(amountPaid),
          "userDetails.balance": Number(balance),

          "userDetails.paymentstatus": paymentStatus,
          "userDetails.firstpaymentdtails": firstPaymentDetails,
          "userDetails.firstpaymentmode": firstPaymentMode
        });

      });

    // 🔹 Update payment document
    const paymentRef = doc(
      db,
      `products/${userData.branchCode}/payments`,
      receiptNumber
    );

    batch.update(paymentRef, {
      grandTotalRent: Number(grandTotalRent),
      discountOnRent: Number(discountOnRent),
      finalRent: Number(finalRent),

      grandTotalDeposit: Number(grandTotalDeposit),
      discountOnDeposit: Number(discountOnDeposit),
      finalDeposit: Number(finalDeposit),

      totalAmount: Number(amountToBePaid),
      amountPaid: Number(amountPaid),
      balance: Number(balance),

      paymentStatus: paymentStatus,
      firstPaymentMode: firstPaymentMode,
      firstPaymentDetails: firstPaymentDetails
    });

    await batch.commit();

    toast.success("Payment details updated everywhere");
    setIsEditingPayment(false);

  } catch (error) {
    console.error(error);
    toast.error("Error updating payment details");
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

  const saveAccountSummary = async (transactions = paymentTransactions) => {

    if (!paymentDoc) return;

    let totalPaid = 0;
    let totalRefunded = 0;

    transactions.forEach(tx => {

      if (tx.type === "depositReturn") {
        totalRefunded += Number(tx.amount || 0);
      } else {
        totalPaid += Number(tx.amount || 0);
      }

    });

    const rent = Number(paymentDoc.finalRent || 0);
    const deposit = Number(paymentDoc.finalDeposit || 0);

    const rentCollected = Math.min(totalPaid, rent);
    const rentPending = rent - rentCollected;

  const depositCollected = Math.max(0, totalPaid - rent);

const depositPending = Math.max(deposit - depositCollected, 0);

    const depositReturned = totalRefunded;

    const depositWithYou = Math.max(
      depositCollected - depositReturned,
      0
    );

    const paymentRef = doc(
      db,
      `products/${userData.branchCode}/payments`,
      receiptNumber
    );

    await updateDoc(paymentRef, {
      rentCollected,
      rentPending,
      depositCollected,
      depositPending,
      depositReturned,
      depositWithYou
    });

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
  const refreshPaymentData = async () => {
  if (!userData?.branchCode || !receiptNumber) return;

  try {
    // refresh payment document
    const paymentRef = doc(
      db,
      `products/${userData.branchCode}/payments`,
      receiptNumber
    );

    const paymentSnap = await getDoc(paymentRef);
    if (paymentSnap.exists()) {
      setPaymentDoc(paymentSnap.data());
    }

    // refresh transactions
    const transactionsRef = collection(
      db,
      `products/${userData.branchCode}/payments/${receiptNumber}/transactions`
    );

    const q = query(transactionsRef, orderBy("paymentNumber", "asc"));
    const snapshot = await getDocs(q);

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setPaymentTransactions(transactions);

  } catch (error) {
    console.error("Refresh error:", error);
  }
};
  const handleAddPayment = async () => {

    if (paymentLocked) return;

    setPaymentLocked(true);

    try {

      const amount = Number(newPaymentAmount);

      if (!amount) {
        toast.error("Enter payment amount");
        setPaymentLocked(false);
        return;
      }

      const paymentRef = doc(
        db,
        `products/${userData.branchCode}/payments`,
        receiptNumber
      );

      const transactionsRef = collection(
        db,
        `products/${userData.branchCode}/payments/${receiptNumber}/transactions`
      );

      const newPaid = Number(paymentDoc?.amountPaid || 0) + amount;
      let newBalance = Number(paymentDoc?.totalAmount || 0) - newPaid;

if (newBalance < 0) {
  newBalance = 0;
}

      const snapshot = await getDocs(transactionsRef);

      const nextPaymentNumber = snapshot.size + 1;

      const transactionId = `tx${nextPaymentNumber}`;

      const transactionDocRef = doc(
        db,
        `products/${userData.branchCode}/payments/${receiptNumber}/transactions`,
        transactionId
      );

      // 🔹 Save transaction (UNCHANGED)
      await setDoc(transactionDocRef, {
        amount: amount,
        mode: newPaymentMode,
        details: newPaymentDetails,
        paymentNumber: nextPaymentNumber,
        createdAt: serverTimestamp(),
        createdBy: userData.name
      });

      /* ----------------------------------
         LEDGER SPLIT LOGIC (NEW PART)
      ---------------------------------- */

      const rent = Number(paymentDoc?.finalRent || 0);
      const deposit = Number(paymentDoc?.finalDeposit || 0);

      const alreadyPaid = Number(paymentDoc?.amountPaid || 0);

      const rentCollectedBefore = Math.min(alreadyPaid, rent);

      const rentPending = rent - rentCollectedBefore;

      const rentPay = Math.min(amount, rentPending);

      const depositPay = Math.max(amount - rentPay, 0);

      const ledgerRef = collection(
        db,
        `products/${userData.branchCode}/ledger`
      );

      // 🔹 Save rent ledger entry
      if (rentPay > 0) {

        await addDoc(ledgerRef, {
          receiptNumber,
          customerName: name || "",
          type: "rentPayment",
          amount: rentPay,
          mode: newPaymentMode || "",
          details: newPaymentDetails || "",
          createdAt: serverTimestamp(),
          createdBy: userData.name
        });

      }

      // 🔹 Save deposit ledger entry
      if (depositPay > 0) {

        await addDoc(ledgerRef, {
          receiptNumber,
          customerName: name || "",
          type: "depositPayment",
          amount: depositPay,
          mode: newPaymentMode || "",
          details: newPaymentDetails || "",
          createdAt: serverTimestamp(),
          createdBy: userData.name
        });

      }

      /* ---------------------------------- */

      await updateDoc(paymentRef, {
        amountPaid: newPaid,
        balance: newBalance
      });

      const newLogEntry = {
        action: `Payment Added ₹${amount} via ${newPaymentMode}`,
        timestamp: new Date().toISOString(),
        updatedby: userData.name
      };

      const batch = writeBatch(db);

      bookings.forEach((booking) => {

        const bookingRef = doc(
          db,
          `products/${userData.branchCode}/products/${booking.productId}/bookings`,
          booking.id
        );

        batch.update(bookingRef, {
          "userDetails.amountpaid": newPaid,
          "userDetails.balance": newBalance,
          activityLog: arrayUnion(newLogEntry)
        });

      });

      await batch.commit();

      await saveAccountSummary([
        ...paymentTransactions,
        {
          amount,
          paymentNumber: nextPaymentNumber
        }
      ]);

      toast.success("Payment added successfully");
      await refreshPaymentData();
      setIsAddingPayment(false);
      setNewPaymentAmount("");
      setNewPaymentMode("");
      setNewPaymentDetails("");

    } catch (error) {

      console.error(error);
      toast.error("Failed to add payment");

    }

    setTimeout(() => {
      setPaymentLocked(false);
    }, 6000);

  };
  const handleReturnDeposit = async () => {

    if (refundLocked) return;

    setRefundLocked(true);

    try {

      const amount = Number(refundAmount);

      if (!amount) {
        toast.error("Enter refund amount");
        setRefundLocked(false);
        return;
      }

      const transactionsRef = collection(
        db,
        `products/${userData.branchCode}/payments/${receiptNumber}/transactions`
      );

      const snapshot = await getDocs(transactionsRef);

      const nextPaymentNumber = snapshot.size + 1;

      const transactionDocRef = doc(
        db,
        `products/${userData.branchCode}/payments/${receiptNumber}/transactions`,
        `tx${nextPaymentNumber}`
      );

      // 🔹 Save refund transaction (existing logic)
      await setDoc(transactionDocRef, {

        amount,
        mode: refundMode,
        details: refundDetails,
        paymentNumber: nextPaymentNumber,

        type: "depositReturn",

        createdAt: serverTimestamp(),
        createdBy: userData.name

      });

      // 🔹 NEW: Save refund in ledger
      await addDoc(
        collection(db, `products/${userData.branchCode}/ledger`),
        {
          receiptNumber: receiptNumber,
          customerName: name || "",
          type: "depositReturn",
          amount: amount,
          mode: refundMode || "",
          details: refundDetails || "",
          createdAt: serverTimestamp(),
          createdBy: userData.name
        }
      );

      await saveAccountSummary([
        ...paymentTransactions,
        {
          amount,
          type: "depositReturn"
        }
      ]);

      toast.success("Deposit refunded");
      await refreshPaymentData();
      setRefundAmount("");
      setRefundMode("");
      setRefundDetails("");
      setIsReturningDeposit(false);

    } catch (error) {

      console.error(error);
      toast.error("Refund failed");

    }

    // 🔒 unlock after 6 seconds
    setTimeout(() => {
      setRefundLocked(false);
    }, 6000);

  };
  const handleDeleteProduct = async (booking) => {

    if (!window.confirm("Remove this product from receipt?")) return;

    try {

      const batch = writeBatch(db);

      const bookingRef = doc(
        db,
        `products/${userData.branchCode}/products/${booking.productId}/bookings/${booking.id}`
      );
      const deletedRef = doc(
        db,
        `products/${userData.branchCode}/bookingArchive`,
        booking.id
      );

      const paymentRef = doc(
        db,
        `products/${userData.branchCode}/payments`,
        receiptNumber
      );

      const paymentSnap = await getDoc(paymentRef);

      if (!paymentSnap.exists()) {
        toast.error("Payment document not found");
        return;
      }

      const paymentData = paymentSnap.data();

      /* 🔹 Correct rent calculation */
      const removedRent = Number(booking.totalCost || 0);

      const removedDeposit =
        Number(booking.deposit || 0) * Number(booking.quantity || 0);

      /* 🔹 Calculate new totals */

      let newFinalRent = (paymentData.finalRent || 0) - removedRent;
let newFinalDeposit = (paymentData.finalDeposit || 0) - removedDeposit;

let newGrandTotalRent =
  (paymentData.grandTotalRent || 0) - removedRent;

let newGrandTotalDeposit =
  (paymentData.grandTotalDeposit || 0) - removedDeposit;

      if (newFinalRent < 0) newFinalRent = 0;
      if (newFinalDeposit < 0) newFinalDeposit = 0;

      const newTotalAmount = newFinalRent + newFinalDeposit;
      const amountPaid = paymentData.amountPaid || 0;

const rentCollected = Math.min(amountPaid, newFinalRent);
const rentPending = newFinalRent - rentCollected;

const depositCollected = Math.max(0, amountPaid - newFinalRent);

const depositPending = Math.max(newFinalDeposit - depositCollected, 0);
const depositReturned = paymentData.depositReturned || 0;

const depositWithYou = Math.max(
  depositCollected - depositReturned,
  0
);

      let newBalance = newTotalAmount - amountPaid;

if (newBalance < 0) {
  newBalance = 0;
}

      /* 🔹 Update productsSummary */

      const updatedProductsSummary =
  (paymentData.productsSummary || []).filter(
    (p) => p.productCode !== booking.productCode
  );

      /* 🔹 Move booking to deletedBookings */

      batch.set(deletedRef, {
        ...booking,
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: userData.name
      });

      /* 🔹 Delete original booking */

      batch.delete(bookingRef);

      /* 🔹 Update payment document */

    batch.update(paymentRef, {
  finalRent: newFinalRent,
  finalDeposit: newFinalDeposit,
  grandTotalRent: newGrandTotalRent,
  grandTotalDeposit: newGrandTotalDeposit,

  totalAmount: newTotalAmount,
  balance: newBalance,

  rentCollected,
  rentPending,
  depositCollected,
  depositPending,
  depositWithYou,

  productsSummary: updatedProductsSummary
});
      await batch.commit();
      const remainingBookings = bookings.filter(
  b => !(b.id === booking.id && b.productId === booking.productId)
);

const batch2 = writeBatch(db);

remainingBookings.forEach(b => {

  const ref = doc(
    db,
    `products/${userData.branchCode}/products/${b.productId}/bookings`,
    b.id
  );

  batch2.update(ref, {
    "userDetails.grandTotalRent": newGrandTotalRent,
    "userDetails.grandTotalDeposit": newGrandTotalDeposit,
    "userDetails.finalrent": newFinalRent,
    "userDetails.finaldeposite": newFinalDeposit,
    "userDetails.totalamounttobepaid": newTotalAmount,
    "userDetails.balance": newBalance
  });

});

await batch2.commit();

      toast.success("Product removed and totals updated");

      /* 🔹 Update UI */

      setBookings(prev =>
        prev.filter(b => !(b.id === booking.id && b.productId === booking.productId))
      );

    } catch (error) {

      console.error(error);
      toast.error("Failed to delete product");

    }

  };
  const previewDeleteProduct = async (booking) => {

    try {

      const paymentRef = doc(
        db,
        `products/${userData.branchCode}/payments`,
        receiptNumber
      );

      const paymentSnap = await getDoc(paymentRef);

      if (!paymentSnap.exists()) {
        toast.error("Payment document not found");
        return;
      }

      const paymentData = paymentSnap.data();

      const removedRent = Number(booking.totalCost || 0);
      const removedDeposit =
        Number(booking.deposit || 0) * Number(booking.quantity || 0);

      const newFinalRent = paymentData.finalRent - removedRent;
      const newFinalDeposit = paymentData.finalDeposit - removedDeposit;

      const newTotal = newFinalRent + newFinalDeposit;

      const amountPaid = paymentData.amountPaid || 0;

      const newBalance = newTotal - amountPaid;

      setDeletePreview({
        booking,

        oldRent: paymentData.finalRent,
        oldDeposit: paymentData.finalDeposit,
        oldTotal: paymentData.totalAmount,

        amountPaid: paymentData.amountPaid,

        newRent: newFinalRent,
        newDeposit: newFinalDeposit,
        newTotal: newTotal,
        newBalance: newBalance
      });

      setShowDeleteModal(true);

    } catch (error) {
      console.error(error);
    }

  };

  // Handle contact numbera selection


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
                  <div className="info-row">
                    <p>
                      <strong>Created At:</strong>{" "}
                      {bookings[0]?.createdAt ? formatTimestamp(bookings[0].createdAt) : "N/A"}
                    </p>
                  </div>
                </>
              )}
            </section>

            {/* ================= PRODUCT DETAILS ================= */}
            {!isDeleted && (
              <section className="card">
               <div className="product-header">
  <h3>Product Details</h3>

  {userData?.role !== "Subuser" && (
    <button
      className="add-product-btn"
      onClick={() => setShowAddProductModal(true)}
    >
      Add Product
    </button>
  )}
</div>

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
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {bookings.length === 0 ? (
                        <tr className="empty-row">
                          <td colSpan="10">No products added</td>
                        </tr>
                      ) : (
                        bookings.map((booking, index) => (
                          <tr
                            key={booking.id} style={{
                              background: booking.archived ? "#ffe5e5" : "",
                              textDecoration: booking.archived ? "line-through" : ""
                            }}
                          >
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
                              ₹{booking.totalCost}
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
                            <td>
                             {!booking.archived && (
  <button
    className="delete-product-btn"
    disabled={userData?.role === 'Subuser'}
    onClick={() => previewDeleteProduct(booking)}
  >
    Delete
  </button>
)}
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

                    {/* <label>Payment Status</label>
                    <input value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} /> */}
                  </div>

                  {/* <div className="info-row">
                    <label>First Payment Details</label>
                    <input value={firstPaymentDetails} onChange={(e) => setFirstPaymentDetails(e.target.value)} />

                    <label>First Payment Mode</label>
                    <input value={firstPaymentMode} onChange={(e) => setFirstPaymentMode(e.target.value)} />
                  </div> */}

                  <div className="form-actions">
                    <button onClick={handleSavePaymentDetails}>Save</button>
                    <button onClick={() => setIsEditingPayment(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="info-row">
                    <p><strong>Grand Total Rent:</strong> ₹{paymentDoc?.grandTotalRent || "N/A"}</p>
                    <p><strong>Grand Total Deposit:</strong> ₹{paymentDoc?.grandTotalDeposit || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Discount on Rent:</strong> ₹{paymentDoc?.discountOnRent || "N/A"}</p>
                    <p><strong>Discount on Deposit:</strong> ₹{paymentDoc?.discountOnDeposit || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Final Rent:</strong> ₹{paymentDoc?.finalRent || "N/A"}</p>
                    <p><strong>Final Deposit:</strong> ₹{paymentDoc?.finalDeposit || "N/A"}</p>
                  </div>

                 <div className="info-row">
  <p className="amount-due">
    <strong>Amount To Be Paid:</strong> ₹{paymentDoc?.totalAmount || "N/A"}
  </p>
  <p>
    <strong>Applied Credit:</strong> ₹{paymentDoc?.appliedCredit || "N/A"}
  </p>
</div>

<div className="info-row">
  <p className="amount-paid">
    <strong>Amount Paid:</strong> ₹{paymentDoc?.amountPaid || "N/A"}
  </p>
  <p className="balance">
    <strong>Balance:</strong> ₹{paymentDoc?.balance || "N/A"}
  </p>
</div>

                  {/* <div className="info-row">
                    <p><strong>Payment Status:</strong> {paymentDoc?.paymentStatus || "N/A"}</p>
                    <p><strong>First Payment Mode:</strong> {paymentDoc?.firstPaymentMode || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>First Payment Details:</strong> {paymentDoc?.firstPaymentDetails || "N/A"}</p>
                    <p><strong>Second Payment Mode:</strong> {paymentDoc?.secondPaymentMode || "N/A"}</p>
                  </div>

                  <div className="info-row">
                    <p><strong>Second Payment Details:</strong> {paymentDoc?.secondPaymentDetails || "N/A"}</p>
                  </div> */}
                </>
              )}
            </section>

            <section className="card">
              <div className="payment-history-header">
                <h3 className="payment-history-title">Payment History</h3>

                <button
                  className="payment-history-add-btn"
                  onClick={() => setIsAddingPayment(true)}
                >
                  Add Payment
                </button>
                <button
                  className="deposit-return-btn"
                  onClick={() => setIsReturningDeposit(true)}
                >
                  Return Deposit
                </button>
              </div>

              {paymentTransactions.length === 0 ? (
                <p>No payments recorded</p>
              ) : (

                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Payment #</th>
                      <th>Mode</th>
                      <th>Amount</th>
                      <th>Details</th>
                      <th>CreatedBy</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>

                    {paymentTransactions.map((tx) => (

                      <tr key={tx.id}>
                        <td>
                          {tx.type === "depositReturn"
                            ? "Deposit Return"
                            : `Payment ${tx.paymentNumber}`}
                        </td>
                        <td>{tx.mode || "N/A"}</td>
                        <td className={tx.type === "depositReturn" ? "refund-amount" : ""}>
                          ₹{tx.amount}
                        </td>
                        <td className="payment-details-cell" title={tx.details}>
                          {tx.details || "-"}
                        </td>
                        <td>{tx.createdBy || "N/A"}</td>

                        <td>{formatTimestamp(tx.createdAt)}</td>
                      </tr>

                    ))}

                  </tbody>
                </table>

              )}
              {isAddingPayment && (
                <div className="add-payment-card">

                  <h3 className="add-payment-title">Add Payment</h3>

                  <div className="add-payment-field">
                    <label className="add-payment-label">Amount</label>
                    <input
                      className="add-payment-input"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                    />
                  </div>

                  <div className="add-payment-field">
                    <label className="add-payment-label">Mode</label>
                    <select
                      className="add-payment-select"
                      value={newPaymentMode}
                      onChange={(e) => setNewPaymentMode(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  <div className="add-payment-field">
                    <label className="add-payment-label">Details</label>
                    <input
                      className="add-payment-input"
                      value={newPaymentDetails}
                      onChange={(e) => setNewPaymentDetails(e.target.value)}
                    />
                  </div>

                  <div className="add-payment-actions">
                    <button
                      className="add-payment-save"
                      onClick={handleAddPayment}
                      disabled={paymentLocked}
                    >
                      {paymentLocked ? "Processing..." : "Save Payment"}
                    </button>

                    <button
                      className="add-payment-cancel"
                      onClick={() => setIsAddingPayment(false)}
                    >
                      Cancel
                    </button>
                  </div>

                </div>
              )}
              {isReturningDeposit && (

                <div className="deposit-return-card">

                  <h3>Return Deposit</h3>

                  <div className="deposit-field">
                    <label>Amount</label>
                    <input
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                  </div>

                  <div className="deposit-field">
                    <label>Mode</label>
                    <select
                      value={refundMode}
                      onChange={(e) => setRefundMode(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="deposit-field">
                    <label>Details</label>
                    <input
                      value={refundDetails}
                      onChange={(e) => setRefundDetails(e.target.value)}
                    />
                  </div>

                  <div className="deposit-actions">

                    <button
                      onClick={handleReturnDeposit}
                      disabled={refundLocked}
                    >
                      {refundLocked ? "Processing..." : "Save Refund"}
                    </button>

                    <button onClick={() => setIsReturningDeposit(false)}>
                      Cancel
                    </button>

                  </div>

                </div>

              )}
            </section>


            {/* ================= CLIENT TYPE ================= */}
            <section className="card">
              <h3>Client Stage</h3>

              {isEditingSecondPayment ? (
                <>
                  {/* <div className="info-row">
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
                  </div> */}

                  {/* <div className="info-row">
                    <label>Second Payment Details</label>
                    <input value={secondPaymentDetails} onChange={(e) => setSecondPaymentDetails(e.target.value)} />
                  </div> */}

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
                  {/* <div className="info-row">
                    <p><strong>Second Payment Mode:</strong> {secondPaymentMode || "N/A"}</p>
                  </div>
                  <div className="info-row">
                    <p><strong>Second Payment Details:</strong> {secondPaymentDetails || "N/A"}</p>
                  </div> */}
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
            <section className="account-summary-card">

              <h3 className="account-summary-title">Account Summary</h3>

              <div className="account-summary-grid">

                <div className="summary-box">
                  <label>Total Rent</label>
                  <span>₹{accountSummary?.rent}</span>
                </div>

                <div className="summary-box collected">
                  <label>Rent Collected</label>
                  <span>₹{accountSummary?.rentCollected}</span>
                </div>

                <div className="summary-box">
                  <label>Rent Pending</label>
                  <span>₹{accountSummary?.rentPending}</span>
                </div>

                <div className="summary-box">
                  <label>Total Deposit</label>
                  <span>₹{accountSummary?.deposit}</span>
                </div>

                <div className="summary-box collected">
                  <label>Deposit Collected</label>
                  <span>₹{accountSummary?.depositCollected}</span>
                </div>

                <div className="summary-box">
                  <label>Deposit Pending</label>
                  <span>₹{accountSummary?.depositPending}</span>
                </div>

                <div className="summary-box refund">
                  <label>Deposit Returned</label>
                  <span>₹{accountSummary?.depositReturned}</span>
                </div>

                <div className="summary-box collected">
                  <label>Deposit With Us</label>
                  <span>₹{accountSummary?.depositWithYou}</span>
                </div>

              </div>

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
      {showDeleteModal && deletePreview && (
        <div className="delete-modal-overlay">

          <div className="delete-modal">

            <h3>Delete Product Confirmation</h3>

            <p>
              Product: <strong>{deletePreview.booking.product?.productName}</strong>
            </p>

            <div className="payment-summary">

              <h4>Current Payment</h4>

              <div className="summary-row">
                <span>Rent</span>
                <span>₹{deletePreview.oldRent}</span>
              </div>

              <div className="summary-row">
                <span>Deposit</span>
                <span>₹{deletePreview.oldDeposit}</span>
              </div>

              <div className="summary-row total">
                <span>Total</span>
                <span>₹{deletePreview.oldTotal}</span>
              </div>

              <hr />
              <div className="summary-row paid">
                <span>Amount Paid</span>
                <span>₹{deletePreview.amountPaid}</span>
              </div>


              <h4>After Deleting Product</h4>

              <div className="summary-row">
                <span>Rent</span>
                <span>₹{deletePreview.newRent}</span>
              </div>

              <div className="summary-row">
                <span>Deposit</span>
                <span>₹{deletePreview.newDeposit}</span>
              </div>

              <div className="summary-row total">
                <span>New Total</span>
                <span>₹{deletePreview.newTotal}</span>
              </div>

              <div className="summary-row balance">
                <span>New Balance</span>
                <span>₹{deletePreview.newBalance}</span>
              </div>

            </div>

            <div className="modal-buttons">

              <button
                className="cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>

              <button
                className="delete-btn"
                onClick={() => {
                  handleDeleteProduct(deletePreview.booking);
                  setShowDeleteModal(false);
                }}
              >
                Delete Product
              </button>

            </div>

          </div>

        </div>
      )}
{showAddProductModal && bookings.length > 0 && (

  <div className="add-product-overlay">

    <div
      className="add-product-modal-wrapper"
      onClick={(e) => e.stopPropagation()}
    >
      <AddProductBooking
        receiptNumber={receiptNumber}
        pickupDate={bookings[0].pickupDate}
        returnDate={bookings[0].returnDate}
        onClose={() => setShowAddProductModal(false)}
      />
    </div>

  </div>

)}

      <ToastContainer position="top-left" />
    </>
  );



};

export default BookingDetailsPage