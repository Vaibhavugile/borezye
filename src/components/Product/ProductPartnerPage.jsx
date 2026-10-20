import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useUser } from '../Auth/UserContext';
import UserHeader from '../UserDashboard/UserHeader';
import UserSidebar from '../UserDashboard/UserSidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaArrowLeft, FaSearch, FaHandshake, FaWallet, FaUserCheck, FaCheckCircle } from 'react-icons/fa';
import './ProductPartnerPage.css';

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const asAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const ProductPartnerPage = () => {
  const { userData } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const initialProduct = location.state?.product;
  const [product, setProduct] = useState(initialProduct || null);
  const [productLoading, setProductLoading] = useState(Boolean(initialProduct?.id));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [actionType, setActionType] = useState('partnership');
  const [commission, setCommission] = useState('30');
  const [creditAmount, setCreditAmount] = useState('');
  const [dressCreditTotal, setDressCreditTotal] = useState(0);
  const [dressCreditLoading, setDressCreditLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  // Always reload the product from Firestore so the page reflects the latest
  // partnership assignment rather than relying only on stale navigation state.
  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      if (!initialProduct?.id || !userData?.branchCode) {
        setProductLoading(false);
        return;
      }
      setProductLoading(true);
      try {
        const productRef = doc(db, `products/${userData.branchCode}/products`, initialProduct.id);
        const snapshot = await getDoc(productRef);
        if (cancelled) return;
        if (snapshot.exists()) {
          setProduct({ id: snapshot.id, ...snapshot.data() });
        } else {
          toast.error('This dress could not be found in the current branch.');
        }
      } catch (error) {
        console.error('Unable to refresh product:', error);
        if (!cancelled) toast.error('Could not load the latest dress details.');
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    };
    loadProduct();
    return () => { cancelled = true; };
  }, [initialProduct?.id, userData?.branchCode]);

  useEffect(() => {
    let cancelled = false;
    const loadCustomers = async () => {
      if (!userData?.branchCode) {
        setCustomersLoading(false);
        return;
      }
      setCustomersLoading(true);
      try {
        // Customer app profiles are stored by branch, with phone as the document ID.
        const customerRef = collection(db, `customers/${userData.branchCode}/users`);
        const snapshot = await getDocs(customerRef);
        if (cancelled) return;
        setCustomers(snapshot.docs.map((customerDoc) => {
          const data = customerDoc.data();
          const phone = data.phone || data.mobileNumber || customerDoc.id;
          return {
            ...data,
            id: customerDoc.id,
            name: data.name || data.Name || 'Customer',
            phone: String(phone),
            email: data.email || '',
          };
        }));
      } catch (error) {
        console.error('Unable to load customers:', error);
        toast.error('Could not load customers. Check Firestore access and try again.');
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    };
    loadCustomers();
    return () => { cancelled = true; };
  }, [userData?.branchCode]);

  const existingPartnerId = product?.partnerId || product?.partner?.id || product?.partner?.customerId || '';
  const existingPartnerName = product?.partnerName || product?.partner?.name || '';
  const existingPartnerMobile = product?.partnerMobile || product?.partner?.mobile || product?.partner?.phone || '';
  const hasExistingPartner = Boolean(existingPartnerId || existingPartnerName || existingPartnerMobile);

  // A credit note also links a dress to a customer. If no partner is assigned,
  // the first customer who receives credit becomes the locked customer for this
  // dress; later credit additions/revenue actions must use that same customer.
  const linkedCustomerId = existingPartnerId || product?.lastCreditNoteCustomerId || product?.creditNoteCustomerId || '';
  const linkedCustomerName = existingPartnerName || product?.lastCreditNoteCustomerName || product?.creditNoteCustomerName || '';
  const linkedCustomerMobile = existingPartnerMobile || product?.lastCreditNoteMobile || product?.creditNoteCustomerMobile || '';
  const hasExistingCustomerLink = Boolean(linkedCustomerId || linkedCustomerName || linkedCustomerMobile);

  // Total only the credit additions recorded against this specific dress.
  // This is intentionally separate from the customer's branch-wide credit balance.
  useEffect(() => {
    const branchCode = userData?.branchCode;
    const productId = product?.id;
    if (!branchCode || !productId) {
      setDressCreditTotal(0);
      return;
    }
    let cancelled = false;
    const loadDressCreditTotal = async () => {
      setDressCreditLoading(true);
      try {
        const historyRef = collection(db, `products/${branchCode}/products/${productId}/creditNotes`);
        const snapshot = await getDocs(historyRef);
        const total = snapshot.docs.reduce((sum, entry) => {
          const data = entry.data();
          return sum + (data.entryType === 'credit_addition' || data.type === 'ADD' ? asAmount(data.amount) : 0);
        }, 0);
        if (!cancelled) setDressCreditTotal(total);
      } catch (error) {
        console.error('Unable to load credit total for this dress:', error);
        if (!cancelled) setDressCreditTotal(0);
      } finally {
        if (!cancelled) setDressCreditLoading(false);
      }
    };
    loadDressCreditTotal();
    return () => { cancelled = true; };
  }, [userData?.branchCode, product?.id, product?.lastCreditNoteAt, product?.creditNoteCount]);

  // Keep the assigned partner selected and locked. Match by ID first, then phone,
  // and fall back to the partner snapshot stored on the product document.
  useEffect(() => {
    if (!hasExistingCustomerLink || !product) return;
    const matched = customers.find((customer) =>
      (linkedCustomerId && customer.id === linkedCustomerId) ||
      (linkedCustomerMobile && normalizePhone(customer.phone) === normalizePhone(linkedCustomerMobile))
    );
    const fallbackPhone = String(linkedCustomerMobile || '');
    setSelectedCustomer(matched || {
      id: linkedCustomerId || (normalizePhone(fallbackPhone) || ''),
      name: linkedCustomerName || 'Existing customer',
      phone: fallbackPhone,
      email: product.partnerEmail || product.partner?.email || '',
    });
    setCustomerSearch(linkedCustomerName || linkedCustomerMobile || 'Existing customer');
  }, [hasExistingCustomerLink, product, customers, linkedCustomerId, linkedCustomerName, linkedCustomerMobile]);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers.slice(0, 8);
    const digits = normalizePhone(term);
    return customers.filter((customer) => {
      const nameMatch = String(customer.name || '').toLowerCase().includes(term);
      const phoneMatch = digits && normalizePhone(customer.phone).includes(digits);
      const emailMatch = String(customer.email || '').toLowerCase().includes(term);
      return nameMatch || phoneMatch || emailMatch;
    }).slice(0, 12);
  }, [customers, customerSearch]);

  if (productLoading) {
    return <div className="pp-page pp-page--missing"><div className="pp-missing-card"><div className="pp-icon-bubble"><FaHandshake /></div><h2>Loading dress details…</h2><p>Checking the latest partnership assignment.</p></div></div>;
  }

  if (!product) {
    return (
      <div className="pp-page pp-page--missing">
        <div className="pp-missing-card">
          <div className="pp-icon-bubble"><FaHandshake /></div>
          <h2>No dress selected</h2>
          <p>Open this page from a dress in the Product Dashboard so the action is linked to the correct product.</p>
          <button className="pp-btn pp-btn--primary" onClick={() => navigate(-1)}><FaArrowLeft /> Go back</button>
        </div>
      </div>
    );
  }

  const branchCode = userData?.branchCode;
  const handleSave = async (event) => {
    event.preventDefault();
    if (!branchCode) return toast.error('Branch code is missing. Cannot save this record.');
    if (!selectedCustomer) return toast.error('Please search and select a customer first.');
    if (!selectedCustomer.id) return toast.error('This linked customer has no customer document ID. Find the customer profile in this branch or correct the saved customer reference before saving.');
    if (!selectedCustomer.phone) return toast.error('The selected customer has no mobile number.');

    if (actionType === 'partnership') {
      const percentage = Number(commission);
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return toast.error('Enter a commission percentage from 0 to 100.');
      }
      if (hasExistingPartner) {
        const samePartner = (existingPartnerId && selectedCustomer.id === existingPartnerId) ||
          (existingPartnerMobile && normalizePhone(selectedCustomer.phone) === normalizePhone(existingPartnerMobile));
        if (!samePartner) {
          return toast.error('This dress already has a partner. The assigned customer cannot be changed.');
        }
      }
    } else {
      const amount = Number(creditAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return toast.error('Enter a valid credit amount greater than zero.');
      }
    }

    setSaving(true);
    try {
      const productRef = doc(db, `products/${branchCode}/products`, product.id);
      const latestProductSnap = await getDoc(productRef);
      if (!latestProductSnap.exists()) throw new Error('This dress no longer exists.');
      const latestProduct = latestProductSnap.data();
      const latestPartnerId = latestProduct.partnerId || latestProduct.partner?.id || latestProduct.partner?.customerId || '';
      const latestPartnerMobile = latestProduct.partnerMobile || latestProduct.partner?.mobile || latestProduct.partner?.phone || '';
      const latestLinkedId = latestPartnerId || latestProduct.lastCreditNoteCustomerId || latestProduct.creditNoteCustomerId || '';
      const latestLinkedMobile = latestPartnerMobile || latestProduct.lastCreditNoteMobile || latestProduct.creditNoteCustomerMobile || '';
      const latestLinkedName = latestProduct.partnerName || latestProduct.partner?.name || latestProduct.lastCreditNoteCustomerName || latestProduct.creditNoteCustomerName || '';
      if (latestLinkedId || latestLinkedMobile || latestLinkedName) {
        const sameCustomer = (latestLinkedId && String(selectedCustomer.id) === String(latestLinkedId)) ||
          (latestLinkedMobile && normalizePhone(selectedCustomer.phone) === normalizePhone(latestLinkedMobile));
        if (!sameCustomer) {
          throw new Error('This dress is already linked to another customer through a partnership or credit note. Only the existing customer can be used.');
        }
      }
      const customerName = selectedCustomer.name || 'Customer';
      const customerPhone = String(selectedCustomer.phone);
      const actor = userData?.email || userData?.name || 'unknown';

      if (actionType === 'partnership') {
        // Keep the product as the source of truth, and mirror assigned products
        // onto the partner's customer document for quick partner-wise listings.
        // The transaction prevents two users from assigning different partners
        // to the same product at the same time.
        const customerRef = doc(db, `customers/${branchCode}/users`, selectedCustomer.id);
        const productCode = String(product.productCode || product.id);
        const productName = String(product.productName || product.name || 'Unnamed product');
        const commissionPercentage = Number(commission);

        await runTransaction(db, async (transaction) => {
          const freshProductSnap = await transaction.get(productRef);
          if (!freshProductSnap.exists()) throw new Error('This dress no longer exists.');
          const freshProduct = freshProductSnap.data();
          const freshPartnerId = freshProduct.partnerId || freshProduct.partner?.id || freshProduct.partner?.customerId || '';
          const freshPartnerMobile = freshProduct.partnerMobile || freshProduct.partner?.mobile || freshProduct.partner?.phone || '';
          const freshLinkedId = freshPartnerId || freshProduct.lastCreditNoteCustomerId || freshProduct.creditNoteCustomerId || '';
          const freshLinkedMobile = freshPartnerMobile || freshProduct.lastCreditNoteMobile || freshProduct.creditNoteCustomerMobile || '';
          const freshLinkedName = freshProduct.partnerName || freshProduct.partner?.name || freshProduct.lastCreditNoteCustomerName || freshProduct.creditNoteCustomerName || '';
          const hasFreshLink = Boolean(freshLinkedId || freshLinkedMobile || freshLinkedName);
          const sameCustomer = (freshLinkedId && String(selectedCustomer.id) === String(freshLinkedId)) ||
            (freshLinkedMobile && normalizePhone(customerPhone) === normalizePhone(freshLinkedMobile));

          if (hasFreshLink && !sameCustomer) {
            throw new Error('This dress is already linked to another customer through a partnership or credit note. Only the existing customer can be used.');
          }

          const customerSnap = await transaction.get(customerRef);
          const customerData = customerSnap.exists() ? customerSnap.data() : {};
          const oldPartnerProducts = Array.isArray(customerData.partnerProducts) ? customerData.partnerProducts : [];
          const partnerProducts = oldPartnerProducts.filter((entry) => String(entry?.productId || '') !== String(product.id));
          const now = new Date();
          const createdAt = freshProduct.partnershipCreatedAt || now;
          partnerProducts.push({
            productId: String(product.id),
            productCode,
            productName,
            branchCode: String(branchCode),
            commissionPercentage,
            partnershipStatus: 'active',
            assignedAt: createdAt,
            updatedAt: now,
          });

          const oldProductIds = Array.isArray(customerData.partnerProductIds) ? customerData.partnerProductIds.map(String) : [];
          const oldProductCodes = Array.isArray(customerData.partnerProductCodes) ? customerData.partnerProductCodes.map(String) : [];
          const partnerProductIds = Array.from(new Set([...oldProductIds.filter((id) => id !== String(product.id)), String(product.id)]));
          const partnerProductCodes = Array.from(new Set([...oldProductCodes.filter((code) => code !== productCode), productCode]));
          transaction.update(productRef, {
            partnerId: selectedCustomer.id,
            partnerName: customerName,
            partnerMobile: customerPhone,
            partnerEmail: selectedCustomer.email || '',
            partnerCommissionPercentage: commissionPercentage,
            partnerProductCode: productCode,
            partnershipStatus: 'active',
            partnershipCreatedAt: createdAt,
            partnershipUpdatedAt: serverTimestamp(),
            partnershipUpdatedBy: actor,
          });

          // Merge preserves any existing customer profile fields. If a legacy
          // product has a partner snapshot but no customer doc, this creates a
          // minimal profile snapshot at the selected customer's document ID.
          transaction.set(customerRef, {
            name: customerData.name || customerData.Name || customerName,
            phone: String(customerData.phone || customerData.mobileNumber || customerPhone),
            email: customerData.email || selectedCustomer.email || '',
            isPartner: true,
            partnerProductIds,
            partnerProductCodes,
            partnerProducts,
            partnerUpdatedAt: serverTimestamp(),
          }, { merge: true });
        });
        toast.success('Partnership and customer partner list saved.');
      } else {
        // Credit notes use an append-only transaction history. The aggregate branch
        // credit-note document keeps the customer's running balance, while each
        // credit addition is also recorded under both the customer and the product.
        const amountToAdd = Number(creditAmount);
        const creditNotesRef = collection(db, `products/${branchCode}/creditNotes`);
        const existingQuery = query(creditNotesRef, where('mobileNumber', '==', customerPhone));
        const noteText = comment.trim() || `Credit note for ${product.productName || product.productCode || 'dress'}`;
        const productRef = doc(db, `products/${branchCode}/products`, product.id);
        const customerRef = doc(db, `customers/${branchCode}/users`, selectedCustomer.id);
        const newAggregateRef = doc(creditNotesRef);
        const productCreditRef = doc(collection(db, `products/${branchCode}/products/${product.id}/creditNotes`));
        const customerCreditRef = doc(collection(db, `customers/${branchCode}/users/${selectedCustomer.id}/creditNotes`));

        // Firestore web transactions support DocumentReference reads, not Query reads.
        // Query for the existing customer balance before starting the transaction.
        const matchesSnap = await getDocs(existingQuery);

        await runTransaction(db, async (transaction) => {
          // All transaction document reads are completed before any transaction writes.
          const freshProductSnap = await transaction.get(productRef);
          if (!freshProductSnap.exists()) throw new Error('This dress no longer exists.');
          const customerSnap = await transaction.get(customerRef);
          const freshProduct = freshProductSnap.data();
          const customerData = customerSnap.exists() ? customerSnap.data() : {};
          const freshPartnerId = freshProduct.partnerId || freshProduct.partner?.id || freshProduct.partner?.customerId || '';
          const freshPartnerMobile = freshProduct.partnerMobile || freshProduct.partner?.mobile || freshProduct.partner?.phone || '';
          const freshLinkedId = freshPartnerId || freshProduct.lastCreditNoteCustomerId || freshProduct.creditNoteCustomerId || '';
          const freshLinkedMobile = freshPartnerMobile || freshProduct.lastCreditNoteMobile || freshProduct.creditNoteCustomerMobile || '';
          const freshLinkedName = freshProduct.partnerName || freshProduct.partner?.name || freshProduct.lastCreditNoteCustomerName || freshProduct.creditNoteCustomerName || '';
          const hasFreshLink = Boolean(freshLinkedId || freshLinkedMobile || freshLinkedName);
          const sameCustomer = (freshLinkedId && String(selectedCustomer.id) === String(freshLinkedId)) ||
            (freshLinkedMobile && normalizePhone(customerPhone) === normalizePhone(freshLinkedMobile));
          if (hasFreshLink && !sameCustomer) {
            throw new Error('This dress is already linked to another customer through a partnership or credit note. Only the existing customer can receive credit for it.');
          }
          const existingCreditDoc = matchesSnap.empty ? null : matchesSnap.docs[0];
          const aggregateRef = existingCreditDoc ? existingCreditDoc.ref : newAggregateRef;
          const existingData = existingCreditDoc ? existingCreditDoc.data() : {};
          const previousBalance = asAmount(existingData.Balance);
          const newBalance = previousBalance + amountToAdd;
          const productCode = String(freshProduct.productCode || product.productCode || product.id);
          const productName = String(freshProduct.productName || freshProduct.name || product.productName || 'Unnamed product');
          const creditNoteId = existingCreditDoc?.id || newAggregateRef.id;
          const now = serverTimestamp();

          const aggregateData = {
            creditNoteId: existingData.creditNoteId || `CN-${aggregateRef.id}`,
            Name: existingData.Name || customerData.name || customerData.Name || customerName,
            mobileNumber: customerPhone,
            amount: asAmount(existingData.amount) + amountToAdd,
            CreditUsed: asAmount(existingData.CreditUsed),
            Balance: newBalance,
            // Keep the original comment intact; the newest note is separately tracked.
            Comment: existingData.Comment || noteText,
            lastComment: noteText,
            relatedProductId: product.id,
            relatedProductCode: productCode,
            relatedProductName: productName,
            source: 'product_dashboard',
            updatedAt: now,
            updatedBy: actor,
            status: existingData.status || 'active',
          };
          if (!existingCreditDoc) {
            aggregateData.createdAt = now;
            aggregateData.createdBy = actor;
          }
          transaction.set(aggregateRef, aggregateData, { merge: true });

          const immutableEntry = {
            type: 'ADD',
            amount: amountToAdd,
            previousBalance,
            newBalance,
            receiptNo: '',
            orderId: '',
            creditNoteId,
            mobileNumber: customerPhone,
            customerId: selectedCustomer.id,
            customerName,
            branchCode: String(branchCode),
            relatedProductId: product.id,
            relatedProductCode: productCode,
            relatedProductName: productName,
            note: noteText,
            createdAt: now,
            createdBy: actor,
          };

          // Append-only history under the existing branch-level balance document.
          const historyRef = doc(collection(db, `products/${branchCode}/creditNotes/${aggregateRef.id}/history`));
          transaction.set(historyRef, immutableEntry);

          // Mirror this individual credit event under the customer and product.
          // These records are additions, not editable copies of the running balance.
          transaction.set(customerCreditRef, {
            ...immutableEntry,
            aggregateCreditNoteId: aggregateRef.id,
            entryType: 'credit_addition',
          });
          transaction.set(productCreditRef, {
            ...immutableEntry,
            aggregateCreditNoteId: aggregateRef.id,
            entryType: 'credit_addition',
          });

          // Keep quick summaries on the customer and product documents.
          transaction.set(customerRef, {
            name: customerData.name || customerData.Name || customerName,
            phone: String(customerData.phone || customerData.mobileNumber || customerPhone),
            email: customerData.email || selectedCustomer.email || '',
            creditBalance: newBalance,
            hasCreditNote: true,
            lastCreditNoteId: aggregateRef.id,
            lastCreditNoteProductId: String(product.id),
            lastCreditNoteProductCode: productCode,
            lastCreditNoteAmount: amountToAdd,
            lastCreditNoteAt: now,
            lastCreditNoteUpdatedBy: actor,
          }, { merge: true });

          transaction.update(productRef, {
            creditNoteCount: asAmount(freshProduct.creditNoteCount) + 1,
            lastCreditNoteId: aggregateRef.id,
            lastCreditNoteCustomerId: selectedCustomer.id,
            lastCreditNoteCustomerName: customerName,
            lastCreditNoteMobile: customerPhone,
            creditNoteCustomerId: freshProduct.creditNoteCustomerId || selectedCustomer.id,
            creditNoteCustomerName: freshProduct.creditNoteCustomerName || customerName,
            creditNoteCustomerMobile: freshProduct.creditNoteCustomerMobile || customerPhone,
            lastCreditNoteAmount: amountToAdd,
            lastCreditNoteProductCode: productCode,
            lastCreditNoteAt: now,
            lastCreditNoteUpdatedBy: actor,
          });
        });
        toast.success('Credit added. Customer, dress, balance and credit history saved together.');
      }

      window.setTimeout(() => navigate(-1), 900);
    } catch (error) {
      console.error('Unable to save product customer action:', error);
      toast.error(error?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`pp-layout ${sidebarOpen ? 'pp-layout--sidebar-open' : ''}`}>
      <ToastContainer position="bottom-right" autoClose={3200} />
      <UserSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((value) => !value)} />
      <main className="pp-main">
        <UserHeader onMenuClick={() => setSidebarOpen((value) => !value)} isSidebarOpen={sidebarOpen} />
        <div className="pp-content">
          <button className="pp-back-link" onClick={() => navigate(-1)}><FaArrowLeft /> Product Dashboard</button>

          <section className="pp-hero">
            <div className="pp-hero-copy">
              <span className="pp-eyebrow">PRODUCT RELATIONSHIP</span>
              <h1>Customer &amp; dress setup</h1>
              <p>Choose one customer and decide whether to issue a credit note or set up a partnership for this dress.</p>
            </div>
            <div className="pp-hero-icon"><FaHandshake /></div>
          </section>

          <section className="pp-product-card">
            <div className="pp-product-image-wrap">
              <img src={product.imageUrls?.[0] || product.imageUrl || '/placeholder.png'} alt={product.productName || 'Selected dress'} />
            </div>
            <div className="pp-product-info">
              <span className="pp-eyebrow">SELECTED DRESS</span>
              <h2>{product.productName || 'Unnamed product'}</h2>
              <p>{product.brandName || 'No brand'} <span>•</span> Code: {product.productCode || product.id}</p>
              <div className="pp-product-stats">
                <div><span>Rental price</span><strong>₹{asAmount(product.price).toLocaleString('en-IN')}</strong></div>
                <div><span>Security deposit</span><strong>₹{asAmount(product.deposit).toLocaleString('en-IN')}</strong></div>
              </div>
              {hasExistingCustomerLink && (
                <div className="pp-existing-partner pp-existing-partner--locked">
                  <FaUserCheck />
                  <div><strong>{hasExistingPartner ? 'Partner assigned — customer locked' : 'Credit customer linked — customer locked'}</strong><span>{linkedCustomerName || linkedCustomerMobile || linkedCustomerId || 'Existing customer'}</span>{linkedCustomerMobile && <span>{linkedCustomerMobile}</span>}</div>
                  {product.partnerCommissionPercentage != null && <span>{product.partnerCommissionPercentage}% commission</span>}
                  {hasExistingCustomerLink && (
                    <div className="pp-credit-summary" aria-label="Credit for this dress">
                      <span><strong>Credit given for this dress:</strong> {dressCreditLoading ? 'Loading…' : `₹${dressCreditTotal.toLocaleString('en-IN')}`}</span>
                      {product.lastCreditNoteAmount != null && <span>Last credit added: ₹{asAmount(product.lastCreditNoteAmount).toLocaleString('en-IN')}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <form className="pp-workspace" onSubmit={handleSave}>
            <section className="pp-panel pp-customer-panel">
              <div className="pp-panel-heading">
                <div className="pp-step">01</div>
                <div><h2>Find a customer</h2><p>Search by name, mobile number or email.</p></div>
              </div>
              {hasExistingCustomerLink ? (
                <div className="pp-partner-lock-notice"><FaUserCheck /><div><strong>{hasExistingPartner ? 'This dress already has a partner' : 'This dress already has a linked credit customer'}</strong><span>The customer is fixed and cannot be changed from this page.</span></div></div>
              ) : (
                <>
                  <label className="pp-field-label" htmlFor="pp-customer-search">Customer search</label>
                  <div className="pp-search-box"><FaSearch /><input id="pp-customer-search" value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setSelectedCustomer(null); }} placeholder="Enter customer name or mobile number" autoComplete="off" /></div>
                </>
              )}

              {selectedCustomer && (
                <div className="pp-selected-customer">
                  <div className="pp-avatar">{String(selectedCustomer.name || 'C').trim().charAt(0).toUpperCase()}</div>
                  <div className="pp-selected-customer-info"><strong>{selectedCustomer.name || 'Customer'}</strong><span>{selectedCustomer.phone}</span>{selectedCustomer.email && <span>{selectedCustomer.email}</span>}</div>
                  <FaCheckCircle className="pp-selected-check" />
                  {!hasExistingCustomerLink && <button type="button" className="pp-clear-customer" onClick={() => setSelectedCustomer(null)}>Change</button>}
                </div>
              )}

              {!hasExistingCustomerLink && !selectedCustomer && (
                <div className="pp-customer-results">
                  {customersLoading ? <div className="pp-empty-state">Loading branch customers…</div> : filteredCustomers.length ? filteredCustomers.map((customer) => (
                    <button type="button" className="pp-customer-result" key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerSearch(customer.name || customer.phone); }}>
                      <span className="pp-avatar">{String(customer.name || 'C').trim().charAt(0).toUpperCase()}</span>
                      <span className="pp-customer-result-info"><strong>{customer.name || 'Customer'}</strong><small>{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</small></span>
                      <span className="pp-select-label">Select</span>
                    </button>
                  )) : <div className="pp-empty-state">{customerSearch.trim() ? 'No matching customers found in this branch.' : 'No customer profiles found for this branch.'}</div>}
                </div>
              )}
              <p className="pp-helper-note">Customers are loaded from <code>customers/{branchCode || '{branchCode}'}/users</code>.</p>
            </section>

            <section className="pp-panel pp-action-panel">
              <div className="pp-panel-heading">
                <div className="pp-step">02</div>
                <div><h2>Choose an action</h2><p>{hasExistingCustomerLink ? 'The linked customer is locked. You can update the commission or add more credit for this same customer.' : 'Select how this customer is linked to the dress.'}</p></div>
              </div>
              <div className="pp-choice-grid">
                <button type="button" className={`pp-choice-card ${actionType === 'partnership' ? 'is-active' : ''}`} onClick={() => setActionType('partnership')}>
                  <span className="pp-choice-icon pp-choice-icon--partner"><FaHandshake /></span>
                  <strong>Partnership</strong><small>Assign one partner and set their commission.</small>
                  <span className="pp-choice-radio" />
                </button>
                <button type="button" className={`pp-choice-card ${actionType === 'creditNote' ? 'is-active' : ''}`} onClick={() => setActionType('creditNote')}>
                  <span className="pp-choice-icon pp-choice-icon--credit"><FaWallet /></span>
                  <strong>Credit Note</strong><small>Add credit to the customer’s branch credit balance.</small>
                  <span className="pp-choice-radio" />
                </button>
              </div>

              {actionType === 'partnership' ? (
                <div className="pp-detail-box">
                  <label className="pp-field-label" htmlFor="pp-commission">Partner commission</label>
                  <div className="pp-input-with-suffix"><input id="pp-commission" type="number" min="0" max="100" step="0.01" value={commission} onChange={(event) => setCommission(event.target.value)} required /><span>%</span></div>
                  <p className="pp-helper-note">One partner is allowed per dress. The commission is saved on the product and mirrored to the customer’s partnerProducts list; payouts are not calculated here yet.</p>
                </div>
              ) : (
                <div className="pp-detail-box">
                  <label className="pp-field-label" htmlFor="pp-credit-amount">Credit amount (₹)</label>
                  <input className="pp-text-input" id="pp-credit-amount" type="number" min="0.01" step="0.01" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="Enter amount to add" required />
                  <label className="pp-field-label pp-label-spaced" htmlFor="pp-credit-comment">Comment (optional)</label>
                  <textarea className="pp-text-input pp-textarea" id="pp-credit-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={`Why is credit being added for ${product.productName || 'this dress'}?`} rows="3" />
                  <p className="pp-helper-note">Existing credit notes are matched by mobile number. New credits are added to the current balance and recorded in history.</p>
                </div>
              )}

              <div className="pp-form-footer">
                <button type="button" className="pp-btn pp-btn--secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
                <button type="submit" className="pp-btn pp-btn--primary" disabled={saving || customersLoading || !selectedCustomer}>
                  {saving ? 'Saving…' : actionType === 'partnership' && hasExistingPartner ? <><FaHandshake /> Update commission</> : actionType === 'partnership' ? <><FaHandshake /> Save partnership</> : <><FaWallet /> Save credit note</>}
                </button>
              </div>
            </section>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProductPartnerPage;
