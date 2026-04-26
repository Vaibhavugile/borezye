import React, { useState } from "react";
import { db } from "../../../firebaseConfig";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { query, where } from "firebase/firestore";
import { toast } from "react-toastify";
import { useUser } from "../../Auth/UserContext";
import "./AddProductBooking.css";

function AddProductBooking({ receiptNumber, pickupDate, returnDate, onClose }) {
  const { userData } = useUser();

const formatDateTimeLocal = (timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
};

const [products, setProducts] = useState([
  {
    productCode: "",
    quantity: "",
    pickupDate: formatDateTimeLocal(pickupDate),
    returnDate: formatDateTimeLocal(returnDate),
    price: 0,
    deposit: 0,
    availableQuantity: null,
    errorMessage: "",

    checked: false,
    isAvailable: false
  }
]);

  const [productSuggestions, setProductSuggestions] = useState([]);
  const [activeProductIndex, setActiveProductIndex] = useState(null);

const [showConfirmModal, setShowConfirmModal] = useState(false);
const [paymentPreview, setPaymentPreview] = useState(null);
  // ---------------- FETCH PRODUCT SUGGESTIONS ----------------

  const fetchProductSuggestions = async (searchTerm) => {

    try {

      const branchCode = userData.branchCode;

      const productsRef = collection(db, `products/${branchCode}/products`);

      const q = query(
        productsRef,
        where("productCode", ">=", searchTerm),
        where("productCode", "<=", searchTerm + "\uf8ff")
      );

      const snapshot = await getDocs(q);

      const suggestions = [];

      snapshot.forEach(doc => {

        const data = doc.data();

        suggestions.push({
          productCode: data.productCode,
          productName: data.productName || ""
        });

      });

      setProductSuggestions(suggestions);

    } catch (error) {

      console.error(error);

    }

  };


  // ---------------- FETCH PRODUCT DETAILS ----------------

  const fetchProductDetails = async (productCode, index) => {

    try {

      const branchCode = userData.branchCode;

      const productRef = doc(
        db,
        `products/${branchCode}/products`,
        productCode
      );

      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) return;

      const data = productDoc.data();

      setProducts(prev => {

        const updated = [...prev];

        updated[index] = {
          ...updated[index],
          price: data.price || 0,
          deposit: data.deposit || 0,
          productName: data.productName || "",
          priceType: data.priceType || "daily",
          minimumRentalPeriod: data.minimumRentalPeriod || 1,
          extraRent: data.extraRent || 0,
          totalQuantity: data.quantity || 0
        };

        return updated;

      });

    } catch (error) {

      console.error(error);

    }

  };


  // ---------------- CHECK AVAILABILITY ----------------

 const checkAvailability = async (index) => {

  const product = products[index];

  if (!product.productCode) {
    toast.error("Enter product code first");
    return;
  }

  const pickupDate = new Date(product.pickupDate);
  const returnDate = new Date(product.returnDate);

  try {

    const productRef = doc(
      db,
      `products/${userData.branchCode}/products`,
      product.productCode
    );

    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      toast.error("Product not found");
      return;
    }

    const productData = productDoc.data();
    const stock = productData.quantity || 0;

    const bookingsRef = collection(productRef, "bookings");
    const snapshot = await getDocs(bookingsRef);

    let booked = 0;

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      const stage = data.userDetails?.stage;

      // ignore inactive bookings
      if (
        stage === "cancelled" ||
        stage === "return" ||
        stage === "successful" ||
        stage === "postponed"
      ) {
        return;
      }

      // 🔹 SAFETY CHECK (fix for your error)
      if (!data.pickupDate || !data.returnDate) {
        return;
      }

      const bPickup = data.pickupDate?.toDate
        ? data.pickupDate.toDate()
        : new Date(data.pickupDate);

      const bReturn = data.returnDate?.toDate
        ? data.returnDate.toDate()
        : new Date(data.returnDate);

      const overlap =
        bPickup <= returnDate &&
        bReturn >= pickupDate;

      if (overlap) {
        booked += Number(data.quantity || 0);
      }

    });

    const available = stock - booked;

    const updated = [...products];

 if (Number(product.quantity) > available) {

  updated[index].availableQuantity = available;
  updated[index].errorMessage = `Only ${available} available`;
  updated[index].checked = true;
  updated[index].isAvailable = false;

  setProducts(updated);

  toast.error(`Only ${available} available`);

  return;
}

    updated[index].availableQuantity = available;
updated[index].errorMessage = "";
updated[index].checked = true;
updated[index].isAvailable = true;

setProducts(updated);

toast.success("Stock available");

  } catch (error) {

    console.error(error);
    toast.error("Availability check failed");

  }

};
  // ---------------- GET NEXT BOOKING ID ----------------

  const getNextBookingId = async (productCode) => {

    const productRef = doc(
      db,
      `products/${userData.branchCode}/products`,
      productCode
    );

    const bookingsRef = collection(productRef, "bookings");

    const snapshot = await getDocs(bookingsRef);

    let maxId = 0;

    snapshot.forEach(doc => {

      const data = doc.data();

      if (data.bookingId > maxId) {

        maxId = data.bookingId;

      }

    });

    return maxId + 1;

  };


  // ---------------- ADD PRODUCT ----------------
const previewPaymentChanges = async () => {

  try {

    const paymentRef = doc(
      db,
      `products/${userData.branchCode}/payments`,
      receiptNumber
    );

    const paymentSnap = await getDoc(paymentRef);

    if (!paymentSnap.exists()) return;

    const paymentData = paymentSnap.data();

    let newRent = paymentData.finalRent || 0;
    let newDeposit = paymentData.finalDeposit || 0;

    let addedRent = 0;
    let addedDeposit = 0;

    products.forEach(product => {

      const rentValue = product.price * product.quantity;
      const depositValue = product.deposit * product.quantity;

      newRent += rentValue;
      newDeposit += depositValue;

      addedRent += rentValue;
      addedDeposit += depositValue;

    });

    const newTotal = newRent + newDeposit;
    const amountPaid = paymentData.amountPaid || 0;
    const newBalance = newTotal - amountPaid;

    setPaymentPreview({
      oldRent: paymentData.finalRent,
      oldDeposit: paymentData.finalDeposit,
      oldTotal: paymentData.totalAmount,
      addedRent,
      addedDeposit,
      newRent,
      newDeposit,
      newTotal,
      newBalance
    });

    setShowConfirmModal(true);

  } catch (error) {
    console.error(error);
  }

};

const handleAddProduct = async () => {

  for (const product of products) {

    if (product.errorMessage || product.availableQuantity === null) {
      toast.error("Please check availability first");
      return;
    }

  }

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

    let newRent = paymentData.finalRent || 0;
let newDeposit = paymentData.finalDeposit || 0;

let addedRent = 0;
let addedDeposit = 0;

    for (const product of products) {

      const productRef = doc(
        db,
        `products/${userData.branchCode}/products`,
        product.productCode
      );

      const bookingRef = collection(productRef, "bookings");

      const bookingId = await getNextBookingId(product.productCode);

      await addDoc(bookingRef, {

        bookingId,

        receiptNumber,
        branchCode: userData.branchCode,

        productCode: product.productCode,
        productId: product.productCode,

        pickupDate: new Date(product.pickupDate),
        returnDate: new Date(product.returnDate),

        quantity: Number(product.quantity),

        price: product.price,
        deposit: product.deposit,

        priceType: product.priceType || "daily",
        minimumRentalPeriod: product.minimumRentalPeriod || 1,
        extraRent: product.extraRent || 0,

        totalCost: product.price * product.quantity,

        createdAt: serverTimestamp(),

        appliedCredit: paymentData.appliedCredit || 0,

        userDetails: {
          name: paymentData.clientName || "",
          contact: paymentData.contact || "",
          email: paymentData.email || "",
          stage: paymentData.bookingStage || "Booking"
        }

      });

     const rentValue = product.price * product.quantity;
const depositValue = product.deposit * product.quantity;

newRent += rentValue;
newDeposit += depositValue;

addedRent += rentValue;
addedDeposit += depositValue;

    }

    const total = newRent + newDeposit;
    const newBalance = total - (paymentData.amountPaid || 0);

    const existingSummary = [...(paymentData.productsSummary || [])];

products.forEach(p => {

  const existingProduct = existingSummary.find(
    item => item.productCode === p.productCode
  );

  if (existingProduct) {

    existingProduct.quantity += Number(p.quantity);

  } else {

    existingSummary.push({
      productCode: p.productCode,
      productName: p.productName || "",
      quantity: Number(p.quantity),
      rent: Number(p.price),
      deposit: Number(p.deposit)
    });

  }

});

const updatedProductsSummary = existingSummary;
    const amountPaid = paymentData.amountPaid || 0;

// distribute payment to rent first
const rentCollected = Math.min(amountPaid, newRent);
const rentPending = newRent - rentCollected;

// remaining goes to deposit
const depositCollected = Math.max(0, amountPaid - newRent);
const depositPending = Math.max(newDeposit - depositCollected, 0);

// calculate deposit with you
const depositReturned = paymentData.depositReturned || 0;

const depositWithYou = Math.max(
  depositCollected - depositReturned,
  0
);
const newGrandTotalRent =
  (paymentData.grandTotalRent || 0) + addedRent;

const newGrandTotalDeposit =
  (paymentData.grandTotalDeposit || 0) + addedDeposit;

   await updateDoc(paymentRef, {
  finalRent: newRent,
  finalDeposit: newDeposit,

  grandTotalRent: newGrandTotalRent,
  grandTotalDeposit: newGrandTotalDeposit,

  totalAmount: total,
  balance: newBalance,

  rentCollected,
  rentPending,
  depositCollected,
  depositPending,
  depositWithYou,

  productsSummary: updatedProductsSummary
});

    const updatedUserDetails = {

      name: paymentData.clientName || "",
      contact: paymentData.contact || "",
      email: paymentData.email || "",
      alternativecontactno: paymentData.alternativecontactno || "",

      identityproof: paymentData.identityproof || "",
      identitynumber: paymentData.identitynumber || "",

      source: paymentData.source || "",

      customerby: paymentData.customerBy || "",
      receiptby: paymentData.receiptBy || "",

      stage: paymentData.bookingStage || "Booking",

      alterations: paymentData.alterations || "",

      grandTotalRent: newGrandTotalRent,
grandTotalDeposit: newGrandTotalDeposit,

      discountOnRent: paymentData.discountOnRent || 0,
      discountOnDeposit: paymentData.discountOnDeposit || 0,

      finalrent: newRent,
      finaldeposite: newDeposit,

      totalamounttobepaid: total,

      amountpaid: paymentData.amountPaid || 0,
      balance: newBalance,

      paymentstatus: paymentData.paymentStatus || "",

      firstpaymentmode: paymentData.firstPaymentMode || "",
      firstpaymentdtails: paymentData.firstPaymentDetails || "",

      secondpaymentmode: paymentData.secondPaymentMode || "",
      secondpaymentdetails: paymentData.secondPaymentDetails || "",

      specialnote: paymentData.specialNote || ""

    };

    const bookingsQuery = query(
      collectionGroup(db, "bookings"),
      where("receiptNumber", "==", receiptNumber),
      where("branchCode", "==", userData.branchCode)
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    const batch = writeBatch(db);

    bookingsSnapshot.forEach((docSnap) => {

      batch.update(docSnap.ref, {
        userDetails: updatedUserDetails
      });

    });

    await batch.commit();

    toast.success("Product added successfully");

    onClose();

  } catch (error) {

    console.error(error);
    toast.error("Failed to add product");

  }

};


  // ---------------- UI ----------------

 return (

<div className="add-product-booking-modal">

  <h2 className="add-product-booking-title">Add Product</h2>

  {products.map((product, index) => (

    <div key={index} className="add-product-booking-grid">

      {/* ROW 1 */}
      <input
        className="add-product-booking-input"
        type="datetime-local"
        value={product.pickupDate}
        disabled
      />

      <input
        className="add-product-booking-input"
        type="datetime-local"
        value={product.returnDate}
        disabled
      />


      {/* ROW 2 */}
      <div className="product-code-wrapper">

<input
  className="add-product-booking-input"
  placeholder="Product Code"
  value={product.productCode}
  onChange={(e) => {

    const value = e.target.value;

    const updated = [...products];
    updated[index].productCode = value;
    updated[index].checked = false;
    updated[index].isAvailable = false;

    setProducts(updated);

    setActiveProductIndex(index);

    if (value.length > 0) {
      fetchProductSuggestions(value);
    } else {
      setProductSuggestions([]);
    }

  }}
/>

{activeProductIndex === index && productSuggestions.length > 0 && (

<div className="product-suggestion-list">

{productSuggestions.map((item, i) => (

<div
key={i}
className="product-suggestion-item"
onClick={() => {

const updated = [...products];

updated[index].productCode = item.productCode;

setProducts(updated);

fetchProductDetails(item.productCode, index);

setProductSuggestions([]);

}}
>

{item.productCode} — {item.productName}

</div>

))}

</div>

)}

</div>

      <input
        className="add-product-booking-input"
        type="number"
        placeholder="Quantity"
        value={product.quantity}
        onChange={(e) => {

          const updated = [...products];
          updated[index].quantity = e.target.value;
updated[index].checked = false;
updated[index].isAvailable = false;

          setProducts(updated);

        }}
      />


      {/* ROW 3 */}
    {/* CHECK BUTTON */}
<div className="add-product-booking-actions-row">

  {/* CHECK BUTTON ALWAYS VISIBLE */}
  <button
    className="add-product-booking-check-btn"
    onClick={() => checkAvailability(index)}
  >
    Check Availability
  </button>

  {/* ADD PRODUCT ONLY IF AVAILABLE */}
  {product.checked && product.isAvailable && (
    <button
  className="add-product-booking-add-btn"
  onClick={previewPaymentChanges}
>
  Add Product
</button>
  )}

  {/* NOT AVAILABLE MESSAGE */}
  {product.checked && !product.isAvailable && (
    <div className="product-not-available">
      Not Available
    </div>
  )}

</div>

    </div>

  ))}

  <div className="add-product-booking-footer">

    <button
      className="add-product-booking-cancel-btn"
      onClick={onClose}
    >
      Cancel
    </button>

  </div>
  {showConfirmModal && paymentPreview && (

  <div className="confirm-modal-overlay">

    <div className="confirm-modal">

      <h3>Confirm Add Product</h3>

      <div className="payment-preview">

        <p>Current Rent: ₹{paymentPreview.oldRent}</p>
        <p>Current Deposit: ₹{paymentPreview.oldDeposit}</p>
        <p>Current Total: ₹{paymentPreview.oldTotal}</p>

        <hr />

        <p>Added Rent: ₹{paymentPreview.addedRent}</p>
        <p>Added Deposit: ₹{paymentPreview.addedDeposit}</p>

        <hr />

        <p><strong>New Rent:</strong> ₹{paymentPreview.newRent}</p>
        <p><strong>New Deposit:</strong> ₹{paymentPreview.newDeposit}</p>

        <p className="new-total">
          New Total: ₹{paymentPreview.newTotal}
        </p>

        <p className="new-balance">
          New Balance: ₹{paymentPreview.newBalance}
        </p>

      </div>

      <div className="confirm-actions">

        <button
          className="confirm-add-btn"
          onClick={() => {
            setShowConfirmModal(false);
            handleAddProduct();
          }}
        >
          Confirm Add
        </button>

        <button
          className="confirm-cancel-btn"
          onClick={() => setShowConfirmModal(false)}
        >
          Cancel
        </button>

      </div>

    </div>

  </div>

)}

</div>

)

}

export default AddProductBooking;