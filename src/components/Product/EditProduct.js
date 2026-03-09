import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useUser } from '../Auth/UserContext';
import '../Product/Addproduct.css';
import { FaPlus } from 'react-icons/fa';
import UserHeader from '../UserDashboard/UserHeader';
import UserSidebar from '../UserDashboard/UserSidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EditProduct() {
  const { productCode } = useParams();
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [description, setDescription] = useState('');
  const [minimumRentalPeriod, setMinimumRentalPeriod] = useState(1);
  const [priceType, setPriceType] = useState('');
  const [extraRent, setExtraRent] = useState(1);
  const [images, setImages] = useState([]); // Handles both new and existing images
  const [branchCode, setBranchCode] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { userData } = useUser();
  const navigate = useNavigate();
  const imageInputRef = useRef();

  useEffect(() => {
    if (userData && userData.branchCode) {
      setBranchCode(userData.branchCode);
    }
  
    const fetchProductData = async () => {
      if (!userData?.branchCode || !productCode) return;
  
      const productRef = doc(db, `products/${userData.branchCode}/products`, productCode);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const productData = productDoc.data();
        setProductName(productData.productName);
        setBrandName(productData.brandName);
        setQuantity(productData.quantity);
        setPrice(productData.price);
        setDeposit(productData.deposit);
        setDescription(productData.description);
        setMinimumRentalPeriod(productData.minimumRentalPeriod);
        setExtraRent(productData.extraRent);
        setPriceType(productData.priceType);
  
        // Load existing images as preview
        if (productData.imageUrls) {
          const existingImages = productData.imageUrls.map((url) => ({
            preview: url,
          }));
          setImages(existingImages);
        }
        setCustomFieldValues(productData.customFields || {});
      }
    };
  
    fetchProductData();
  }, [productCode, userData]);
  
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
  
    // Limit to 2 images
    if (images.length + files.length <= 2) {
      const newImages = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file), // Create local preview for new images
      }));
  
      // Add new images without removing existing image URLs
      setImages((prevImages) => [...prevImages, ...newImages]);
    } else {
      toast.warn('You can upload a maximum of 2 images.');
    }
  };
  
  const handleImageClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };
  
  const handleImageRemove = (index) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const storage = getStorage();
      const uploadedImageUrls = [];
  
      // Upload new files to Firebase Storage
      for (const image of images) {
        if (image.file) {
          const storageRef = ref(storage, `products/${branchCode}/${image.file.name}`);
          await uploadBytes(storageRef, image.file);
          const imageUrl = await getDownloadURL(storageRef);
          uploadedImageUrls.push(imageUrl);
        } else {
          uploadedImageUrls.push(image.preview); // Retain existing images
        }
      }
  
      const productData = {
        productName,
        productCode,
        brandName,
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
        deposit: parseFloat(deposit),
        description,
        imageUrls: uploadedImageUrls, // Include both existing and new images
        branchCode,
        customFields: customFieldValues,
        priceType,
        extraRent: parseInt(extraRent, 10),
        minimumRentalPeriod: parseInt(minimumRentalPeriod, 10),
      };
  
      const productRef = doc(db, `products/${branchCode}/products`, productCode);
      await setDoc(productRef, productData);
  
      toast.success('Product updated successfully!');
      setTimeout(() => navigate('/productdashboard'), 5000);
    } catch (error) {
      console.error('Error updating product: ', error);
      toast.error('Failed to update product');
    }
  };
  
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className={`add-product-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="add-product-name">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />
        <h2 style={{ marginLeft: '20px', marginTop: '70px' }}>Edit Product</h2>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="general-info">
            <div className="left">
              <label className="pd">Product Details</label>
              <label>Product Name</label>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} required />

              <label>Product Code</label>
              <input value={productCode} readOnly required />

              <label>Quantity</label>
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} required />

              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="right">
            <label>Upload Images</label>
            <div className="image-upload-box" onClick={handleImageClick}>
              {images.length > 0 ? (
                images.map((image, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundImage: `url(${image.preview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      width: '100px',
                      height: '100px',
                      margin: '5px',
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleImageRemove(index)}
                      style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        backgroundColor: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                      }}
                    >
                      x
                    </button>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '24px', color: '#999' }}>
                  <FaPlus />
                </span>
              )}
            </div>
            <input
              type="file"
              multiple
              onChange={handleImageChange}
              ref={imageInputRef}
              style={{ display: 'none' }}
            />
          </div>

          <div className="pricing">
            <div className="bottom-left">
              <label>Base Rent</label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <label>Deposit</label>
              <input
                type="text"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                required
              />
              <label>Rent Calculated By</label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value)}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
              <label>Minimum Rental Period</label>
              <input
                type="text"
                value={minimumRentalPeriod}
                onChange={(e) => setMinimumRentalPeriod(e.target.value)}
              />
              <label>Add-On Charges</label>
              <div className="extra-rent-group">
                <input
                  type="text"
                  value={extraRent}
                  onChange={(e) => setExtraRent(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="right1">
            <label>Brand Name</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="submit-button5">
          <button onClick={() => navigate('/productdashboard')} type="button" className='can1'>Cancel</button>
            <button type="submit" className='pro'>Update Product</button>
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}

export default EditProduct;
