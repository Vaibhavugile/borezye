import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import './Product.css';
import UserHeader from '../UserDashboard/UserHeader';
import UserSidebar from '../UserDashboard/UserSidebar';
import { FaDownload, FaUpload, FaPlus, FaEdit, FaTrash, FaCopy } from 'react-icons/fa';
import { useUser } from '../Auth/UserContext';
import ProductDetailSidebar from './ProductDetailSidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FaFileArchive } from 'react-icons/fa';
import { uploadBytes, getDownloadURL } from "firebase/storage";

// NEW: Firebase Storage SDK (to avoid CORS with download URLs)
import { getStorage, ref, getBlob } from 'firebase/storage';

const ProductDashboard = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('productName');
  const navigate = useNavigate();
  const { userData } = useUser();
  const [customFields, setCustomFields] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ stage: 'idle', done: 0, total: 0 });
const [zipUploading, setZipUploading] = useState(false);


  // Firebase Storage
  const storage = getStorage();

  // --- Data Loading ---
  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        if (!userData?.branchCode) return;
        const productsCollectionRef = collection(db, `products/${userData.branchCode}/products`);
        const querySnapshot = await getDocs(productsCollectionRef);
        const fetchedProducts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const allCustomFields = new Set();
        fetchedProducts.forEach((product) => {
          if (product.customFields) {
            Object.keys(product.customFields).forEach(field => allCustomFields.add(field));
          }
        });
        setAllProducts(fetchedProducts);
        setProducts(fetchedProducts);
        setTotalProducts(fetchedProducts.length);
        setCustomFields([...allCustomFields]);
      } catch (error) {
        console.error('Error fetching products data:', error);
        toast.error('Error fetching products data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchProductsData();
  }, [userData]);

  // --- Search Logic ---
  const handleSearch = () => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (lowerCaseQuery === '') {
      setProducts(allProducts);
    } else {
      const filteredProducts = allProducts.filter(product =>
        product[searchField]?.toString().toLowerCase().includes(lowerCaseQuery)
      );
      setProducts(filteredProducts);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, searchField, allProducts]);

  // --- CRUD/Navigation Handlers ---
  const handleDelete = async (id) => {
    try {
      if (!userData?.branchCode) return;
      const productRef = doc(db, `products/${userData.branchCode}/products`, id);
      await deleteDoc(productRef);
      const updatedProducts = allProducts.filter((product) => product.id !== id);
      setAllProducts(updatedProducts);
      setProducts(updatedProducts.filter(p => p[searchField]?.toString().toLowerCase().includes(searchQuery.toLowerCase())));
      setTotalProducts(updatedProducts.length);
      toast.success("Product deleted successfully.");
    } catch (error) {
      toast.error('Error deleting product: ' + error.message);
    }
  };

  const handleEdit = (id) => {
    navigate(`/editproduct/${id}`);
  };

  const handleAddProduct = () => {
    navigate('/addproduct');
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // --- Export/Import Logic ---
  const exportToCSV = () => {
    const columnLabels = {
      productCode: 'Product Code', productName: 'Product Name', brandName: 'Brand Name',
      description: 'Description', imageUrls: 'Image URLs', price: 'Rent',
      deposit: 'Deposit', quantity: 'Quantity', priceType: 'Price Type',
      minimumRentalPeriod: 'Minimum Rental Period', extraRent: 'Extra Rent',
      ...customFields.reduce((acc, field) => { acc[field] = field.replace(/([A-Z])/g, ' $1').trim(); return acc; }, {}),
    };
    const rearrangedData = products.map(product => {
      const formattedProduct = {};
      Object.keys(columnLabels).forEach(field => {
        if (customFields.includes(field)) {
          formattedProduct[columnLabels[field]] = product.customFields?.[field] || '-';
        } else {
          if (field === 'imageUrls' && Array.isArray(product[field])) {
            formattedProduct[columnLabels[field]] = product[field].join(', ');
          } else {
            formattedProduct[columnLabels[field]] = product[field] || '-';
          }
        }
      });
      return formattedProduct;
    });
    const csv = Papa.unparse({ fields: Object.values(columnLabels), data: rearrangedData, });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'products.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Products exported successfully.");
    }
  };

  // ---- Image ZIP helpers (CORS-safe via Firebase Storage) ----
  const extFromType = (contentType) => {
    const map = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg',
      'image/avif': '.avif',
    };
    return map[(contentType || '').toLowerCase()] || '.jpg';
  };

  const getImageBlobFromFirebase = async (downloadUrlOrPath) => {
    const storageRef = ref(storage, downloadUrlOrPath); // accepts download URL or gs path
    return await getBlob(storageRef);
  };
  const downloadAllImagesZip = async () => {
    if (loading || zipping) return;

    // Helpers
    const timeout = (ms) =>
      new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms));

    const fetchWithTimeout = async (fn, ms) =>
      await Promise.race([fn(), timeout(ms)]);

    const addLog = (...args) => console.log('[ZIP]', ...args);

    setZipping(true);
    setZipProgress({ stage: 'collect', done: 0, total: 0 });
    console.time('[ZIP] total');

    try {
      // 1) Build a flat task list first (so we know totals)
      const tasks = [];
      for (const product of products) {
        const imgs = Array.isArray(product.imageUrls) && product.imageUrls.length
          ? product.imageUrls
          : (product.imageUrl ? [product.imageUrl] : []);

        if (!imgs.length) continue;

        const baseName = (product.productCode || product.id || 'product')
          .toString()
          .trim()
          .replace(/[^\w.-]+/g, '_');

        imgs.forEach((url, i) => {
          tasks.push({
            url,
            productCode: product.productCode,
            filenameHint: imgs.length > 1 ? `${baseName}-${i + 1}` : `${baseName}`,
          });
        });
      }

      if (!tasks.length) {
        toast.warn('No images found to download.');
        return;
      }

      addLog(`Collected ${tasks.length} image tasks`);
      setZipProgress({ stage: 'download', done: 0, total: tasks.length });

      // 2) Process downloads with limited concurrency
      const CONCURRENCY = 5; // adjust if needed
      const zip = new JSZip();
      let added = 0;
      let failed = 0;
      let idxGlobal = 0;

      const worker = async () => {
        while (true) {
          const myIndex = idxGlobal++;
          const task = tasks[myIndex];
          if (!task) break;

          const { url, filenameHint } = task;
          const idx = myIndex + 1;

          try {
            // Prefer Firebase SDK (helps with Storage URLs)
            let blob;
            try {
              blob = await fetchWithTimeout(
                () => getImageBlobFromFirebase(url),
                20000 // 20s
              );
            } catch (sdkErr) {
              addLog(`SDK fetch failed for #${idx}:`, sdkErr?.message || sdkErr);
              // Fallback for non-Firebase URLs (requires CORS on remote)
              blob = await fetchWithTimeout(async () => {
                const res = await fetch(url, { mode: 'cors' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
              }, 15000); // 15s
            }

            const ext = extFromType(blob.type);
            const filename = `${filenameHint}${ext}`;
            zip.file(filename, blob);
            added++;
            addLog(`OK #${idx}/${tasks.length}: ${filename} (${blob.type || 'unknown'})`);
          } catch (e) {
            failed++;
            addLog(`FAIL #${idx}/${tasks.length}:`, url, e?.message || e);
          } finally {
            setZipProgress((p) => ({ ...p, done: p.done + 1 }));
          }
        }
      };

      // Launch workers
      const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker());
      await Promise.all(workers);

      addLog(`Downloaded: success=${added}, failed=${failed}`);

      if (added === 0) {
        toast.error('All image downloads failed (check CORS/URLs).');
        return;
      }

      // 3) Generate ZIP (show progress in console + UI)
      setZipProgress({ stage: 'zip', done: 0, total: 100 });
      console.time('[ZIP] generateAsync');
      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          // For images, compression provides little benefit; STORE is fastest.
          compression: 'STORE',
          streamFiles: true,
        },
        (metadata) => {
          const pct = Math.floor(metadata.percent || 0);
          setZipProgress({ stage: 'zip', done: pct, total: 100 });
          if (pct % 10 === 0) addLog(`ZIP progress: ${pct}%`);
        }
      );
      console.timeEnd('[ZIP] generateAsync');

      // 4) Save
      saveAs(zipBlob, 'product-images.zip');
      toast.success(`Downloaded ${added} image(s)${failed ? ` (${failed} failed)` : ''}.`);
    } catch (err) {
      console.error('[ZIP] fatal error:', err);
      toast.error('Failed to build ZIP. Check console for details.');
    } finally {
      setZipProgress({ stage: 'idle', done: 0, total: 0 });
      setZipping(false);
      console.timeEnd('[ZIP] total');
    }
  };


const handleImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  event.target.value = null;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (result) => {
      const importedProducts = result.data
        .filter(row => row && row['Product Code'] && Object.keys(row).length > 0)
        .map(row => {
          const product = {};
          const customFieldsData = {};

          for (const [csvHeader, value] of Object.entries(row)) {
            const trimmedValue = value?.trim();

            switch (csvHeader.toLowerCase().replace(/\s/g, '')) {
              case 'productcode':
                product.productCode = trimmedValue;
                break;

              case 'productname':
                product.productName = trimmedValue;
                break;

              case 'brandname':
                product.brandName = trimmedValue;
                break;

              case 'description':
                product.description = trimmedValue;
                break;

              case 'branchcode':
                // ✅ CSV branchCode → saved as brancCode (string)
                product.branchCode = trimmedValue ? String(trimmedValue) : '';
                break;

              case 'imageurls':
                product.imageUrls = trimmedValue
                  ? trimmedValue.split(',').map(url => url.trim()).filter(Boolean)
                  : [];
                break;

              case 'rent':
                product.price = trimmedValue;
                break;

              case 'deposit':
                product.deposit = trimmedValue;
                break;

              case 'quantity':
                product.quantity = parseInt(trimmedValue) || 0;
                break;

              case 'pricetype':
                product.priceType = trimmedValue;
                break;

              case 'minimumrentalperiod':
                product.minimumRentalPeriod = trimmedValue;
                break;

              case 'extrarent':
                product.extraRent = trimmedValue;
                break;

              default:
                const camelCaseField = csvHeader
                  .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
                    index === 0 ? word.toLowerCase() : word.toUpperCase()
                  )
                  .replace(/\s+/g, '');

                if (camelCaseField) {
                  customFieldsData[camelCaseField] = trimmedValue;
                }
                break;
            }
          }

          // ✅ Fallback: if CSV has no branchCode, inject from userData
          if (!product.branchCode && userData?.branchCode) {
            product.branchCode = String(userData.branchCode);
          }

          if (Object.keys(customFieldsData).length > 0) {
            product.customFields = customFieldsData;
          }

          return product;
        });

      if (importedProducts.length === 0) {
        toast.warn('No valid products to import.');
        return;
      }

      const branchCode = userData.branchCode;
      if (!branchCode) {
        toast.error('Missing branch code. Cannot import products.');
        return;
      }

      let successCount = 0;

      await Promise.all(
        importedProducts.map(async (product) => {
          try {
            if (!product.productCode) {
              console.error('Product code is missing:', product);
              return;
            }

            const productRef = doc(
              db,
              `products/${branchCode}/products`,
              product.productCode
            );

            await setDoc(productRef, product, { merge: true });
            successCount++;
          } catch (error) {
            console.error('Error saving product to Firestore:', error, product);
          }
        })
      );

      toast.success(
        `${successCount} out of ${importedProducts.length} products imported/updated successfully.`
      );

      setLoading(true);
    },
    error: (error) => {
      toast.error('Error parsing CSV: ' + error.message);
    }
  });
};


  const handlecopy = (product) => {
    const { productName, productCode, brandName, description, quantity, price, deposit } = product;
    const formattedText = `
      Product Name: ${productName || '-'}
      Product Code: ${productCode || '-'}
      Brand Name: ${brandName || '-'}
      Description: ${description || '-'}
      Quantity: ${quantity || '-'}
      Rent: ${price || '-'}
      Deposit: ${deposit || '-'}
    `;
    navigator.clipboard.writeText(formattedText.trim());
    toast.success(`Product details for ${productName} copied to clipboard.`);
  };

  const handleProductCodeClick = (product) => {
    setSelectedProduct(product);
    setRightSidebarOpen(true);
  };
  const closeRightSidebar = () => {
    setRightSidebarOpen(false);
  };

 const handleImageZipToCSV = async (e) => {
  const file = e.target.files[0];
  if (!file || !userData?.branchCode) return;

  try {
    setZipUploading(true);

    const zip = await JSZip.loadAsync(file);
    const storage = getStorage();
    const branchCode = userData.branchCode;

    const imageFiles = Object.keys(zip.files).filter(
      (name) => !zip.files[name].dir
    );

    setZipProgress({ done: 0, total: imageFiles.length });

    const productImageMap = {};
    let processed = 0;

    for (const filename of imageFiles) {
      const zipEntry = zip.files[filename];

      // PRD001-2.jpg → PRD001
      const productCode = filename.split("-")[0].split(".")[0];

      const blob = await zipEntry.async("blob");

      const storageRef = ref(
        storage,
        `products/${branchCode}/${filename}`
      );

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      if (!productImageMap[productCode]) {
        productImageMap[productCode] = [];
      }

      productImageMap[productCode].push(downloadURL);

      processed++;
      setZipProgress({ done: processed, total: imageFiles.length });
    }

    // 🔽 Generate CSV
    const csvRows = Object.entries(productImageMap).map(
      ([productCode, urls]) => ({
        "Product Code": productCode,
        "Image URLs": urls.join(", "),
      })
    );

    const csv = Papa.unparse(csvRows);
    const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.download = "product-images.csv";
    link.click();

    toast.success("Images uploaded & CSV generated!");

  } catch (error) {
    console.error(error);
    toast.error("Failed to upload image ZIP");
  } finally {
    setZipUploading(false);
    setZipProgress({ done: 0, total: 0 });
  }
};



  // --- JSX Render ---
  return (
  <div className={`prd-wrapper ${sidebarOpen ? "sidebar-open" : ""}`}>
    <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />

    <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />

    <div className="prd-content">
      <UserHeader
        onMenuClick={handleSidebarToggle}
        isSidebarOpen={sidebarOpen}
      />

      <div className="prd-page-inner">
        {/* ================= HEADER ================= */}
        <header className="prd-header">
          <div>
            <h1>📦 Product Catalog</h1>
            <p>
              Manage all products & rentals • {products.length} of{" "}
              {allProducts.length}
            </p>
          </div>

          <div className="prd-actions">
            <button className="prd-btn success" onClick={handleAddProduct}>
              <FaPlus /> Add Product
            </button>

            <button className="prd-btn" onClick={exportToCSV}>
              <FaDownload /> Export CSV
            </button>

            <label htmlFor="prd-import-input" className="prd-btn">
              <FaUpload /> Import CSV
              <input
                id="prd-import-input"
                type="file"
                accept=".csv"
                hidden
                onChange={handleImport}
              />
            </label>

            <button
              className="prd-btn"
              onClick={downloadAllImagesZip}
              disabled={zipping || loading}
            >
              <FaFileArchive />
              {zipping ? " Preparing…" : " Images ZIP"}
            </button>

            <label className="prd-btn">
              Upload Images ZIP → Export CSV
              <input
                type="file"
                accept=".zip"
                hidden
                onChange={handleImageZipToCSV}
              />
            </label>
            {/* ================= ZIP PROGRESS ================= */}
{(zipping || zipUploading) && zipProgress.total > 0 && (
  <div className="zip-progress-wrapper">
    <div className="zip-progress-text">
      {zipUploading ? "Uploading images…" : "Processing images…"}{" "}
      {zipProgress.done}/{zipProgress.total}
    </div>

    <div className="zip-progress-bar">
      <div
        className="zip-progress-fill"
        style={{
          width: `${Math.round(
            (zipProgress.done / zipProgress.total) * 100
          )}%`,
        }}
      />
    </div>
  </div>
)}

          </div>
        </header>

        {/* ================= TOOLBAR ================= */}
        <section className="prd-toolbar">
          <div className="prd-search-wrap">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="prd-search-select"
            >
              <option value="productName">Product Name</option>
              <option value="brandName">Brand Name</option>
              <option value="productCode">Product Code</option>
              <option value="description">Description</option>
            </select>

            <input
              type="text"
              className="prd-search-input"
              placeholder={`Search by ${searchField
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()}…`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <span className="prd-muted-text">
            Showing {products.length} of {allProducts.length}
          </span>
        </section>

        {/* ================= PRODUCT GRID ================= */}
        <section className="prd-grid">
          {loading ? (
            <div className="prd-loading-state">Loading products…</div>
          ) : products.length === 0 ? (
            <div className="prd-empty-state">No products found.</div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="prd-item-card">
                {/* Image */}
                <div className="prd-item-image">
                  <img
  loading="lazy"
  src={
    Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls[0]
      : product.imageUrl
  }
  alt={product.productName}
/>

                </div>

                {/* Content */}
                <div className="prd-item-body">
                  <h3>{product.productName}</h3>
                  <p className="prd-code">{product.productCode}</p>

                  <div className="prd-meta">
                    <span>
                      Qty <strong>{product.quantity}</strong>
                    </span>
                    <span>
                      Brand <strong>{product.brandName}</strong>
                    </span>
                  </div>

                  <div className="prd-price">
                    <div>
                      <small>Rent</small>
                      <strong>₹{product.price}</strong>
                    </div>
                    <div>
                      <small>Deposit</small>
                      <strong>₹{product.deposit}</strong>
                    </div>
                  </div>

                  {customFields.length > 0 && (
                    <div className="prd-custom-fields">
                      {customFields.map((field) => (
                        <span key={field}>
                          {product.customFields?.[field] || "-"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="prd-item-actions">
                  <button onClick={() => handlecopy(product)} title="Copy">
                    <FaCopy />
                  </button>

                  {userData?.role !== "Subuser" && (
                    <button
                      onClick={() => handleEdit(product.id)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                  )}

                  {userData?.role !== "Subuser" && (
                    <button
                      className="danger"
                      onClick={() => handleDelete(product.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* ================= PAGINATION SLOT ================= */}
        {/* 
          🔥 Later add:
          <button onClick={loadMore}>Load More</button>
          or Infinite Scroll
        */}
      </div>
    </div>
  </div>
);

};

export default ProductDashboard;
