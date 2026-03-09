import React, { useState, useEffect } from 'react';
import { collection,collectionGroup, getDocs, query, where, orderBy, updateDoc, doc, getDoc, setDoc, writeBatch, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import { useUser } from '../../Auth/UserContext';
import search from '../../../assets/Search.png';
import { FaSearch, FaDownload, FaUpload, FaPlus, FaEdit, FaTrash, FaCopy, FaWhatsapp } from 'react-icons/fa';
import Papa from 'papaparse';
import './Availability.css'; // Create CSS for styling
import { format } from 'date-fns';
import { Label } from 'recharts';
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import { serverTimestamp } from "firebase/firestore";
import { useSearchParams } from 'react-router-dom';


// ================= FIELD SCHEMA (FROM EXPORT) =================
const EXPORT_FIELDS = [
  "bookingId",
  "receiptNumber",
  "clientname",
  "contactNo",
  "email",
  "pickupDate",
  "returnDate",
  "createdAt",
  "stage",
  "products",
  "IdentityProof",
  "IdentityNumber",
  "Source",
  "CustomerBy",
  "ReceiptBy",
  "Alterations",
  "SpecialNote",
  "GrandTotalRent",
  "DiscountOnRent",
  "FinalRent",
  "GrandTotalDeposit",
  "DiscountOnDeposit",
  "FinalDeposit",
  "AmountToBePaid",
  "AmountPaid",
  "Balance",
  "PaymentStatus",
  "FirstPaymentDetails",
  "FirstPaymentMode",
  "SecondPaymentMode",
  "SecondPaymentDetails",
];
// Fields already shown in booking card rows
const PRIMARY_FIELDS = [
  "receiptNumber",
  "clientname",
  "contactNo",
  "email",
  "products",
  "pickupDate",
  "returnDate",
  "stage",
];
const DEFAULT_HIDDEN_FIELDS = [
  "IdentityProof",
  "IdentityNumber",
  "SpecialNote",
  "Alterations",
  "FirstPaymentDetails",
  "SecondPaymentDetails",
];
const SEARCHABLE_FIELDS = {
  receiptNumber: "Receipt No",
  clientname: "Client Name",
  contactNo: "Contact",
  email: "Email",
  bookingcreation: "Booking Date",
  pickupDate: "Pickup Date",
  returnDate: "Return Date",
  stage: "Stage",
  IdentityProof: "Identity Proof",
  IdentityNumber: "Identity Number",
  Source: "Source",
  CustomerBy: "Customer By",
  ReceiptBy: "Receipt By",
};


// ================= FLATTENER =================
const flattenBooking = (booking) => ({
  bookingId: booking.bookingId,
  receiptNumber: booking.receiptNumber,
  clientname: booking.clientname,
  contactNo: booking.contactNo,
  email: booking.email,
  pickupDate: booking.pickupDate
    ? booking.pickupDate.toLocaleDateString('en-GB')
    : "",
  returnDate: booking.returnDate
    ? booking.returnDate.toLocaleDateString('en-GB')
    : "",
  createdAt: booking.createdAt?.toDate
    ? booking.createdAt.toDate().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    : "",

  stage: booking.stage,
  products: booking.products
    ?.map((p) => `${p.productCode}×${p.quantity}`)
    .join(", "),
  IdentityProof: booking.IdentityProof,
  IdentityNumber: booking.IdentityNumber,
  Source: booking.Source,
  CustomerBy: booking.CustomerBy,
  ReceiptBy: booking.ReceiptBy,
  Alterations: booking.Alterations,
  SpecialNote: booking.SpecialNote,
  GrandTotalRent: booking.GrandTotalRent,
  DiscountOnRent: booking.DiscountOnRent,
  FinalRent: booking.FinalRent,
  GrandTotalDeposit: booking.GrandTotalDeposit,
  DiscountOnDeposit: booking.DiscountOnDeposit,
  FinalDeposit: booking.FinalDeposit,
  AmountToBePaid: booking.AmountToBePaid,
  AmountPaid: booking.AmountPaid,
  Balance: booking.Balance,
  PaymentStatus: booking.PaymentStatus,
  FirstPaymentDetails: booking.FirstPaymentDetails,
  FirstPaymentMode: booking.FirstPaymentMode,
  SecondPaymentMode: booking.SecondPaymentMode,
  SecondPaymentDetails: booking.SecondPaymentDetails,
});



const BookingDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceiptNumber, setSelectedReceiptNumber] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

const [searchQuery, setSearchQuery] = useState(
  searchParams.get('query') || ''
);  const [selectedBooking, setSelectedBooking] = useState(null);

  const [filteredBookings, setFilteredBookings] = useState(bookings);


const [searchField, setSearchField] = useState(
  searchParams.get('field') || ''
);  const [importedData, setImportedData] = useState(null);
const [viewMode, setViewMode] = useState(
  searchParams.get('view') || 'compact'
);
  const navigate = useNavigate();
const [stageFilter, setStageFilter] = useState(
  searchParams.get('stage') || 'all'
);
  const { userData } = useUser();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedContactNo, setSelectedContactNo] = useState(null);
  // ================= FIELD VISIBILITY =================
  const [visibleFields, setVisibleFields] = useState({});
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [tempVisibleFields, setTempVisibleFields] = useState({});
  const [savingFields, setSavingFields] = useState(false);

  useEffect(() => {
  setStageFilter(searchParams.get('stage') || 'all');
  setSearchField(searchParams.get('field') || '');
  setSearchQuery(searchParams.get('query') || '');
  setViewMode(searchParams.get('view') || 'compact');
}, [searchParams]);

  const formatDateYYYYMMDD = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    if (!userData?.branchCode) return;

    const loadFieldSettings = async () => {
      try {
        const ref = doc(db, "branches", userData.branchCode);
        const snap = await getDoc(ref);

        if (snap.exists() && snap.data().bookingFieldSettings?.visibleFields) {
          setVisibleFields(snap.data().bookingFieldSettings.visibleFields);
        } else {
          // First-time default
          const defaults = {};
          EXPORT_FIELDS.forEach((field) => {
            defaults[field] = !DEFAULT_HIDDEN_FIELDS.includes(field);
          });

          setVisibleFields(defaults);

          await setDoc(
            ref,
            {
              bookingFieldSettings: {
                visibleFields: defaults,
                createdAt: serverTimestamp(),
                createdBy: userData?.email || "system",
              },
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load field settings");
      }
    };

    loadFieldSettings();
  }, [userData?.branchCode]);



  const handleBookingClick = (booking) => {
    setSelectedReceiptNumber(booking.receiptNumber);
    navigate(`/booking-details/${booking.receiptNumber}`, { state: { booking } });
  };

   useEffect(() => {
    const fetchAllBookingsWithUserDetails = async () => {
      setLoading(true); // Start loading
      try {

        // Query for products in the correct branch subcollection
        const productsRef = collection(db, `products/${userData.branchCode}/products`); // Updated path for branch-specific products
        const productsSnapshot = await getDocs(productsRef);

        const allBookingsPromises = productsSnapshot.docs.map(async (productDoc) => {
          const productCode = productDoc.data().productCode;
          const bookingsRef = collection(productDoc.ref, 'bookings');
          const bookingsQuery = query(bookingsRef, orderBy('pickupDate', 'asc'));
          const bookingsSnapshot = await getDocs(bookingsQuery);

          const batch = writeBatch(db); // Batch for updates
          const productBookings = bookingsSnapshot.docs.map((docSnapshot) => {
            const bookingData = docSnapshot.data();
            const {
              bookingId,
              receiptNumber,
              pickupDate,
              returnDate,
              quantity,
              userDetails,
              createdAt,
            } = bookingData;

            const pickupDateObj = pickupDate && typeof pickupDate.toDate === 'function' ? pickupDate.toDate() : new Date(pickupDate);
            const returnDateObj = returnDate && typeof returnDate.toDate === 'function' ? returnDate.toDate() : new Date(returnDate);
            const todayDateObj = new Date(); // Get today's date

            console.log('Today Date:', todayDateObj);
            console.log('Pickup Date:', pickupDateObj);
            console.log('Return Date:', returnDateObj);
            console.log('User Stage:', userDetails.stage);
            // Update stages as needed based on today's date
            if (pickupDateObj.toDateString() === todayDateObj.toDateString() && userDetails.stage === 'Booking') {
              console.log(`Updating stage to 'pickupPending' for booking ${docSnapshot.id}`);
              batch.update(doc(db, `products/${userData.branchCode}/products/${productDoc.id}/bookings/${docSnapshot.id}`), {
                'userDetails.stage': 'pickupPending',
              });
              userDetails.stage = 'pickupPending';
            }

            if (returnDateObj.toDateString() === todayDateObj.toDateString() && userDetails.stage === 'pickup') {
              console.log(`Updating stage to 'returnPending' for booking ${docSnapshot.id}`);
              batch.update(doc(db, `products/${userData.branchCode}/products/${productDoc.id}/bookings/${docSnapshot.id}`), {
                'userDetails.stage': 'returnPending',
              });
              userDetails.stage = 'returnPending';
            }

            // Ensure returnDate is updated correctly
            if (['return', 'cancelled', 'successful','postponed'].includes(userDetails.stage) && returnDateObj.getTime() >= todayDateObj.getTime()) {
              console.log(`Updating returnDate for booking ${docSnapshot.id} to today`);

              batch.update(doc(db, `products/${userData.branchCode}/products/${productDoc.id}/bookings/${docSnapshot.id}`), {
                returnDate: todayDateObj, // Store as Firestore Timestamp
              });

              bookingData.returnDate = todayDateObj;
            }

            // Logging paths for batch update
            console.log(`Firestore path for update: products/${userData.branchCode}/products/${productDoc.id}/bookings/${docSnapshot.id}`);


            const productName = productDoc.data().productName || "N/A";

            return {
              bookingId,
              receiptNumber,
              clientname: userDetails.name,
              contactNo: userDetails.contact,
              email: userDetails.email,
              pickupDate: pickupDate
                ? pickupDate.toDate
                  ? pickupDate.toDate()
                  : new Date(pickupDate)
                : null,
              returnDate: returnDate
                ? returnDate.toDate
                  ? returnDate.toDate()
                  : new Date(returnDate)
                : null,
              createdAt: createdAt || null,
              stage: userDetails.stage,
              products: [
                { productCode, quantity: parseInt(quantity, 10), productName }, // Ensure each product is properly formatted
              ],
              IdentityProof: userDetails.identityproof || 'N/A',
              IdentityNumber: userDetails.identitynumber || 'N/A',
              Source: userDetails.source || 'N/A',
              CustomerBy: userDetails.customerby || 'N/A',
              ReceiptBy: userDetails.receiptby || 'N/A',
              Alterations: userDetails.alterations || 'N/A',
              SpecialNote: userDetails.specialnote || 'N/A',
              GrandTotalRent: userDetails.grandTotalRent || 'N/A',
              DiscountOnRent: userDetails.discountOnRent || 'N/A',
              FinalRent: userDetails.finalrent || 'N/A',
              GrandTotalDeposit: userDetails.grandTotalDeposit || 'N/A',
              DiscountOnDeposit: userDetails.discountOnDeposit || 'N/A',
              FinalDeposit: userDetails.finaldeposite || 'N/A',
              AmountToBePaid: userDetails.totalamounttobepaid || 'N/A',
              AmountPaid: userDetails.amountpaid || 'N/A',
              Balance: userDetails.balance || 'N/A',
              PaymentStatus: userDetails.paymentstatus || 'N/A',
              FirstPaymentDetails: userDetails.firstpaymentdtails || 'N/A',
              FirstPaymentMode: userDetails.firstpaymentmode || 'N/A',
              SecondPaymentMode: userDetails.secondpaymentmode || 'N/A',
              SecondPaymentDetails: userDetails.secondpaymentdetails || 'N/A',
            };
          });

          await batch.commit(); // Commit batched updates
          return productBookings;
        });

        const allBookings = (await Promise.all(allBookingsPromises)).flat();

        // Group bookings by receiptNumber, and aggregate products correctly
        const groupedBookings = allBookings.reduce((acc, booking) => {
          const { receiptNumber, products } = booking;
          if (!acc[receiptNumber]) {
            acc[receiptNumber] = { ...booking, products: [...products] };
          } else {
            // If receiptNumber already exists, aggregate products properly
            products.forEach((product) => {
              const existingProduct = acc[receiptNumber].products.find(
                (p) => p.productCode === product.productCode
              );
              if (existingProduct) {
                existingProduct.quantity += product.quantity; // Aggregate quantity
              } else {
                acc[receiptNumber].products.push(product); // Add new product entry
              }
            });
          }
          return acc;
        }, {});

        // Convert grouped bookings object to array
        let bookingsArray = Object.values(groupedBookings);

        // Sort bookings by `createdAt` in descending order
        bookingsArray.sort((a, b) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt)
            : new Date(0);
          const dateB = b.createdAt
            ? new Date(b.createdAt.toDate ? b.createdAt.toDate() : b.createdAt)
            : new Date(0);
          return dateB - dateA; // Latest first
        });

        setBookings(bookingsArray); // Update state with sorted bookings
      } catch (error) {
        toast.error('Error fetching bookings:', error);
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchAllBookingsWithUserDetails();
  }, [userData.branchCode]);



 const handleDelete = async (receiptNumber) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete ALL bookings for receipt ${receiptNumber}?`
  );
  if (!confirmed) return;

  try {
    console.log("⚡ FAST DELETE START");
    console.log("Receipt:", receiptNumber);

    // 🔥 ONE QUERY (no branchCode filter)
    const bookingsQuery = query(
      collectionGroup(db, "bookings"),
      where("receiptNumber", "==", receiptNumber)
    );

    const snapshot = await getDocs(bookingsQuery);

    if (snapshot.empty) {
      console.warn("❌ No bookings found");
      toast.error("No booking found with the specified receipt number.");
      return;
    }

    const batch = writeBatch(db);
    const productCodes = new Set();
    let deletedBookingData = null;

    snapshot.docs.forEach((docSnap) => {
      console.log("🗑 Deleting:", docSnap.ref.path);

      if (!deletedBookingData) {
        deletedBookingData = docSnap.data();
      }

      // Extract productCode from path
      // products/{branchCode}/products/{productCode}/bookings/{docId}
      const pathParts = docSnap.ref.path.split("/");
      const productCode = pathParts[pathParts.indexOf("products") + 1];
      const branchCodeFromPath = pathParts[1]; // 👈 branch from path

      productCodes.add(productCode);

      batch.delete(docSnap.ref);
    });

    await batch.commit();

    console.log("✅ DELETE COMPLETE");
    console.log("Products affected:", Array.from(productCodes));

    // Audit backup
    await addDoc(
      collection(db, `products/${userData.branchCode}/deletedBookings`),
      {
        ...deletedBookingData,
        receiptNumber,
        productCodes: Array.from(productCodes),
        deletedAt: serverTimestamp(),
        deletedBy: userData?.email || "unknown",
      }
    );

    toast.success("Booking deleted successfully");

    setBookings((prev) =>
      prev.filter((b) => b.receiptNumber !== receiptNumber)
    );

  } catch (error) {
    console.error("🔥 DELETE ERROR:", error);
    toast.error("Error deleting booking");
  }
};









  const handleAddBooking = () => {
    navigate('/usersidebar/availability'); // Navigate to an add booking page
  };








  const handleSearch = () => {
    const lowerCaseQuery = searchQuery.toLowerCase(); // Make search case-insensitive

    if (lowerCaseQuery === '') {
      setFilteredBookings(bookings); // Show all bookings if search query is empty
    } else {
      const filteredBookings = bookings.filter((booking) => {
        // Apply filtering based on the selected search field
        if (searchField === 'bookingId') {
          return booking.bookingId && String(booking.bookingId).toLowerCase().includes(lowerCaseQuery);
        } else if (searchField === 'receiptNumber') {
          return booking.receiptNumber && String(booking.receiptNumber).toLowerCase().includes(lowerCaseQuery);
        } else if (searchField === 'createdAt') {
          return (
            booking.createdAt &&
            formatDateYYYYMMDD(booking.createdAt.toDate()) === searchQuery
          );
        }
        else if (searchField === 'clientname') {
          return booking.clientname && booking.clientname.toLowerCase().includes(lowerCaseQuery);
        }
        else if (searchField === 'emailId') {
          return booking.email && booking.email.toLowerCase().includes(lowerCaseQuery);
        } else if (searchField === 'contactNo') {
          return booking.contactNo && String(booking.contactNo).toLowerCase().includes(lowerCaseQuery);
        } else if (searchField === 'pickupDate') {
          return (
            booking.pickupDate &&
            formatDateYYYYMMDD(booking.pickupDate) === searchQuery


          );
        } else if (searchField === 'returnDate') {
          return (
            booking.returnDate &&
            formatDateYYYYMMDD(booking.returnDate) === searchQuery


          );

        } else if (searchField === 'productCode') {
          return booking.products && booking.products.some(product =>
            String(product.productCode).toLowerCase().includes(lowerCaseQuery)
          );
        } else {
          // If no specific search field is selected, perform search across all fields
          return (
            (booking.bookingId && String(booking.bookingId).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.receiptNumber && String(booking.receiptNumber).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.createdAt && (booking.createdAt).toDate().toLocaleDateString('en-GB').toLowerCase().includes(lowerCaseQuery)) ||
            (booking.clientname && booking.clientname.toLowerCase().includes(lowerCaseQuery)) ||
            (booking.contactNo && String(booking.contactNo).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.email && booking.email.toLowerCase().includes(lowerCaseQuery)) ||
            (booking.pickupDate && new Date(booking.pickupDate).toLocaleDateString('en-GB').toLowerCase().includes(lowerCaseQuery)) ||
            (booking.returnDate && new Date(booking.returnDate).toLocaleDateString('en-GB').toLowerCase().includes(lowerCaseQuery)) ||
            (booking.price && String(booking.price).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.deposit && String(booking.deposit).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.minimumRentalPeriod && String(booking.minimumRentalPeriod).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.discountedGrandTotal && String(booking.discountedGrandTotal).toLowerCase().includes(lowerCaseQuery)) ||
            (booking.stage && booking.stage.toLowerCase().includes(lowerCaseQuery)) ||
            (booking.products && booking.products.some(product =>
              String(product.productCode).toLowerCase().includes(lowerCaseQuery) ||
              String(product.quantity).toLowerCase().includes(lowerCaseQuery)
            ))
          );
        }
      });

      setFilteredBookings(filteredBookings); // Update bookings with filtered results
    }
  };

  useEffect(() => {
  handleSearch();
}, [searchQuery, searchField, stageFilter]);


useEffect(() => {
  handleSearch();
}, [bookings]);


  const exportToCSV = () => {
    const processedBookings = bookings.map(booking => {
      const productsString = booking.products
        .map(product => `${product.productCode}:${product.quantity}`)
        .join(', ');

      // Check if `createdAt` exists and is a Timestamp
      const createdAtDate = booking.createdAt && booking.createdAt.toDate
        ? booking.createdAt.toDate().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })

        : 'N/A'; // Use 'N/A' or another placeholder if `createdAt` is missing

      return {
        ...booking,
        products: productsString,
        createdAt: createdAtDate,
      };
    });

    const csv = Papa.unparse(processedBookings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'bookings.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (result) => {
          const importedBookings = result.data.filter(row => row && Object.keys(row).length > 0);

          if (importedBookings.length === 0) {
            toast.warn('No bookings to import.');
            return;
          }

          await Promise.all(importedBookings.map(async (booking) => {
            try {
              if (!booking.bookingCode) {
                toast.error('Booking code is missing:', booking);
                return;
              }

              const bookingRef = doc(db, 'bookings', booking.bookingCode);
              await setDoc(bookingRef, booking);
              toast.log('Booking saved successfully:', booking);
            } catch (error) {
              toast.error('Error saving booking to Firestore:', error, booking);
            }
          }));

          setImportedData(importedBookings); // Store the imported bookings locally if needed
        },
        error: (error) => {
          toast.error('Error parsing CSV:', error);
        }
      });
    }
  };

  // Search function to filter bookings


  // Add a filter based on the stageFilter
  const finalFilteredBookings = filteredBookings.filter((booking) => {
    if (stageFilter === 'all') {
      return true; // Include all bookings if "all" is selected
    }
    return booking.stage === stageFilter; // Match booking stage
  });


  const handleStageChange = async (receiptNumber, newStage) => {
    try {
      const bookingToUpdate = finalFilteredBookings.find(
        (booking) => booking.receiptNumber === receiptNumber
      );

      if (!bookingToUpdate) {
        toast.error('Booking not found');
        return;
      }

      const bookingId = String(bookingToUpdate.bookingId);
      const products = bookingToUpdate.products;

      for (const product of products) {
        const productCode = product.productCode;

        const bookingsRef = collection(
          db,
          `products/${userData.branchCode}/products/${productCode}/bookings`
        );

        const q = query(bookingsRef, where("receiptNumber", "==", receiptNumber));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          toast.error(`No documents found for bookingId: ${bookingId} in product: ${productCode}`);

          const bookingDocRef = doc(bookingsRef, bookingId);
          await setDoc(bookingDocRef, {
            userDetails: {
              stage: newStage,
              ...(newStage === "successful" && { stageUpdatedAt: serverTimestamp() }),
            },
            // Add other relevant fields if needed
          });

          toast.success(`Document created for product: ${productCode}`);
        } else {
          const bookingDocRef = querySnapshot.docs[0].ref;

          const updateData = {
            'userDetails.stage': newStage,
          };

          // ✅ If new stage is "successful", add timestamp
          if (newStage === "successful") {
            updateData['userDetails.stageUpdatedAt'] = serverTimestamp();
          }

          await updateDoc(bookingDocRef, updateData);

          toast.success('Stage updated successfully');
          window.location.reload(); // optionally refactor to avoid full reload
        }
      }

      // Update UI state
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.receiptNumber === receiptNumber
            ? { ...booking, stage: newStage }
            : booking
        )
      );
    } catch (error) {
      console.error('Error updating booking stage:', error);
      toast.error('Error updating booking stage');
    }
  };


  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        if (!userData?.branchCode) return;

        const templatesCol = collection(db, `products/${userData.branchCode}/templates`);
        const templatesSnapshot = await getDocs(templatesCol);

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
    if (!selectedBooking) {
      toast.error("No booking selected!");
      return;
    }


    const templateBody = template.body;
    const productsString = selectedBooking.products
      .map(product => `${product.productCode} : ${product.quantity}`)
      .join(", ");
    const productsString1 = selectedBooking.products
      .map(product => `${product.productName}`)
      .join(", ");


    // Replace placeholders with booking data
    const message = templateBody
      .replace("{clientName}", selectedBooking.clientname || "")
      .replace("{clientEmail}", selectedBooking.email || "")
      .replace("{CustomerBy}", selectedBooking.CustomerBy || "")
      .replace("{ReceiptBy}", selectedBooking.ReceiptBy || "")
      .replace("{Alterations}", selectedBooking.Alterations || "")
      .replace("{SpecialNote}", selectedBooking.SpecialNote || "")
      .replace("{GrandTotalRent}", selectedBooking.GrandTotalRent || "")
      .replace("{DiscountOnRent}", selectedBooking.DiscountOnRent || "")
      .replace("{FinalRent}", selectedBooking.FinalRent || "")
      .replace("{GrandTotalDeposit}", selectedBooking.GrandTotalDeposit || "")
      .replace("{DiscountOnDeposit}", selectedBooking.DiscountOnDeposit || "")
      .replace("{FinalDeposit}", selectedBooking.FinalDeposit || "")
      .replace("{AmountToBePaid}", selectedBooking.AmountToBePaid || "")
      .replace("{AmountPaid}", selectedBooking.AmountPaid || "")
      .replace("{Balance}", selectedBooking.Balance || "")
      .replace("{PaymentStatus}", selectedBooking.PaymentStatus || "")
      .replace("{FirstPaymentDetails}", selectedBooking.FirstPaymentDetails || "")
      .replace("{FirstPaymentMode}", selectedBooking.FirstPaymentMode || "")
      .replace("{SecondPaymentMode}", selectedBooking.SecondPaymentMode || "")
      .replace("{SecondPaymentDetails}", selectedBooking.SecondPaymentDetails || "")
      .replace("{Products}", productsString || "")
      .replace("{Products1}", productsString1 || "")


      .replace("{createdAt}", selectedBooking.createdAt ? formatDate(selectedBooking.createdAt.toDate()) : "")
      .replace("{pickupDate}", selectedBooking.pickupDate ? formatDate(selectedBooking.pickupDate) : "")
      .replace("{returnDate}", selectedBooking.returnDate ? formatDate(selectedBooking.returnDate) : "")

      .replace("{receiptNumber}", selectedBooking.receiptNumber || "")
      .replace("{stage}", selectedBooking.stage || "")
      .replace("{ContactNo}", selectedBooking.contactNo || "")
      .replace("{IdentityProof}", selectedBooking.IdentityProof || "")
      .replace("{IdentityNumber}", selectedBooking.IdentityNumber || "");

    sendWhatsAppMessage(selectedContactNo, message);

    // Close modal after sending the message
    setIsModalOpen(false);
  };

  // Handle contact number selection
  const handleContactNumberClick = (booking) => {
    setSelectedContactNo(booking.contactNo);
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };
  const stageCounts = filteredBookings.reduce((counts, booking) => {
    counts[booking.stage] = (counts[booking.stage] || 0) + 1;
    return counts;
  }, {});

  // Include "all" count for all bookings
  const totalBookingsCount = filteredBookings.length;
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('modal-open'); // Add class when modal is open
    } else {
      document.body.classList.remove('modal-open'); // Remove class when modal is closed
    }
  }, [isModalOpen]);

  useEffect(() => {
  const params = {};

  if (stageFilter && stageFilter !== 'all') params.stage = stageFilter;
  if (searchField) params.field = searchField;
  if (searchQuery) params.query = searchQuery;
  if (viewMode && viewMode !== 'compact') params.view = viewMode;

  setSearchParams(params, { replace: true });
}, [stageFilter, searchField, searchQuery, viewMode]);

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="dashboard-content">
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* ================= PAGE HEADER ================= */}
        <div className="page-header">
          <div>
            <h1 style={{ marginLeft: '10px', marginTop: '100px' }} className="page-title">
              Bookings
            </h1>
            <p className="page-subtitle">
              Manage all customer bookings in one place
            </p>
          </div>

          <div className="header-actions">
            <div className="view-toggle">
              <button
                className={viewMode === 'comfortable' ? 'active' : ''}
                onClick={() => setViewMode('comfortable')}
              >
                Comfortable
              </button>
              <button
                className={viewMode === 'compact' ? 'active' : ''}
                onClick={() => setViewMode('compact')}
              >
                Compact
              </button>
            </div>

            <button className="btn-secondary" onClick={exportToCSV}>
              <FaUpload /> Export
            </button>

            <button className="btn-primary" onClick={handleAddBooking}>
              <FaPlus /> Add Booking
            </button>
          </div>
        </div>

        {/* ================= KPI FILTER CARDS ================= */}
        <div className="kpi-grid">
          {[
            { key: 'all', label: 'All', count: totalBookingsCount },
            { key: 'Booking', label: 'Booking', count: stageCounts['Booking'] || 0 },
            { key: 'pickupPending', label: 'Pickup Pending', count: stageCounts['pickupPending'] || 0 },
            { key: 'pickup', label: 'Picked Up', count: stageCounts['pickup'] || 0 },
            { key: 'returnPending', label: 'Return Pending', count: stageCounts['returnPending'] || 0 },
            { key: 'return', label: 'Returned', count: stageCounts['return'] || 0 },
            { key: 'successful', label: 'Successful', count: stageCounts['successful'] || 0 },
            { key: 'cancelled', label: 'Cancelled', count: stageCounts['cancelled'] || 0 },
            { key: 'postponed', label: 'Postponed', count: stageCounts['postponed'] || 0 },
          ].map((item) => (
            <div
              key={item.key}
              className={`kpi-card ${stageFilter === item.key ? 'active' : ''}`}
              onClick={() => setStageFilter(item.key)}
            >
              <span className="kpi-label">{item.label}</span>
              <span className="kpi-value">{item.count}</span>
            </div>
          ))}
        </div>

        {/* ================= SEARCH BAR ================= */}
        <div className="table-card">
          <div className="table-toolbar">
            <div className="search-wrapper">
              <FaSearch />
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value);
                  setSearchQuery(''); // clear previous search value
                }}
              >

                <option value="receiptNumber">Receipt No</option>
                <option value="bookingcreation">Booking Date</option>
                <option value="createdAt">Created At</option>
                <option value="clientname">Client Name</option>
                <option value="contactNo">Contact</option>
                <option value="emailId">Email</option>
                <option value="productCode">Product Code</option>
                <option value="pickupDate">Pickup Date</option>
                <option value="returnDate">Return Date</option>
              </select>

              <input
                type={
                  searchField === 'pickupDate' || searchField === 'returnDate'|| searchField === 'createdAt'
                    ? 'date'
                    : 'text'
                }
                placeholder={
                  searchField === 'pickupDate' || searchField === 'returnDate'
                    ? ''
                    : 'Search bookings...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

            </div>

            {/* ========= CUSTOMIZE FIELDS DROPDOWN ========= */}
            {/* ================= CUSTOMIZE FIELDS BUTTON ================= */}
            {/* ================= CUSTOMIZE FIELDS BUTTON ================= */}
            <div className="column-selector">
              <button
                className="btn-secondary"
                onClick={() => {
                  // Copy current settings into temp state
                  setTempVisibleFields(visibleFields);
                  setShowFieldDropdown(true);
                }}
              >
                Customize Fields
              </button>
            </div>

            {/* ================= CENTERED FIELD MODAL ================= */}
            {showFieldDropdown && (
              <div
                className="field-modal-overlay"
                onClick={() => setShowFieldDropdown(false)}
              >
                <div
                  className="field-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* ===== HEADER ===== */}
                  <div className="field-modal-header">
                    <h3>Customize Fields</h3>
                    <button
                      className="close-btn"
                      onClick={() => setShowFieldDropdown(false)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* ===== BODY ===== */}
                  <div className="field-modal-body">
                    {EXPORT_FIELDS.map((field) => (
                      <label key={field} className="column-option">
                        <input
                          type="checkbox"
                          checked={!!tempVisibleFields[field]}
                          onChange={() =>
                            setTempVisibleFields((prev) => ({
                              ...prev,
                              [field]: !prev[field],
                            }))
                          }
                        />
                        <span>{field}</span>
                      </label>
                    ))}
                  </div>

                  {/* ===== FOOTER ===== */}
                  <div className="field-modal-footer">
                    <button
                      className="btn-secondary"
                      disabled={savingFields}
                      onClick={() => setShowFieldDropdown(false)}
                    >
                      Cancel
                    </button>

                    <button
                      className="btn-primary"
                      disabled={savingFields}
                      onClick={async () => {
                        try {
                          setSavingFields(true);

                          const branchRef = doc(db, "branches", userData.branchCode);

                          await setDoc(
                            branchRef,
                            {
                              bookingFieldSettings: {
                                visibleFields: tempVisibleFields,
                                updatedAt: serverTimestamp(),
                              },
                            },
                            { merge: true }
                          );

                          // Apply saved settings to UI
                          setVisibleFields(tempVisibleFields);
                          setShowFieldDropdown(false);

                          toast.success("Field preferences saved for this branch");
                        } catch (error) {
                          console.error(error);
                          toast.error("Failed to save field preferences");
                        } finally {
                          setSavingFields(false);
                        }
                      }}
                    >
                      {savingFields ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}


          </div>

          {/* ================= BOOKING CARD LIST ================= */}
          {loading ? (
            <div className="table-loading">Loading bookings…</div>
          ) : finalFilteredBookings.length === 0 ? (
            <div className="empty-state">No bookings found</div>
          ) : (
            <div className={`booking-card-list ${viewMode}`}>
              {finalFilteredBookings.map((booking) => {
                const flat = flattenBooking(booking);

                return (
                <div
  className="booking-card"
  onClick={(e) => {
    // Ignore clicks coming from action buttons
    if (e.target.closest('.row-actions')) return;
    handleBookingClick(booking);
  }}
>

                    {/* LEFT */}
                    <div className="booking-main">
                      {visibleFields.receiptNumber && (
                        <div className="booking-receipt">
                          #{booking.receiptNumber}
                        </div>
                      )}

                      {visibleFields.clientname && (
                        <div className="booking-client">
                          {booking.clientname}
                        </div>
                      )}

                      {(visibleFields.contactNo || visibleFields.email) && (
                        <div className="booking-contact">
                          {visibleFields.contactNo && <>📞 {booking.contactNo}</>}
                          {visibleFields.email && <> &nbsp;&nbsp; ✉ {booking.email}</>}
                        </div>
                      )}
                    </div>

                    {/* CENTER */}
                    <div className="booking-meta">
                      {visibleFields.products && (
                        <div>
                          <span className="meta-label">Products</span>
                          <span className="meta-value">
                            {booking.products
                              .map((p) => `${p.productCode} × ${p.quantity}`)
                              .join(', ')}
                          </span>
                        </div>
                      )}

                      {visibleFields.pickupDate && (
                        <div>
                          <span className="meta-label">Pickup</span>
                          <span className="meta-value">
                            {booking.pickupDate?.toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      )}

                      {visibleFields.returnDate && (
                        <div>
                          <span className="meta-label">Return</span>
                          <span className="meta-value">
                            {booking.returnDate?.toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* RIGHT */}
                    <div className="booking-actions">
                      {visibleFields.stage && (
                        <span className={`status-pill status-${booking.stage}`}>
                          {booking.stage}
                        </span>
                      )}

                      <div className="row-actions">
                        <button
                          className="icon-btn whatsapp"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactNumberClick(booking);
                          }}
                        >
                          <FaWhatsapp />
                        </button>

                        {userData?.role !== 'Subuser' && (
                          <button
                            className="icon-btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(booking.receiptNumber);
                            }}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ========= DYNAMIC FIELDS (NON-PRIMARY ONLY) ========= */}
                    <div className="booking-dynamic-fields">
                      {EXPORT_FIELDS.map(
                        (field) =>
                          visibleFields[field] &&
                          !PRIMARY_FIELDS.includes(field) && (
                            <div key={field} className="field-row">
                              <span className="field-label">{field}</span>
                              <span className="field-value">
                                {flat[field] || "-"}
                              </span>
                            </div>
                          )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
    </div>
  );



};

export default BookingDashboard;