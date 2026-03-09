import React, { useState, useEffect } from 'react';
import { db } from '../../../firebaseConfig';
import { collection, doc, addDoc, getDoc, query, getDocs, orderBy, writeBatch, where, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, listAll } from "firebase/storage";
import { Await, useNavigate } from 'react-router-dom';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import { useUser } from '../../Auth/UserContext';
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import { FaSearch, FaDownload, FaUpload, FaPlus, FaEdit, FaTrash, FaCopy } from 'react-icons/fa';
import "../Availability/Booking.css"

function Booking() {
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const [productCode, setProductCode] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isAvailabilityFormVisible, setIsAvailabilityFormVisible] = useState(true);
  const [isAvailability1FormVisible, setIsAvailability1FormVisible] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isPaymentFormVisible, setIsPaymentFormVisible] = useState(false);
  const [subUsers, setSubUsers] = useState([]);
  const [selectedSubUser, setSelectedSubUser] = useState('');
  const [availableCredit, setAvailableCredit] = useState(0);  // Add this line
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [creditNoteId, setCreditNoteId] = useState(null);
  const [visibleForm, setVisibleForm] = useState(''); // Track visible form by its id
  const [userDetails, setUserDetails] = useState({
    name: '', email: '', contact: '', alternativecontactno: '', identityproof: '', identitynumber: '', source: '', customerby: '', receiptby: '', stage: 'Booking', alterations: '', grandTotalRent: '', grandTotalDeposit: '', discountOnRent: '',
    discountOnDeposit: '', finalrent: '', finaldeposite: '', totalamounttobepaid: '', amountpaid: '', paymentstatus: '', firstpaymentmode: '', firstpaymentdtails: '', secondpaymentmode: '', secondpaymentdetails: '', specialnote: '',
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [activeProductIndex, setActiveProductIndex] = useState(null);

  const [receipt, setReceipt] = useState(null); // Store receipt details
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false); // Track if payment is confirmed
  const [productImageUrl, setProductImageUrl] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(null);
  const [deposit, setDeposit] = useState(0); // Add a state for deposit
  const [price, setPrice] = useState(0); // Add a state for price
  const [numDays, setNumDays] = useState(0);
  const [loggedInBranchCode, setLoggedInBranchCode] = useState('');
  const { userData } = useUser();
  const [discount, setDiscount] = useState(0); // State for the discount input
  // State for the updated grand total
  const [productSuggestions, setProductSuggestions] = useState([]);

  // Handle discount change
  const handleDiscountChange = (e) => {
    const discountAmount = parseFloat(e.target.value) || 0;
    setDiscount(discountAmount);
  };

  // Recalculate the discounted grand total whenever the discount or receipt changes



  // Example: After user login or fetching user data


  const getFixedTime = (date) => {
    return date.toISOString().split("T")[0] + "T01:00"; // Set default time to 3:00 PM
  };
  const getFixedTime1 = (date) => {
    return date.toISOString().split("T")[0] + "T23:00"; // Set default time to 3:00 PM
  };


  // Number of days between pickup and return


  const getInitialProducts = () => {
    const pickupDate = new Date();
    const pickupDateStr = getFixedTime(pickupDate); // today at 15:00

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 2); // add 2 days
    const returnDateStr = getFixedTime1(returnDate); // 2 days later at 14:00

    return [
      {
        pickupDate: pickupDateStr,
        returnDate: returnDateStr,
        productCode: '',
        quantity: '',
        availableQuantity: null,
        errorMessage: '',
        price: '',
        deposit: '',
        productName: '',
          bookingsLess: [],
    bookingsGreater: [],
      },
    ];
  };
  const [products, setProducts] = useState(getInitialProducts);

  const navigate = useNavigate();
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };


  const [firstProductDates, setFirstProductDates] = useState({
    pickupDate: products.pickupDate,
    returnDate: products.returnDate,
  });

  const handleProductChange = async (index, event) => {
    const { name, value } = event.target;
    const newProducts = [...products];
    newProducts[index][name] = value;

    if (name === 'productCode' && value.trim()) {
      // Fetch product suggestions from Firestore based on input
      fetchProductSuggestions(value);
    } else {
      setProductSuggestions([]); // Clear suggestions if input is empty
    }

    setProducts(newProducts);
  };

  // Fetch product suggestions based on the entered product code
  const fetchProductSuggestions = async (searchTerm) => {
    try {
      setLoggedInBranchCode(userData.branchCode);

      // Query the new Firestore structure for products under the respective branchCode
      const productsRef = collection(db, `products/${loggedInBranchCode}/products`);
      const q = query(
        productsRef,
        where('productCode', '>=', searchTerm), // Assuming you want to search for product codes starting with searchTerm
        where('productCode', '<=', searchTerm + '\uf8ff') // For prefix-based search
      );

      const querySnapshot = await getDocs(q);

      const suggestions = [];
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        if (productData.productCode && productData.productCode.includes(searchTerm)) {
          suggestions.push({
            productCode: productData.productCode,
            productName: productData.productName || 'N/A',
          });
        }
      });

      setProductSuggestions(suggestions);

      if (suggestions.length === 0) {
        console.log('No products found for the logged-in branch');
      }
    } catch (error) {
      console.error('Error fetching product suggestions:', error);
    }
  };

  // Fetch product details when a product code is entered or selected
  const fetchProductDetails = async (productCode, index) => {
    try {
      setLoggedInBranchCode(userData.branchCode);

      // Query the new Firestore structure for the product under the respective branchCode
      const productRef = doc(db, `products/${loggedInBranchCode}/products`, productCode);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        const productData = productDoc.data();
        const productBranchCode = productData.branchCode || '';

        if (productBranchCode === loggedInBranchCode) {
          const imagePath = productData.imageUrls ? productData.imageUrls[0] : null;
          const price = productData.price || 'N/A';
          const priceType = productData.priceType || 'daily';
          const deposit = productData.deposit || 'N/A';
          const totalQuantity = productData.quantity || 0;
          const minimumRentalPeriod = productData.minimumRentalPeriod || 1;
          const extraRent = productData.extraRent || 0;
          const productName = productData.productName || 'N/A';

          let imageUrl = null;
          if (imagePath) {
            const storage = getStorage();
            const imageRef = ref(storage, imagePath);
            imageUrl = await getDownloadURL(imageRef);
          } else {
            imageUrl = 'path/to/placeholder-image.jpg';
          }

          // Prevent unnecessary state updates
          setProducts((prevProducts) => {
            const newProducts = [...prevProducts];
            if (
              newProducts[index].price !== price ||
              newProducts[index].imageUrl !== imageUrl ||
              newProducts[index].deposit !== deposit
            ) {
              newProducts[index] = {
                ...newProducts[index],
                imageUrl,
                price,
                deposit,
                totalQuantity,
                priceType,
                minimumRentalPeriod,
                extraRent,
                productName,
              };
            }
            return newProducts;
          });
        } else {
          toast.error('Product does not belong to this branch.');
        }
      } else {
        console.error('Product not found in Firestore.');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  // Handle selection of a product from suggestions
  const handleSuggestionClick = (index, suggestion) => {
    const newProducts = [...products];
    newProducts[index].productCode = suggestion.productCode;
    setProducts(newProducts);
    setProductSuggestions([]); // Clear suggestions
 setActiveProductIndex(null);
    // Fetch product details for the selected product code
    fetchProductDetails(suggestion.productCode, index);
  };

  // Function to fetch product image, price, and deposit based on productCode

  const generateReceiptNumber = async (branchCode) => {
    // New path inside products/{branchCode}/branchCounters/receipt
    const receiptCounterRef = doc(db, `products/${branchCode}/branchCounters/receipt`);

    // Fetch the current receipt number counter
    const receiptCounterDoc = await getDoc(receiptCounterRef);

    let receiptNumber = 1; // Default to 1 if no counter exists

    if (receiptCounterDoc.exists()) {
      const data = receiptCounterDoc.data();
      receiptNumber = data.currentValue + 1; // Increment the counter
    }

    // Update the counter in Firestore
    await setDoc(receiptCounterRef, { currentValue: receiptNumber });

    // Format the receipt number
    return `${branchCode}-REC-${String(receiptNumber).padStart(6, '0')}`;
  };






  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
    if (name === 'contact') {
      setAvailableCredit(0);
      setAppliedCredit(0);
      setCreditNoteId(null);
      fetchCreditNote(value);
    }
  };
  const fetchCreditNote = async (contactNumber) => {
    if (userData?.branchCode && contactNumber) {
      const creditNotesRef = collection(db, `products/${userData.branchCode}/creditNotes`);
      const q = query(creditNotesRef, where('mobileNumber', '==', contactNumber), where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const creditNoteData = querySnapshot.docs[0].data();
        setAvailableCredit(creditNoteData.Balance);
        setCreditNoteId(querySnapshot.docs[0].id);
        toast.info(`Available credit: ₹${creditNoteData.Balance}`);
      } else {
        setAvailableCredit(0);
        setCreditNoteId(null);
      }
    }
  };
  const DEFAULT_RENTAL_DAYS = 2; // 🔧 change once, applies everywhere

  const handleFirstProductDateChange = (e, field, index) => {
    const newProducts = [...products];
    const value = e.target.value;

    if (field === "pickupDate") {
      const pickupDate = new Date(value);

      // 🔥 FORCE default return = pickup + DEFAULT_RENTAL_DAYS
      const returnDate = new Date(pickupDate);
      returnDate.setDate(
        returnDate.getDate() + DEFAULT_RENTAL_DAYS
      );
      returnDate.setHours(23, 0, 0, 0);

      newProducts[index].pickupDate = value;
      newProducts[index].returnDate =
        formatDateTimeLocal(returnDate);

      // Sync first product dates
      if (index === 0) {
        setFirstProductDates({
          pickupDate: value,
          returnDate: formatDateTimeLocal(returnDate),
        });
      }

      setProducts(newProducts);
      return;
    }

    if (field === "returnDate") {
      const pickupDate = new Date(newProducts[index].pickupDate);
      const selectedReturnDate = new Date(value);

      // ✅ ONLY validation: return cannot be earlier than pickup
      if (selectedReturnDate < pickupDate) {
        toast.warn("Return date cannot be earlier than pickup date.");
        return;
      }

      newProducts[index].returnDate = value;

      if (index === 0) {
        setFirstProductDates((prev) => ({
          ...prev,
          returnDate: value,
        }));
      }

      setProducts(newProducts);
      return;
    }
  };






  // Function to handle product input changes

  const checkAvailability = async (index) => {
    const { productCode, pickupDate, returnDate, quantity } = products[index];
    const pickupDateObj = new Date(pickupDate);
    const returnDateObj = new Date(returnDate);
    const bookingId = await getNextBookingId(pickupDateObj, productCode); // Replace with actual booking ID logic if needed

    console.log('Checking availability for Product Code:', productCode);
    console.log('Pickup Date:', pickupDateObj, 'Return Date:', returnDateObj);
    console.log('Booking ID:', bookingId);

    try {
      // Fetch product from the correct branch subcollection
      const productRef = doc(db, `products/${userData.branchCode}/products`, productCode); // Change here for branchCode
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        const newProducts = [...products];
        newProducts[index].errorMessage = 'Product not found.';
        setProducts(newProducts);
        toast.error('Product not found:', productCode);
        return;
      }

      const productData = productDoc.data();
      const maxAvailableQuantity = productData.quantity || 0;

      console.log('Max Available Quantity for Product:', productCode, 'is', maxAvailableQuantity);

      // Fetch the bookings for the specific product under the branch
      const bookingsRef = collection(productRef, 'bookings');
      const qLess = query(bookingsRef, where('bookingId', '<', bookingId), orderBy('bookingId', 'asc'));
      const qGreater = query(bookingsRef, where('bookingId', '>', bookingId), orderBy('bookingId', 'asc'));

      const querySnapshotLess = await getDocs(qLess);
      const querySnapshotGreater = await getDocs(qGreater);

      const bookingsLess = [];
      const bookingsGreater = [];

      querySnapshotLess.forEach((doc) => {
        const bookingData = doc.data();
        bookingsLess.push({
             bookingId: bookingData.bookingId,
    receiptNumber: bookingData.receiptNumber,
    status: bookingData.userDetails?.stage || "Booking",
    pickupDate: bookingData.pickupDate.toDate(),
    returnDate: bookingData.returnDate.toDate(),
    quantity: bookingData.quantity,
        });
      });

      querySnapshotGreater.forEach((doc) => {
        const bookingData = doc.data();
        bookingsGreater.push({
          bookingId: bookingData.bookingId,
          pickupDate: bookingData.pickupDate.toDate(),
          returnDate: bookingData.returnDate.toDate(),
          quantity: bookingData.quantity,
        });
      });

      console.log('Bookings Less (Before Current Booking):', bookingsLess);
      console.log('Bookings Greater (After Current Booking):', bookingsGreater);

      let availableQuantity = maxAvailableQuantity;
      console.log('Initial Available Quantity:', availableQuantity);

      if (bookingsLess.length > 0 && bookingsGreater.length === 0) {
        console.log('Only Bookings Less exist.');

        const overlappingBookings = bookingsLess.filter(
          (booking) => booking.returnDate.getTime() > pickupDateObj
        );

        if (overlappingBookings.length > 0) {
          const totalOverlapQuantity = overlappingBookings.reduce((sum, booking) => sum + booking.quantity, 0);
          console.log('Total Overlapping Quantity (less):', totalOverlapQuantity);
          availableQuantity -= totalOverlapQuantity;
          console.log('New Available Quantity after  Overlap:', availableQuantity);
        }
      } else if (bookingsGreater.length > 0 && bookingsLess.length === 0) {
        console.log('Only Bookings Greater exist.');

        const overlappingBookings = bookingsGreater.filter(
          (booking) => booking.pickupDate.getTime() < returnDateObj
        );

        if (overlappingBookings.length > 0) {
          const totalOverlapQuantity = overlappingBookings.reduce((sum, booking) => sum + booking.quantity, 0);
          console.log('Total Overlapping Quantity (Greater):', totalOverlapQuantity);
          availableQuantity -= totalOverlapQuantity;
          console.log('New Available Quantity after Greater Overlap:', availableQuantity);
        }
      } else if (bookingsLess.length > 0 && bookingsGreater.length > 0) {
        console.log('Both Bookings Less and Greater exist.');

        const lessOverlapBookings = bookingsLess.filter(
          (booking) => booking.returnDate.getTime() > pickupDateObj.getTime()
        );
        const greaterOverlapBookings = bookingsGreater.filter(
          (booking) => booking.pickupDate.getTime() < returnDateObj.getTime() && booking.returnDate > pickupDateObj
        );

        let totalOverlapQuantity1 = 0;
        let totalOverlapQuantity2 = 0;

        if (lessOverlapBookings.length > 0) {
          totalOverlapQuantity1 += lessOverlapBookings.reduce((sum, booking) => sum + booking.quantity, 0);
          console.log('Overlapping Booking (Less):', totalOverlapQuantity1);
        }

        if (greaterOverlapBookings.length > 0) {
          totalOverlapQuantity2 += greaterOverlapBookings.reduce((sum, booking) => sum + booking.quantity, 0);
          console.log('Total Overlapping Quantity (Greater):', totalOverlapQuantity2);
        }
        let totalOverlapQuantity3 = totalOverlapQuantity1 + totalOverlapQuantity2;

        availableQuantity -= totalOverlapQuantity3;
        console.log('New Available Quantity after Combined Overlap:', availableQuantity);
      }

      if (availableQuantity < 0) {
        availableQuantity = 0;
        console.log('Available Quantity is negative, setting to 0');
      }

      console.log('Final Available Quantity:', availableQuantity);

      const newProducts = [...products];
      newProducts[index].availableQuantity = availableQuantity;
      newProducts[index].errorMessage = ''; // Clear error message if successful
      newProducts[index].bookingsLess = bookingsLess;
newProducts[index].bookingsGreater = bookingsGreater;
      setProducts(newProducts);

    } catch (error) {
      toast.error('Error checking availability:', error);
      const newProducts = [...products];
      newProducts[index].errorMessage = 'Failed to check availability. Please try again.';
      setProducts(newProducts);
    }
  };


  const addProductForm = () => {
    if (products.length > 0) {
      const firstProduct = products[0]; // Get first product's pickup and return date
      setProducts([...products, {
        pickupDate: firstProduct.pickupDate,
        returnDate: firstProduct.returnDate,
        productCode: '',
        quantity: '',
        availableQuantity: null,
        errorMessage: '',
        productImageUrl: '',
        productName: '',
      }]);
    }
  };
  const removeProductForm = (index) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
  };



  const getNextBookingId = async (pickupDateObj, productCode) => {
    try {
      // Check if productCode is valid
      if (!productCode) {
        throw new Error('Invalid product code');
      }

      // Fetch the logged-in branchCode from user data
      const branchCode = userData.branchCode; // Assuming userData contains branchCode

      // Firestore reference to the specific product's bookings under the correct branch
      const productRef = doc(db, `products/${branchCode}/products`, productCode); // Updated reference
      const bookingsRef = collection(productRef, 'bookings');
      const q = query(bookingsRef, orderBy('pickupDate', 'asc'));

      const querySnapshot = await getDocs(q);

      const existingBookings = [];

      // Loop through the query snapshot to gather existing bookings
      querySnapshot.forEach((doc) => {
        const bookingData = doc.data();
        existingBookings.push({
          id: doc.id,
          bookingId: bookingData.bookingId,
          pickupDate: bookingData.pickupDate.toDate(),
          returnDate: bookingData.returnDate.toDate(),
          quantity: bookingData.quantity,
        });
      });

      // Calculate the next booking ID
      let newBookingId = existingBookings.length + 1;
      for (let i = 0; i < existingBookings.length; i++) {
        if (pickupDateObj.getTime() < existingBookings[i].pickupDate.getTime()) {
          newBookingId = i + 1;
          break;
        }
      }

      // Update existing bookings if necessary
      const batch = writeBatch(db);
      if (newBookingId <= existingBookings.length) {
        existingBookings.forEach((booking, index) => {
          if (index + 1 >= newBookingId) {
            const bookingDocRef = doc(bookingsRef, booking.id);
            batch.update(bookingDocRef, {
              bookingId: index + 2,
            });
          }
        });
      }

      await batch.commit();

      // Return the new booking ID for the current product
      return newBookingId;
    } catch (error) {
      toast.error('Error getting next booking ID:', error);
      setErrorMessage('Failed to get booking ID. Please try again.');
      return null;
    }
  };



  const handleBookingConfirmation = async (e) => {
    e.preventDefault();

    try {
      // 🔴 STEP 0: Reuse SAME validation logic (VERY IMPORTANT)
      const allQuantitiesAvailable = products.every(product => {
        return (
          product.availableQuantity !== null &&
          parseInt(product.quantity, 10) <= product.availableQuantity
        );
      });

      if (!allQuantitiesAvailable) {
        toast.error(
          "Entered quantities exceed available quantities for one or more products."
        );
        return; // ⛔ STOP here
      }

      let bookingDetails = [];

      for (const product of products) {
        const pickupDateObj = new Date(product.pickupDate);
        const returnDateObj = new Date(product.returnDate);
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const days = Math.ceil(
          (returnDateObj - pickupDateObj) / millisecondsPerDay
        );

        const branchCode = userData.branchCode;

        const productRef = doc(
          db,
          `products/${branchCode}/products`,
          product.productCode
        );
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
          toast.error(`Product ${product.productCode} not found`);
          return;
        }

        const productData = productDoc.data();
        const {
          price,
          deposit,
          priceType,
          minimumRentalPeriod,
          extraRent,
          productName
        } = productData;

        const calculateTotalPrice = (
          price,
          deposit,
          priceType,
          quantity,
          pickupDate,
          returnDate,
          minimumRentalPeriod,
          extraRent
        ) => {
          const millisecondsPerHour = 1000 * 60 * 60;

          let duration = 0;

          if (priceType === "hourly") {
            duration = Math.ceil(
              (returnDate - pickupDate) / millisecondsPerHour
            );
          } else if (priceType === "monthly") {
            duration = Math.ceil(
              (returnDate - pickupDate) / (millisecondsPerDay * 30)
            );
          } else {
            duration = Math.ceil(
              (returnDate - pickupDate) / millisecondsPerDay
            );
          }

          let totalPrice = price * quantity;

          if (duration > minimumRentalPeriod) {
            const extraDuration = duration - minimumRentalPeriod;
            totalPrice += extraRent * extraDuration * quantity;
          }

          const totaldeposite = deposit * quantity;

          return {
            totalPrice,
            totaldeposite,
            grandTotal: parseInt(totalPrice) + parseInt(totaldeposite)
          };
        };

        const totalCost = calculateTotalPrice(
          price,
          deposit,
          priceType,
          parseInt(product.quantity, 10),
          pickupDateObj,
          returnDateObj,
          minimumRentalPeriod,
          extraRent
        );

        await getNextBookingId(pickupDateObj, product.productCode);

        bookingDetails.push({
          productCode: product.productCode,
          productImageUrl: product.imageUrl,
          productName,
          price,
          deposit,
          quantity: product.quantity,
          numDays: days,
          totalPrice: totalCost.totalPrice,
          totaldeposite: totalCost.totaldeposite,
          grandTotal: totalCost.grandTotal
        });
      }

      // ✅ STEP 3: Create receipt FIRST
      setReceipt({
        products: bookingDetails
      });

      // ✅ STEP 4: THEN move to Review step
      setWizardStep(3);

    } catch (error) {
      console.error(error);
      toast.error("An error occurred while confirming your booking.");
    }
  };



  const handleConfirmPayment = async () => {
    setIsButtonDisabled(true);
    try {

      // Generate receipt number
      const receiptNumber = await generateReceiptNumber(userData.branchCode);
      setReceiptNumber(receiptNumber);

      // Check availability of stock for all products
      const allQuantitiesAvailable = await Promise.all(
        products.map(async (product) => {
          const branchCode = userData.branchCode;
          const productRef = doc(db, `products/${branchCode}/products`, product.productCode); // Updated path
          const productDoc = await getDoc(productRef);

          if (!productDoc.exists()) {
            product.errorMessage = 'Product not found.';
            toast.warn(`Product not found for code: ${product.productCode}`);
            return false; // Skip this product if not found
          }

          const productData = productDoc.data();
          const availableQuantity = parseInt(product.availableQuantity || 0, 10); // Ensure integer conversion
          const requestedQuantity = parseInt(product.quantity, 10); // Ensure integer conversion for requested quantity

          // Log the values to ensure they are correct
          console.log(`Product Code: ${product.productCode}`);
          console.log(`Available Quantity: ${availableQuantity}`);
          console.log(`Requested Quantity: ${requestedQuantity}`);

          // Check if the requested quantity is within the available stock
          if (requestedQuantity > availableQuantity) {
            toast.warning(`Not enough stock for product: ${product.productCode}`);
            product.errorMessage = 'Insufficient stock for this product.';
            return false; // Return false if not enough stock
          }

          return true; // Return true if sufficient stock
        })
      );

      // Check if all products have sufficient stock
      const allAvailable = allQuantitiesAvailable.every((isAvailable) => isAvailable);
      if (!allAvailable) {
        toast.warn('One or more products do not have enough stock. Please adjust the quantity.');
        return; // Exit the function without proceeding with booking
      }

      // Process each product for booking
      for (const product of products) {
        const pickupDateObj = new Date(product.pickupDate);
        const returnDateObj = new Date(product.returnDate);

        const branchCode = userData.branchCode;
        const productRef = doc(db, `products/${branchCode}/products`, product.productCode); // Updated path
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
          product.errorMessage = 'Product not found.';
          continue; // Skip this product if not found
        }

        const productData = productDoc.data();
        const { price, deposit, priceType, minimumRentalPeriod, extraRent } = productData;

        // Calculate the total price
        const calculateTotalPrice = (price, deposit, priceType, quantity, pickupDate, returnDate, minimumRentalPeriod, extraRent) => {
          const pickupDateObj = new Date(pickupDate);
          const returnDateObj = new Date(returnDate);
          const millisecondsPerDay = 1000 * 60 * 60 * 24;
          const millisecondsPerHour = 1000 * 60 * 60;

          let duration = 0;

          // Determine the duration based on priceType
          if (priceType === 'hourly') {
            duration = Math.ceil((returnDateObj - pickupDateObj) / millisecondsPerHour); // Hours difference
          } else if (priceType === 'monthly') {
            duration = Math.ceil((returnDateObj - pickupDateObj) / (millisecondsPerDay * 30)); // Months difference
          } else {
            duration = Math.ceil((returnDateObj - pickupDateObj) / millisecondsPerDay); // Days difference
          }

          let totalPrice = 0;
          let extraDuration = duration - minimumRentalPeriod;

          if (duration <= minimumRentalPeriod) {
            // If the total duration is less than or equal to the minimum rental period
            totalPrice = price * quantity;
          } else {
            // Apply base price for minimum rental period
            totalPrice = price * quantity;

            // Apply extra rent for the remaining duration beyond the minimum rental period
            totalPrice += extraRent * extraDuration * quantity;
          }

          let totaldeposite = deposit * quantity;
          console.log("Price Type: ", priceType);
          console.log("Duration: ", duration);
          console.log("Extra Days/Hours: ", extraDuration);
          console.log("Price per unit: ", price);
          console.log("Extra Price per additional duration: ", extraRent);
          console.log("Calculated Total Price: ", totalPrice);

          return {
            totalPrice,
            deposit,
            totaldeposite,
            grandTotal: `${parseInt(totalPrice) + parseInt(totaldeposite)}`,
          };
        };

        const totalCost = calculateTotalPrice(
          price,
          deposit,
          priceType,
          product.quantity,
          pickupDateObj,
          returnDateObj,
          minimumRentalPeriod,
          extraRent,
        );

        const newBookingId = await getNextBookingId(pickupDateObj, product.productCode);
        const createdAt = new Date();

        // Add booking to Firestore under the specific branch and product
        await addDoc(collection(productRef, 'bookings'), {
          bookingId: newBookingId,
          receiptNumber,
          pickupDate: pickupDateObj,
          returnDate: returnDateObj,
          quantity: parseInt(product.quantity, 10),
          userDetails, // Assuming userDetails is the same for all products
          price, // Save price
          deposit,
          priceType,
          minimumRentalPeriod,
          extraRent,
          totalCost: totalCost.totalPrice,
          createdAt, // Save creation timestamp
          appliedCredit: appliedCredit,
        });
      }

      // ... within your function
      if (creditNoteId && appliedCredit > 0) {
        const creditNoteRef = doc(db, `products/${userData.branchCode}/creditNotes`, creditNoteId);
        const creditNoteSnap = await getDoc(creditNoteRef);
        if (creditNoteSnap.exists()) {
          const currentCredit = creditNoteSnap.data().Balance || 0;
          const totalcredit = creditNoteSnap.data().amount || 0;
          const remainingCredit = currentCredit - appliedCredit;
          const creditUsed = totalcredit - remainingCredit;

          await updateDoc(creditNoteRef, {
            Balance: remainingCredit,
            CreditUsed: creditUsed,
            status: remainingCredit > 0 ? 'active' : 'used',
            usedReceipts: arrayUnion(receiptNumber),
          });

          toast.success('Credit note updated.');
        } else {
          toast.error('Error updating credit note: Credit note not found.');
        }
      }


      // Set payment confirmation state and redirect
      setIsPaymentConfirmed(true);
      toast.success(`Bill Created Successfully. Your Receipt Number is: ${receiptNumber}`);
      setTimeout(() => navigate('/usersidebar/clients'), 6000); // 6 seconds delay before navigation

    } catch (error) {
      toast.error('Error confirming payment:', error);
      setErrorMessage(error.message);
    }
    finally {
      // Re-enable the button after 10 seconds
      setTimeout(() => setIsButtonDisabled(false), 10000);
    }
  };




  const handleApplyCredit = () => {
    const finalRent = Number(userDetails.finalrent) || 0;

    if (availableCredit > 0 && finalRent > 0) {
      const creditToApply = Math.min(availableCredit, finalRent);
      const updatedFinalRent = finalRent - creditToApply;
      const totalAmount = updatedFinalRent + Number(userDetails.finaldeposite || 0);
      const balance = totalAmount - Number(userDetails.amountpaid || 0);

      setAppliedCredit(creditToApply);

      setUserDetails((prev) => ({
        ...prev,
        finalrent: updatedFinalRent,
        creditNoteAmountAppliedToRent: creditToApply,
        totalamounttobepaid: totalAmount,
        balance,
      }));

      toast.success(`Applied credit of ₹${creditToApply}`);
    } else {
      toast.info('No credit available to apply.');
    }
  };




  const toggleAvailabilityForm = () => {
    setIsAvailabilityFormVisible(!isAvailabilityFormVisible);
  };

  const toggleAvailability1Form = (fromWizard = false) => {
    const allQuantitiesAvailable = products.every(product => {
      return parseInt(product.quantity, 10) <= (product.availableQuantity || 0);
    });

    if (!allQuantitiesAvailable) {
      toast.error(
        'Entered quantities exceed available quantities for one or more products.'
      );
      return false;
    }

    if (fromWizard) {
      setWizardStep(2); // 👉 wizard navigation
    } else {
      setIsAvailability1FormVisible(!isAvailability1FormVisible);
    }

    return true;
  };


  // const handleDeleteProduct = (index) => {
  //   // Create a copy of the products array without the product at the specified index
  //   const updatedProducts = receipt.products.filter((_, productIndex) => productIndex !== index);

  //   // Update the receipt object with the new product list
  //   setReceipt((prevReceipt) => ({
  //     ...prevReceipt,
  //     products: updatedProducts,
  //   }));

  //   // Optionally, update the total price and other related calculations here
  // };

  const handleDeleteProduct = (productCode) => {
    // Update products state by filtering out the deleted product
    setProducts((prevProducts) =>
      prevProducts.filter((product) => product.productCode !== productCode)
    );

    // Update receipt state if you have a separate receipt state
    setReceipt((prevReceipt) => ({
      ...prevReceipt,
      products: prevReceipt.products.filter((product) => product.productCode !== productCode)
    }));
  };
  const calculateGrandTotalRent = () => {
    return receipt.products.reduce((total, product) => total + product.totalPrice, 0);
  };
  useEffect(() => {
    if (receipt && receipt.products) {
      const grandTotalRent = calculateGrandTotalRent();
      setUserDetails(prevDetails => ({
        ...prevDetails,
        grandTotalRent
      }));
    }
  }, [receipt]);
  const calculateGrandTotalDeposite = () => {
    return receipt.products.reduce((total, product) => total + product.totaldeposite, 0);
  };
  useEffect(() => {
    if (receipt && receipt.products) {
      const grandTotalDeposit = calculateGrandTotalDeposite();
      setUserDetails(prevDetails => ({
        ...prevDetails,
        grandTotalDeposit
      }));
    }
  }, [receipt]);


  // Calculate final rent, deposit, and amount to be paid
  useEffect(() => {

    const finalrent = userDetails.grandTotalRent - (userDetails.discountOnRent || 0) - (appliedCredit || 0);
    const finaldeposite = userDetails.grandTotalDeposit - (userDetails.discountOnDeposit || 0);
    const totalamounttobepaid = finalrent + finaldeposite;
    const balance = totalamounttobepaid - (userDetails.amountpaid || 0);

    setUserDetails(prevDetails => ({
      ...prevDetails,
      finalrent,
      finaldeposite,
      totalamounttobepaid,
      balance,
    }));
  }, [userDetails.grandTotalRent, userDetails.discountOnRent, userDetails.grandTotalDeposit, userDetails.discountOnDeposit, userDetails.amountpaid]);





  useEffect(() => {
    const fetchSubUsers = async () => {
      if (!userData.branchCode) return;

      try {
        const subUsersRef = collection(db, `products/${userData.branchCode}/subusers`);
        const querySnapshot = await getDocs(subUsersRef);

        const subUsersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSubUsers(subUsersData); // Assuming you have a state called subUsers
      } catch (error) {
        console.error('Error fetching sub-users:', error);
      }
    };

    fetchSubUsers();
  }, [userData.branchCode]);

  const calculateFinalPrice = () => {
    return userDetails.finalrent - appliedCredit;
  };
  // Handle the selection of a sub-user

  const formatDateTimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };




  return (
    <div className="booking-container1">
      <UserHeader onMenuClick={toggleSidebar} />

      <div className="issidebar">
        <UserSidebar isOpen={isSidebarOpen} />
        <div className="wizard-wrapper">
          {/* ===== WIZARD HEADER ===== */}
          <div className="wizard-header">
            <div className={`wizard-step ${wizardStep === 1 ? "active" : ""}`}>
              1. Products
            </div>
            <div className={`wizard-step ${wizardStep === 2 ? "active" : ""}`}>
              2. Customer
            </div>
            <div className={`wizard-step ${wizardStep === 3 ? "active" : ""}`}>
              3. Review
            </div>
            <div className={`wizard-step ${wizardStep === 4 ? "active" : ""}`}>
              4. Payment
            </div>
          </div>

          {/* ===== STEP 1 : PRODUCTS ===== */}
          {wizardStep === 1 && (
            <section className="wizard-card">

              {/* HEADER */}
              <div className="wizard-title">
                <h2>Check Product Availability</h2>
                <p>Add products and verify availability before proceeding</p>
              </div>

              {/* PRODUCT CARDS */}
              {products.map((product, index) => (
                <div key={index} className="product-check premium-card">

                  <div className="product-card-grid">

                    {/* LEFT FORM */}
                    <div className="product-form-section">

                      {/* Dates */}
                      <div className="two-col">
                        <div className="form-group1">
                          <label>Pickup Date</label>
                          <input
                            type="datetime-local"
                            name="pickupDate"
                            value={product.pickupDate}
                            onChange={(e) =>
                              handleFirstProductDateChange(e, "pickupDate", index)
                            }
                             min={new Date().toISOString().slice(0, 16)}
                            disabled={index > 0}
                            required
                          />
                        </div>

                        <div className="form-group1">
                          <label>Return Date</label>
                          <input
                            type="datetime-local"
                            name="returnDate"
                            value={product.returnDate}
                            onChange={(e) =>
                              handleFirstProductDateChange(e, "returnDate", index)
                            }
                             min={new Date().toISOString().slice(0, 16)}
                            disabled={index > 0}
                            required
                          />
                        </div>
                      </div>

                      {/* Product Code */}
                      <div className="form-group1">
                        <label>Product Code</label>

                        <input
                          type="text"
                          name="productCode"
                          value={product.productCode}
                          onChange={(e) => {
                            setActiveProductIndex(index);
                            handleProductChange(index, e);
                          }}
                          required
                        />


                        {activeProductIndex === index && productSuggestions.length > 0 && (

                          <ul className="suggestions-dropdown">
                            {productSuggestions.map((suggestion, idx) => (
                              <li
                                key={idx}
                                onClick={() => handleSuggestionClick(index, suggestion)}
                              >
                                <strong>{suggestion.productCode}</strong> — {suggestion.productName}
                              </li>

                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Quantity & Name */}
                      <div className="two-col">
                        <div className="form-group1">
                          <label>Quantity</label>
                          <input
                            type="text"
                            name="quantity"
                            value={product.quantity}
                            onChange={(e) => handleProductChange(index, e)}
                            required
                          />
                        </div>

                        <div className="form-group1 span-full">
                          <label>Product Name</label>
                          <input value={product.productName} readOnly />
                        </div>
                      </div>

                      {/* Rent & Deposit */}
                      <div className="two-col">
                        <div className="form-group1">
                          <label>Rent</label>
                          <input value={product.price} readOnly />
                        </div>

                        <div className="form-group1">
                          <label>Deposit</label>
                          <input value={product.deposit} readOnly />
                        </div>
                      </div>

                      {/* Availability Info */}
                      <div className="info-row">
  <span>Total Quantity: {product.totalQuantity}</span>

  {product.errorMessage ? (
    <span className="error-text">{product.errorMessage}</span>
  ) : (
    product.availableQuantity !== null && (
      <span
        className={
          product.availableQuantity > 0
            ? "availability available"
            : "availability unavailable"
        }
      >
        Available: {product.availableQuantity}
      </span>
    )
  )}
</div>
{(product.bookingsLess?.length > 0 || product.bookingsGreater?.length > 0) && (
  <div className="existing-bookings">

    <h4>Existing Bookings</h4>

    {[...(product.bookingsLess || []), ...(product.bookingsGreater || [])].map((booking, i) => {

      const status = booking.status?.toLowerCase() || "booking";

      return (
        <div key={i} className="booking-item">

          {/* Receipt Number */}
         <span
  className="booking-receipt clickable-receipt"
  onClick={() => navigate(`/booking-details/${booking.receiptNumber}`)}
>
  <strong>{booking.receiptNumber}</strong>
</span>

          {/* Status */}
          <span className={`status-badge status-${status}`}>
            {status}
          </span>

          {/* Quantity */}
          <span className="booking-qty">
            Qty: {booking.quantity}
          </span>

          {/* Date */}
          <span className="booking-date">
            {booking.pickupDate.toLocaleDateString()} → {booking.returnDate.toLocaleDateString()}
          </span>

        </div>
      );

    })}

  </div>
)}

                      

                      {/* Actions */}
                      <div className="card-actions">
                        <button
                          type="button"
                          className="checkavailability"
                          onClick={() => checkAvailability(index)}
                        >
                          Check Availability
                        </button>

                        {products.length > 1 && index > 0 && (
                          <FaTrash
                            className="cancel-button"
                            onClick={() => removeProductForm(index)}
                          />
                        )}
                      </div>
                    </div>

                    {/* RIGHT IMAGE */}
                    <div className="product-image-section">
                      {product.imageUrl ? (
                        <div className="product-image-frame">
                          <img
                            src={product.imageUrl}
                            alt={product.productName || "Product"}
                            className="product-image1"
                          />
                        </div>
                      ) : (
                        <div className="product-image-placeholder">
                          No Image
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}

              {/* FOOTER */}
              <div className="wizard-footer">
                <button
                  className="secondary-btn"
                  onClick={addProductForm}
                >
                  + Add New Product
                </button>

                <button
                  className="primary-btn"
                  onClick={() => toggleAvailability1Form(true)}
                >
                  Continue →
                </button>

              </div>

            </section>
          )}




          {/* ===== STEP 2 : CUSTOMER ===== */}
          {wizardStep === 2 && (
            <section className="wizard-card">

              {/* TITLE */}
              <div className="wizard-title">
                <h2>Customer Details</h2>
                <p>Enter customer information to proceed</p>
              </div>

              <form onSubmit={handleBookingConfirmation}>
                <div className="customer-details-form premium-card">

                  {/* Name & Email */}
                  <div className="two-col">
                    <div className="form-group1">
                      <label>Name</label>
                      <input
                        type="text"
                        value={userDetails.name}
                        onChange={(e) =>
                          setUserDetails({ ...userDetails, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-group1">
                      <label>Email ID</label>
                      <input
                        type="email"
                        value={userDetails.email}
                        onChange={(e) =>
                          setUserDetails({ ...userDetails, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Contact Numbers */}
                  <div className="two-col">
                    <div className="form-group1">
                      <label>Contact Number</label>
                      <input
                        type="text"
                        name="contact"
                        value={userDetails.contact}
                        onChange={handleInputChange}
                        placeholder="Enter 10-digit mobile number"
                        inputMode="numeric"
                        maxLength={10}
                        required
                      />

                      {availableCredit > 0 && (
                        <div className="credit-info">
                          Available Credit: ₹{availableCredit.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="form-group1">
                      <label>Alternative Phone Number</label>
                      <input
                        type="text"
                        value={userDetails.alternativecontactno}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            alternativecontactno: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Identity */}
                  <div className="two-col">
                    <div className="form-group1">
                      <label>Identity Proof</label>
                      <select
                        value={userDetails.identityproof}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            identityproof: e.target.value
                          })
                        }
                      >
                        <option value="" disabled>Select identity proof</option>
                        <option value="aadharcard">Aadhaar Card</option>
                        <option value="pancard">Pan Card</option>
                        <option value="drivinglicence">Driving Licence</option>
                        <option value="passport">Passport</option>
                        <option value="college/officeid">College / Office ID</option>
                      </select>
                    </div>

                    <div className="form-group1">
                      <label>Identity Proof Number</label>
                      <input
                        type="text"
                        value={userDetails.identitynumber}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            identitynumber: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Source */}
                  <div className="form-group1">
                    <label>Source</label>
                    <select
                      value={userDetails.source}
                      onChange={(e) =>
                        setUserDetails({ ...userDetails, source: e.target.value })
                      }
                    >
                      <option value="" disabled>Select the source</option>
                      <option value="google">Google</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="friendsandfamily">Friends And Family</option>
                      <option value="repeatcustomer">Repeat Customer</option>
                      <option value="referal">Referral</option>
                      <option value="walkin">Walk-In</option>
                    </select>
                  </div>

                  {/* Staff */}
                  <div className="two-col">
                    <div className="form-group1">
                      <label>Customer By</label>
                      <select
                        value={userDetails.customerby}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            customerby: e.target.value
                          })
                        }
                        required
                      >
                        <option value="" disabled>Select customer by</option>
                        <option value="manager">Manager</option>
                        {subUsers.map((subuser) => (
                          <option key={subuser.id} value={subuser.name}>
                            {subuser.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group1">
                      <label>Receipt By</label>
                      <select
                        value={userDetails.receiptby}
                        onChange={(e) =>
                          setUserDetails({
                            ...userDetails,
                            receiptby: e.target.value
                          })
                        }
                        required
                      >
                        <option value="" disabled>Select receipt by</option>
                        <option value="manager">Manager</option>
                        {subUsers.map((subuser) => (
                          <option key={subuser.id} value={subuser.name}>
                            {subuser.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stage */}
                  <div className="form-group1">
                    <label>Stage</label>
                    <select
                      value={userDetails.stage}
                      onChange={(e) =>
                        setUserDetails({ ...userDetails, stage: e.target.value })
                      }
                      required
                    >
                      <option value="Booking">Booking</option>
                      <option value="pickup">Pickup</option>
                    </select>
                  </div>

                  {/* FOOTER */}
                  <div className="wizard-footer">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setWizardStep(1)}
                    >
                      ← Back
                    </button>

                    <button
                      type="submit"
                      className="primary-btn"
                    >
                      Continue →
                    </button>

                  </div>

                </div>
              </form>

            </section>
          )}



          {/* ===== STEP 3 : REVIEW ===== */}
          {wizardStep === 3 && receipt && (
            <section className="wizard-card receipt-card">

              {/* TITLE */}
              <div className="wizard-title">
                <h2>Review & Confirm Products</h2>
                {receiptNumber && (
                  <p className="muted">Receipt No: {receiptNumber}</p>
                )}
              </div>

              <div className="receipt-container premium-card">

                {/* TABLE HEADER */}
                <div className="receipt-table-header">
                  <span>Image</span>
                  <span>Name</span>
                  <span>Code</span>
                  <span>Qty</span>
                  <span>Rent</span>
                  <span>Deposit</span>
                  <span>Total</span>
                  <span>Deposit Total</span>
                  <span></span>
                </div>

                {/* PRODUCTS */}
                {receipt.products.map((product, index) => (
                  <div key={index} className="receipt-table-row">
                    <span>
                      {product.productImageUrl && (
                        <img src={product.productImageUrl} alt="Product" />
                      )}
                    </span>
                    <span>{product.productName}</span>
                    <span>{product.productCode}</span>
                    <span>{product.quantity}</span>
                    <span>₹{product.price}</span>
                    <span>₹{product.deposit}</span>
                    <span>₹{product.totalPrice}</span>
                    <span>₹{product.totaldeposite}</span>
                    <span>
                      <FaTrash
                        onClick={() =>
                          handleDeleteProduct(product.productCode)
                        }
                        className="delete-icon"
                      />
                    </span>
                  </div>
                ))}

                {/* ALTERATIONS */}
                <div className="alterations-box">
                  <label>Alterations / Notes</label>
                  <input
                    type="text"
                    value={userDetails.alterations}
                    onChange={(e) =>
                      setUserDetails({
                        ...userDetails,
                        alterations: e.target.value
                      })
                    }
                    placeholder="Any changes or special notes"
                  />
                </div>

                {/* FOOTER */}
                <div className="wizard-footer">
                  <button
                    className="secondary-btn"
                    onClick={() => setWizardStep(2)}
                  >
                    ← Back
                  </button>

                  <button
                    className="primary-btn"
                    onClick={() => setWizardStep(4)}
                  >
                    Proceed to Payment →
                  </button>
                </div>

              </div>
            </section>
          )}
          {/* ===== STEP 4 : PAYMENT ===== */}
          {wizardStep === 4 && (
            <section className="wizard-card">

              {/* TITLE */}
              <div className="wizard-title">
                <h2>Payment Details</h2>
                <p className="muted">Finalize the transaction</p>
              </div>

              <div className="payment-card premium-card">

                {/* ================= TOTALS ================= */}
                <div className="four-col">
                  <div className="payment-box">
                    <label>Grand Total Rent</label>
                    <input value={userDetails.grandTotalRent} readOnly />
                  </div>

                  <div className="payment-box">
                    <label>Grand Total Deposit</label>
                    <input value={userDetails.grandTotalDeposit} readOnly />
                  </div>

                  <div className="payment-box highlight">
                    <label>Final Rent</label>
                    <input value={userDetails.finalrent} readOnly />
                  </div>

                  <div className="payment-box highlight">
                    <label>Final Deposit</label>
                    <input value={userDetails.finaldeposite} readOnly />
                  </div>
                </div>

                {/* ================= DISCOUNTS ================= */}
                <div className="two-col">
                  <div className="payment-box discount">
                    <label>Discount on Rent</label>
                    <input
                      value={userDetails.discountOnRent}
                      onChange={(e) =>
                        setUserDetails({ ...userDetails, discountOnRent: e.target.value })
                      }
                    />
                  </div>

                  <div className="payment-box discount">
                    <label>Discount on Deposit</label>
                    <input
                      value={userDetails.discountOnDeposit}
                      onChange={(e) =>
                        setUserDetails({ ...userDetails, discountOnDeposit: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* ================= CREDIT ================= */}
                <div className="two-col">
                  <div className="payment-box">
                    <label>Available Credit</label>
                    <input
                      value={availableCredit > 0 ? `₹${availableCredit.toFixed(2)}` : "—"}
                      readOnly
                    />
                  </div>

                  <div className="payment-box">
                    <label>Applied Credit</label>
                    <input
                      value={appliedCredit > 0 ? `₹${appliedCredit.toFixed(2)}` : "—"}
                      readOnly
                    />
                    {appliedCredit === 0 && availableCredit > 0 && (
                      <button
                        type="button"
                        className="apply-credit-button"
                        onClick={handleApplyCredit}
                      >
                        Apply Credit
                      </button>
                    )}
                  </div>
                </div>

                {/* ================= PAYABLE ================= */}
                <div className="three-col">
                  <div className="payment-box">
                    <label>Total Amount to be Paid</label>
                    <input value={userDetails.totalamounttobepaid} />
                  </div>

                  <div className="payment-box success">
                    <label>Amount Paid / Advance</label>
                    <input
                      value={userDetails.amountpaid}
                      onChange={(e) =>
                        setUserDetails({ ...userDetails, amountpaid: e.target.value })
                      }
                    />
                  </div>

                  <div className="payment-box">
                    <label>Balance</label>
                    <input value={userDetails.balance} readOnly />
                  </div>
                </div>

                {/* ================= PAYMENT STATUS ================= */}
                <div className="payment-box">
                  <label>Payment Status</label>
                  <select
                    value={userDetails.paymentstatus}
                    onChange={(e) =>
                      setUserDetails({ ...userDetails, paymentstatus: e.target.value })
                    }
                  >
                    <option value="fullpayment">Full Payment</option>
                    <option value="depositpending">Deposit Pending</option>
                    <option value="partialpayment">Partial Payment</option>
                  </select>
                </div>

                {/* ================= PAYMENT MODES ================= */}
                <div className="two-col">
                  <div className="payment-box">
                    <label>1st Payment Mode</label>
                    <select
                      value={userDetails.firstpaymentmode}
                      onChange={(e) =>
                        setUserDetails({ ...userDetails, firstpaymentmode: e.target.value })
                      }
                    >
                      <option value="">Select Mode</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div className="payment-box">
                    <label>1st Payment Details</label>
                    <input
                      value={userDetails.firstpaymentdtails}
                      onChange={(e) =>
                        setUserDetails({
                          ...userDetails,
                          firstpaymentdtails: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="payment-box">
                    <label>2nd Payment Mode (if any)</label>
                    <select
                      value={userDetails.secondpaymentmode}
                      onChange={(e) =>
                        setUserDetails({
                          ...userDetails,
                          secondpaymentmode: e.target.value
                        })
                      }
                    >
                      <option value="">Select Mode</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div className="payment-box">
                    <label>2nd Payment Details</label>
                    <input
                      value={userDetails.secondpaymentdetails}
                      onChange={(e) =>
                        setUserDetails({
                          ...userDetails,
                          secondpaymentdetails: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                {/* ================= SPECIAL NOTE ================= */}
                <div className="payment-box">
                  <label>Special Note / Follow-up Comment</label>
                  <input
                    value={userDetails.specialnote}
                    onChange={(e) =>
                      setUserDetails({ ...userDetails, specialnote: e.target.value })
                    }
                  />
                </div>

                {/* ================= FINAL ACTION ================= */}
                <div className="wizard-footer">
                  <button
                    className="secondary-btn"
                    onClick={() => setWizardStep(3)}
                  >
                    ← Back
                  </button>

                  <button
                    className="primary-btn success"
                    onClick={handleConfirmPayment}
                    disabled={isButtonDisabled}
                  >
                    {isButtonDisabled ? "Processing..." : "Confirm Payment"}
                  </button>
                </div>

              </div>
            </section>
          )}




        </div>
        <ToastContainer />
      </div>
    </div>
  );
}

export default Booking;