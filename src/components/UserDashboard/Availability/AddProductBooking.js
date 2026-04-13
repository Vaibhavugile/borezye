import React, { useState } from "react";
import { db } from "../../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { query, where } from "firebase/firestore";
import { toast } from "react-toastify";
import { useUser } from "../../Auth/UserContext";

function AddProductBooking({ receiptNumber, onClose }) {

const { userData } = useUser();

const [products,setProducts] = useState([
{
productCode:"",
quantity:"",
pickupDate:"",
returnDate:"",
price:0,
deposit:0,
availableQuantity:null,
errorMessage:""
}
]);

const [productSuggestions,setProductSuggestions] = useState([]);
const [activeProductIndex,setActiveProductIndex] = useState(null);

 const fetchProductSuggestions = async (searchTerm) => {
    try {
const branchCode = userData.branchCode;

const productsRef = collection(db, `products/${branchCode}/products`);      const q = query(
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
    const checkAvailability = async (index) => {
    
      const { productCode, pickupDate, returnDate, quantity } = products[index];
    
      const pickupDateObj = new Date(pickupDate);
      const returnDateObj = new Date(returnDate);
    
      console.log("---------------------------------------------------");
      console.log("🚀 CHECK AVAILABILITY STARTED");
      console.log("Product Code:", productCode);
      console.log("Requested Quantity:", quantity);
      console.log("Pickup Date:", pickupDateObj);
      console.log("Return Date:", returnDateObj);
      console.log("---------------------------------------------------");
    
      try {
    
        // 🔹 Fetch product
        console.log("📦 Fetching product document...");
    
        const productRef = doc(
          db,
          `products/${userData.branchCode}/products`,
          productCode
        );
    
        const productDoc = await getDoc(productRef);
    
        if (!productDoc.exists()) {
    
          console.log("❌ Product not found");
    
          const newProducts = [...products];
          newProducts[index].errorMessage = "Product not found.";
          setProducts(newProducts);
    
          toast.error("Product not found");
          return;
        }
    
        const productData = productDoc.data();
        const maxAvailableQuantity = productData.quantity || 0;
    
        console.log("✅ Product Found");
        console.log("Total Stock:", maxAvailableQuantity);
    
        // 🔹 Fetch bookings
        console.log("📚 Fetching product bookings...");
    
        const bookingsRef = collection(productRef, "bookings");
        const querySnapshot = await getDocs(bookingsRef);
    
        console.log("Total bookings found:", querySnapshot.size);
    
        let bookedQuantity = 0;
        const overlappingBookings = [];
        const allBookings = [];
    
        querySnapshot.forEach((docSnap) => {
    
          const bookingData = docSnap.data();
    
          // 🔹 Safe date conversion
          const bookingPickup =
            bookingData.pickupDate?.toDate
              ? bookingData.pickupDate.toDate()
              : new Date(bookingData.pickupDate);
    
          const bookingReturn =
            bookingData.returnDate?.toDate
              ? bookingData.returnDate.toDate()
              : new Date(bookingData.returnDate);
    
          const bookingQty = Number(bookingData.quantity || 0);
    
          const status = bookingData.userDetails?.stage || "booking";
    
          console.log("---------------------------------------------------");
          console.log("📄 Booking Found");
          console.log("Receipt:", bookingData.receiptNumber);
          console.log("Status:", status);
          console.log("Pickup:", bookingPickup);
          console.log("Return:", bookingReturn);
          console.log("Quantity:", bookingQty);
    
          // Ignore cancelled
          // Ignore bookings that no longer hold stock
    // Store ALL bookings for UI
    // Hide successful bookings in UI
    if (status !== "successful") {
    
      allBookings.push({
        receiptNumber: bookingData.receiptNumber,
        pickupDate: bookingPickup,
        returnDate: bookingReturn,
        quantity: bookingQty,
        status
      });
    
    }
    
    // Ignore only for availability calculation
    if (
      status === "cancelled" ||
      status === "return" ||
      status === "successful" ||
      status === "postponed"
    ) {
      console.log("⛔ Ignored for availability:", status);
      return;
    }
    
          // 🔹 Check overlap
          const overlap =
            bookingPickup <= returnDateObj &&
            bookingReturn >= pickupDateObj;
    
          console.log("Overlap:", overlap);
    
          if (overlap) {
    
            bookedQuantity += bookingQty;
    
            overlappingBookings.push({
              receiptNumber: bookingData.receiptNumber,
              quantity: bookingQty
            });
    
            console.log("⚠️ Overlapping booking added");
            console.log("Running booked quantity:", bookedQuantity);
    
          }
    
        });
    
        console.log("---------------------------------------------------");
        console.log("📊 BOOKING SUMMARY");
        console.log("Stock:", maxAvailableQuantity);
        console.log("Overlapping Booked:", bookedQuantity);
    
        // 🔹 Calculate remaining stock
        let availableQuantity = maxAvailableQuantity - bookedQuantity;
    
        if (availableQuantity < 0) availableQuantity = 0;
    
        console.log("Available Quantity:", availableQuantity);
    
        // 🔹 Check requested quantity
        if (Number(quantity) > availableQuantity) {
    
          console.log("❌ Requested quantity exceeds availability");
    
          const newProducts = [...products];
    
          newProducts[index].availableQuantity = availableQuantity;
    
          newProducts[index].errorMessage =
            `Only ${availableQuantity} item(s) available for selected dates`;
    
          newProducts[index].allBookings = allBookings;
    
          setProducts(newProducts);
    
          toast.error(`Only ${availableQuantity} available`);
    
          return;
        }
    
        console.log("✅ Requested quantity is available");
    
        // 🔹 Update UI
        const newProducts = [...products];
    
        newProducts[index].availableQuantity = availableQuantity;
        newProducts[index].errorMessage = "";
        newProducts[index].allBookings = allBookings;
    
        setProducts(newProducts);
    
        console.log("---------------------------------------------------");
        console.log("🎯 AVAILABILITY CHECK COMPLETED");
        console.log("---------------------------------------------------");
    
      } catch (error) {
    
        console.error("❌ Error checking availability:", error);
    
        toast.error("Error checking availability");
    
        const newProducts = [...products];
    
        newProducts[index].errorMessage =
          "Failed to check availability. Please try again.";
    
        setProducts(newProducts);
    
      }
    };
    const handleAddProduct = async ()=>{

try{

const batch = writeBatch(db);

const paymentRef = doc(
db,
`products/${userData.branchCode}/payments`,
receiptNumber
);

const paymentSnap = await getDoc(paymentRef);

const paymentData = paymentSnap.data();

let newRent = paymentData.finalRent || 0;
let newDeposit = paymentData.finalDeposit || 0;

for(const product of products){

const productRef = doc(
db,
`products/${userData.branchCode}/products`,
product.productCode
);

const bookingRef = collection(productRef,"bookings");

await addDoc(bookingRef,{
receiptNumber,
productCode:product.productCode,
branchCode:userData.branchCode,
pickupDate:new Date(product.pickupDate),
returnDate:new Date(product.returnDate),
quantity:Number(product.quantity),
price:product.price,
deposit:product.deposit,
createdAt:serverTimestamp(),
userDetails:{
stage:"Booking"
}
});

newRent += product.price * product.quantity;
newDeposit += product.deposit * product.quantity;

}

const total = newRent + newDeposit;

await updateDoc(paymentRef,{
finalRent:newRent,
finalDeposit:newDeposit,
totalAmount:total,
balance: total - (paymentData.amountPaid || 0)
});

toast.success("Product added successfully");

onClose();

}catch(error){

console.error(error);
toast.error("Failed to add product");

}

};
return(

<div className="add-product-modal">

<h2>Add Product</h2>

{products.map((product,index)=>(

<div key={index}>

<input
placeholder="Product Code"
value={product.productCode}
onChange={(e)=>{
const updated=[...products];
updated[index].productCode=e.target.value;
setProducts(updated);
fetchProductSuggestions(e.target.value);
}}
/>

<input
placeholder="Quantity"
value={product.quantity}
onChange={(e)=>{
const updated=[...products];
updated[index].quantity=e.target.value;
setProducts(updated);
}}
/>

<button onClick={()=>checkAvailability(index)}>
Check Availability
</button>

</div>

))}

<button onClick={handleAddProduct}>
Add Product
</button>

<button onClick={onClose}>
Cancel
</button>

</div>

)

}

export default AddProductBooking;