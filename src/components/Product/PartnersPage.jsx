import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useUser } from '../Auth/UserContext';
import UserHeader from '../UserDashboard/UserHeader';
import UserSidebar from '../UserDashboard/UserSidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaSearch, FaHandshake, FaCheckCircle, FaClock, FaUser, FaSyncAlt,
  FaBoxOpen, FaClipboardList, FaTimes, FaExternalLinkAlt, FaImage,
  FaRegCreditCard, FaPercent, FaEye, FaBan,
} from 'react-icons/fa';
import './PartnersPage.css';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const normalize = (value) => String(value || '').trim().toLowerCase();
const partnerIdOf = (p) => p?.partnerId || p?.partner?.id || p?.partner?.customerId || '';
const statusOf = (p) => normalize(p?.partnershipStatus || p?.partnerStatus || (partnerIdOf(p) ? 'active' : 'pending'));
const dateLabel = (value) => {
  if (!value) return '—';
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return '—'; }
};
const statusLabel = (status) => ({ submitted: 'Submitted', under_review: 'Under review', approved: 'Offer sent', accepted: 'Accepted', rejected: 'Rejected', active: 'Active', pending: 'Pending approval' }[normalize(status)] || status || 'Unknown');

export default function PartnersPage() {
  const { userData } = useUser();
  const branchCode = String(userData?.branchCode || '').trim();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('submissions');
  const [partnerTab, setPartnerTab] = useState('all');
  const [requestTab, setRequestTab] = useState('all');
  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [savingKey, setSavingKey] = useState('');
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewForm, setReviewForm] = useState({ approvedRentalPrice: '', approvedCreditAmount: '', adminNotes: '', ownerSharePercent: '30', dorSharePercent: '70' });
  const [photoIndex, setPhotoIndex] = useState(0);

  const loadData = useCallback(async (quiet = false) => {
    if (!branchCode) { setLoading(false); return; }
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [productsSnap, customersSnap, requestsSnap] = await Promise.all([
        getDocs(collection(db, `products/${branchCode}/products`)),
        getDocs(collection(db, `customers/${branchCode}/users`)),
        getDocs(collection(db, `products/${branchCode}/dressRentalRequests`)),
      ]);

      const normalizePhone = (value) => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      const customers = customersSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
      const customerById = new Map(customers.map((customer) => [String(customer.id), customer]));
      const customerByPhone = new Map();
      customers.forEach((customer) => {
        const phone = normalizePhone(customer.mobileNumber || customer.phone || customer.mobile || customer.id);
        if (phone && !customerByPhone.has(phone)) customerByPhone.set(phone, customer);
      });

      const grouped = new Map();
      const ensurePartner = ({ customerId, customer, name, mobile, email }) => {
        const normalizedMobile = normalizePhone(mobile || customer?.mobileNumber || customer?.phone || customer?.mobile || '');
        const id = String(customerId || customer?.id || '');
        const key = id || (normalizedMobile ? `phone:${normalizedMobile}` : `unlinked:${normalize(name)}`);
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            customerId: id || customer?.id || '',
            name: name || customer?.name || customer?.fullName || customer?.customerName || 'Unnamed partner',
            mobile: mobile || customer?.mobileNumber || customer?.phone || customer?.mobile || '',
            email: email || customer?.email || '',
            customer: customer || null,
            products: [],
            status: 'active',
            totalCredit: Number(customer?.creditBalance || 0),
          });
        } else {
          const entry = grouped.get(key);
          if (!entry.customer && customer) entry.customer = customer;
          if (!entry.customerId && (id || customer?.id)) entry.customerId = id || customer.id;
          if ((!entry.name || entry.name === 'Unnamed partner') && name) entry.name = name;
          if (!entry.mobile && mobile) entry.mobile = mobile;
          if (!entry.email && (email || customer?.email)) entry.email = email || customer.email;
          entry.totalCredit = Number(entry.customer?.creditBalance || entry.totalCredit || 0);
        }
        return grouped.get(key);
      };

      // First collect established revenue-share partnerships from product records.
      const productRows = productsSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }));
      productRows.forEach((product) => {
        const pid = String(partnerIdOf(product) || '');
        const embedded = product.partner || {};
        const customer = customerById.get(pid) || null;
        const name = product.partnerName || embedded.name || customer?.name || customer?.fullName || customer?.customerName || '';
        const mobile = product.partnerMobile || embedded.mobile || embedded.phone || customer?.mobileNumber || customer?.phone || customer?.mobile || '';
        if (!pid && !product.partnerName && !product.partnerMobile && !product.partner) return;
        const partner = ensurePartner({ customerId: pid, customer, name: name || 'Unnamed partner', mobile, email: product.partnerEmail || customer?.email || '' });
        if (!partner.products.some((item) => String(item.id) === String(product.id))) {
          partner.products.push({ ...product, partnerStatus: statusOf(product), isCreditNotePartner: false });
        }
        const status = statusOf(product);
        if (['pending', 'requested', 'awaiting_approval'].includes(status)) partner.status = 'pending';
        else if (partner.status !== 'pending' && ['rejected', 'inactive', 'removed'].includes(status)) partner.status = 'rejected';
      });

      // Credit-note partners are derived ONLY from the per-dress credit history.
      // We intentionally do not scan branch-wide aggregate creditNotes, because those
      // documents contain customer balances and can include signup rewards/unrelated credits.
      const histories = await Promise.all(productRows.map(async (product) => {
        try {
          const historySnap = await getDocs(collection(db, `products/${branchCode}/products/${product.id}/creditNotes`));
          return { product, entries: historySnap.docs.map((snap) => ({ id: snap.id, ...snap.data() })) };
        } catch (error) {
          console.error(`Unable to load credit history for product ${product.id}:`, error);
          return { product, entries: [] };
        }
      }));

      histories.forEach(({ product, entries }) => {
        const qualifying = entries.filter((entry) => {
          const isAddition = entry.entryType === 'credit_addition' || entry.type === 'ADD';
          const linkedProductId = String(entry.relatedProductId || entry.productId || '');
          return isAddition && linkedProductId === String(product.id);
        });
        if (!qualifying.length) return;

        // All entries in this product's subcollection are tied to this dress, but
        // require an explicit customer ID or mobile so we never invent an owner link.
        const byCustomer = new Map();
        qualifying.forEach((entry) => {
          const phone = normalizePhone(entry.mobileNumber || entry.phone || '');
          const customer = (entry.customerId && customerById.get(String(entry.customerId))) || (phone && customerByPhone.get(phone)) || null;
          const customerId = String(entry.customerId || customer?.id || '');
          if (!customerId && !phone) return;
          const key = customerId || `phone:${phone}`;
          if (!byCustomer.has(key)) byCustomer.set(key, { customer, customerId, phone, amount: 0 });
          byCustomer.get(key).amount += Number(entry.amount || 0);
        });

        byCustomer.forEach(({ customer, customerId, phone, amount }) => {
          const partner = ensurePartner({
            customerId,
            customer,
            name: customer?.name || customer?.Name || customer?.fullName || qualifying.find((entry) => String(entry.customerId || '') === customerId)?.customerName || 'Credit-note customer',
            mobile: customer?.mobileNumber || customer?.phone || customer?.mobile || phone,
            email: customer?.email || '',
          });
          const existingProduct = partner.products.find((item) => String(item.id) === String(product.id));
          if (existingProduct) {
            existingProduct.isCreditNotePartner = true;
            existingProduct.creditAmount = Number(existingProduct.creditAmount || 0) + amount;
            existingProduct.creditNoteEntries = (existingProduct.creditNoteEntries || 0) + qualifying.length;
          } else {
            partner.products.push({
              id: String(product.id),
              productCode: product.productCode || product.code || product.id,
              productName: product.productName || product.name || product.title || product.brandName || 'Dress',
              brandName: product.brandName || '',
              partnerCommissionPercentage: Number(product.partnerCommissionPercentage || 0),
              partnerStatus: 'active',
              isCreditNotePartner: true,
              creditAmount: amount,
              creditNoteEntries: qualifying.length,
            });
          }
        });
      });

      // Include customer records that already explicitly identify themselves as partners.
      customers.forEach((customer) => {
        const hasPartnerData = Boolean(customer.isPartner || customer.partnerStatus || customer.partnershipStatus || customer.partnerProducts?.length);
        if (!hasPartnerData) return;
        const status = normalize(customer.partnershipStatus || customer.partnerStatus || (customer.isPartner ? 'active' : 'pending'));
        const items = Array.isArray(customer.partnerProducts) ? customer.partnerProducts : [];
        const partner = ensurePartner({
          customerId: customer.id,
          customer,
          name: customer.name || customer.fullName || customer.customerName || 'Unnamed partner',
          mobile: customer.mobileNumber || customer.phone || customer.mobile || '',
          email: customer.email || '',
        });
        items.forEach((item, index) => {
          const productId = String(item.productId || item.id || item.productCode || `partner-product-${index}`);
          if (partner.products.some((existing) => String(existing.id) === productId)) return;
          partner.products.push({
            ...item,
            id: productId,
            productCode: item.productCode || item.code || '',
            productName: item.productName || item.name || item.title || 'Dress',
            partnerCommissionPercentage: Number(item.commissionPercentage ?? item.partnerCommissionPercentage ?? 0),
            partnerStatus: normalize(item.partnershipStatus || item.status || status || 'active'),
            isCreditNotePartner: false,
          });
        });
        if (['pending', 'requested', 'awaiting_approval', 'submitted'].includes(status)) partner.status = 'pending';
        else if (['rejected', 'declined'].includes(status)) partner.status = 'rejected';
      });

      const reqs = requestsSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() })).sort((a, b) => {
        const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return bt - at;
      });
      setPartners(Array.from(grouped.values()).filter((partner) => partner.products.length > 0).sort((a, b) => a.name.localeCompare(b.name)));
      setRequests(reqs);
    } catch (error) {
      console.error('Unable to load partner data:', error);
      toast.error('Could not load partner data. Check Firestore rules and the branch code.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [branchCode]);

  useEffect(() => { loadData(); }, [loadData]);

  const partnerCounts = useMemo(() => ({ all: partners.length, pending: partners.filter((p) => p.status === 'pending').length, active: partners.filter((p) => p.status === 'active').length, rejected: partners.filter((p) => p.status === 'rejected').length }), [partners]);
  const requestCounts = useMemo(() => ({ all: requests.length, submitted: requests.filter((r) => ['submitted', 'under_review'].includes(normalize(r.status))).length, approved: requests.filter((r) => ['approved', 'offer_sent'].includes(normalize(r.status))).length, accepted: requests.filter((r) => ['accepted', 'active'].includes(normalize(r.status)) || r.offerAccepted === true).length, rejected: requests.filter((r) => normalize(r.status) === 'rejected').length }), [requests]);
  const visiblePartners = useMemo(() => {
    const q = normalize(search);
    return partners.filter((p) => (partnerTab === 'all' || (partnerTab === 'pending' ? p.status === 'pending' : partnerTab === 'active' ? p.status === 'active' : p.status === 'rejected')) && (!q || [p.name, p.mobile, p.email, ...p.products.map((x) => x.productCode || x.code || x.name || x.productName || x.id)].join(' ').toLowerCase().includes(q)));
  }, [partners, search, partnerTab]);
  const visibleRequests = useMemo(() => {
    const q = normalize(search);
    return requests.filter((r) => {
      const status = normalize(r.status || 'submitted');
      const matchesTab = requestTab === 'all' || (requestTab === 'submitted' ? ['submitted', 'under_review'].includes(status) : requestTab === 'approved' ? ['approved', 'offer_sent'].includes(status) : requestTab === 'accepted' ? ['accepted', 'active'].includes(status) || r.offerAccepted === true : status === 'rejected');
      return matchesTab && (!q || [r.dressName, r.ownerPhone, r.category, r.size, r.condition, r.preferredModel, r.requestId, r.description].join(' ').toLowerCase().includes(q));
    });
  }, [requests, search, requestTab]);

  const openReview = (request) => {
    setReviewRequest(request);
    setPhotoIndex(0);
    setReviewForm({
      approvedRentalPrice: request.approvedRentalPrice == null ? '' : String(request.approvedRentalPrice),
      approvedCreditAmount: request.approvedCreditAmount == null ? '' : String(request.approvedCreditAmount),
      adminNotes: request.adminNotes || '',
      ownerSharePercent: String(request.ownerSharePercent ?? 30),
      dorSharePercent: String(request.dorSharePercent ?? 70),
    });
  };

  const updateRequest = async (decision) => {
    if (!reviewRequest || !branchCode) return;
    const key = reviewRequest.id;
    const model = normalize(reviewRequest.preferredModel);
    if (decision === 'approved') {
      if (model === 'revenue_share') {
        const ownerShare = Number(reviewForm.ownerSharePercent);
        const dorShare = Number(reviewForm.dorSharePercent);
        if (!Number.isFinite(ownerShare) || !Number.isFinite(dorShare) || ownerShare < 0 || dorShare < 0 || ownerShare + dorShare !== 100) return toast.error('Owner and Dor shares must add up to 100%.');
      } else {
        if (reviewForm.approvedCreditAmount.trim() === '' || !Number.isFinite(Number(reviewForm.approvedCreditAmount)) || Number(reviewForm.approvedCreditAmount) < 0) return toast.error('Enter a valid approved credit amount.');
      }
      if (reviewForm.approvedRentalPrice.trim() === '' || !Number.isFinite(Number(reviewForm.approvedRentalPrice)) || Number(reviewForm.approvedRentalPrice) < 0) return toast.error('Enter a valid rental price.');
    }
    setSavingKey(key);
    try {
      const ref = doc(db, `products/${branchCode}/dressRentalRequests`, key);
      const patch = {
        status: decision,
        adminNotes: reviewForm.adminNotes.trim() || null,
        updatedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
      };
      if (decision === 'approved') {
        patch.approvedRentalPrice = Number(reviewForm.approvedRentalPrice);
        patch.offerAccepted = false;
        if (model === 'revenue_share') {
          patch.ownerSharePercent = Number(reviewForm.ownerSharePercent);
          patch.dorSharePercent = Number(reviewForm.dorSharePercent);
          patch.approvedCreditAmount = null;
        } else {
          patch.approvedCreditAmount = Number(reviewForm.approvedCreditAmount);
          patch.ownerSharePercent = null;
          patch.dorSharePercent = null;
        }
      }
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('This submission no longer exists. Refresh and try again.');
        tx.update(ref, patch);
      });
      toast.success(decision === 'approved' ? 'Offer saved and marked as sent. The dress is not activated until the owner accepts.' : 'Dress submission rejected.');
      setReviewRequest(null);
      await loadData(true);
    } catch (error) {
      console.error('Unable to update dress submission:', error);
      toast.error(error.message || 'Could not update the submission.');
    } finally { setSavingKey(''); }
  };

  const approvePartner = async (partner) => {
    if (!branchCode || !partner.customerId) return toast.error('This partner has no customer document ID. Cannot approve safely.');
    const pendingProducts = partner.products.filter((p) => ['pending', 'requested', 'awaiting_approval'].includes(statusOf(p)));
    setSavingKey(partner.id);
    try {
      await runTransaction(db, async (tx) => {
        const customerRef = doc(db, `customers/${branchCode}/users`, partner.customerId);
        const customerSnap = await tx.get(customerRef);
        if (!customerSnap.exists()) throw new Error('Partner customer document was not found.');
        const productRefs = pendingProducts.map((p) => doc(db, `products/${branchCode}/products`, p.id));
        const productSnaps = [];
        for (const ref of productRefs) productSnaps.push(await tx.get(ref));
        const customerData = customerSnap.data();
        const oldEntries = Array.isArray(customerData.partnerProducts) ? customerData.partnerProducts : [];
        const approvedIds = new Set(pendingProducts.map((p) => String(p.id)));
        const partnerProducts = oldEntries.map((entry) => approvedIds.has(String(entry.productId || entry.id)) ? { ...entry, partnershipStatus: 'active', updatedAt: new Date().toISOString() } : entry);
        tx.set(customerRef, { isPartner: true, partnerStatus: 'active', partnershipStatus: 'active', partnerApprovedAt: serverTimestamp(), partnerProducts }, { merge: true });
        productSnaps.forEach((snap, index) => {
          if (!snap.exists()) return;
          const productRef = productRefs[index]; const latest = snap.data(); const currentPartnerId = partnerIdOf(latest);
          if (currentPartnerId && String(currentPartnerId) !== String(partner.customerId)) throw new Error(`Product ${latest.productCode || latest.code || snap.id} is assigned to another customer.`);
          tx.update(productRef, { partnerId: partner.customerId, partnershipStatus: 'active', partnerApprovedAt: serverTimestamp(), partnerUpdatedAt: serverTimestamp() });
        });
      });
      toast.success('Partner approved successfully.');
      await loadData(true);
    } catch (error) { console.error('Unable to approve partner:', error); toast.error(error.message || 'Could not approve partner.'); }
    finally { setSavingKey(''); }
  };

  const renderRequestCard = (request) => {
    const status = normalize(request.status || 'submitted');
    const images = Array.isArray(request.imageUrls) ? request.imageUrls : [];
    const isRevenue = normalize(request.preferredModel) === 'revenue_share';
    return <article className="partner-request-card" key={request.id}>
      <div className="partner-request-image">{images[0] ? <img src={images[0]} alt={request.dressName || 'Submitted dress'} /> : <div className="partner-request-no-image"><FaImage /></div>}{images.length > 1 && <span>+{images.length - 1} photos</span>}</div>
      <div className="partner-request-body">
        <div className="partner-card-top"><div><h3>{request.dressName || 'Untitled dress'}</h3><p>{request.ownerPhone || 'No owner phone'} · Submitted {dateLabel(request.createdAt)}</p></div><span className={`partner-status status-${status}`}>{statusLabel(status)}</span></div>
        <div className="partner-request-tags"><span>{request.category || 'No category'}</span><span>Size: {request.size || '—'}</span><span>{request.condition || 'Condition not set'}</span><span className={isRevenue ? 'model-revenue' : 'model-credit'}>{isRevenue ? <FaPercent /> : <FaRegCreditCard />} {isRevenue ? `Revenue share · ${request.ownerSharePercent ?? 30}% owner` : 'Dor credit note'}</span></div>
        {request.description && <p className="partner-request-description">{request.description}</p>}
        <div className="partner-request-bottom">{request.approvedRentalPrice != null && <span>Rental price: <strong>{money(request.approvedRentalPrice)}</strong></span>}{!isRevenue && request.approvedCreditAmount != null && <span>Approved credit: <strong>{money(request.approvedCreditAmount)}</strong></span>}{request.offerAccepted === true && <span className="accepted-note"><FaCheckCircle /> Owner accepted offer</span>}</div>
      </div>
      <button className="partner-review-button" onClick={() => openReview(request)}><FaEye /> Review</button>
    </article>;
  };

  return <div className="partners-page">
    <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className="partners-main">
      <UserHeader onMenuClick={() => setSidebarOpen((v) => !v)} />
      <main className="partners-content">
        <div className="partners-heading">
          <div><div className="partners-eyebrow"><FaHandshake /> DOR PARTNER MANAGEMENT</div><h1>Dress Submissions & Partners</h1><p>Review dresses submitted from the customer app, confirm rental terms, and manage established partner relationships.</p></div>
          <button className="partners-refresh" onClick={() => loadData(true)} disabled={refreshing}><FaSyncAlt className={refreshing ? 'partners-spin' : ''} /> Refresh</button>
        </div>
        {!branchCode && <div className="partners-warning">Your account does not have a branch code. Select/configure a branch before loading submissions.</div>}
        <div className="partners-section-switch"><button className={section === 'submissions' ? 'active' : ''} onClick={() => { setSection('submissions'); setSearch(''); }}><FaClipboardList /> Dress submissions <b>{requestCounts.all}</b></button><button className={section === 'partners' ? 'active' : ''} onClick={() => { setSection('partners'); setSearch(''); }}><FaHandshake /> Partners <b>{partnerCounts.all}</b></button></div>
        {section === 'submissions' ? <>
          <div className="partners-stats request-stats">
            <button className={requestTab === 'all' ? 'is-selected' : ''} onClick={() => setRequestTab('all')}><span className="partners-stat-icon"><FaClipboardList /></span><span><small>All submissions</small><strong>{requestCounts.all}</strong></span></button>
            <button className={requestTab === 'submitted' ? 'is-selected' : ''} onClick={() => setRequestTab('submitted')}><span className="partners-stat-icon pending"><FaClock /></span><span><small>Needs review</small><strong>{requestCounts.submitted}</strong></span></button>
            <button className={requestTab === 'approved' ? 'is-selected' : ''} onClick={() => setRequestTab('approved')}><span className="partners-stat-icon active"><FaCheckCircle /></span><span><small>Offer sent</small><strong>{requestCounts.approved}</strong></span></button>
            <button className={requestTab === 'accepted' ? 'is-selected' : ''} onClick={() => setRequestTab('accepted')}><span className="partners-stat-icon accepted"><FaHandshake /></span><span><small>Accepted</small><strong>{requestCounts.accepted}</strong></span></button>
          </div>
          <div className="partners-toolbar"><div className="partners-search"><FaSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dress, owner phone, category or request ID..." /></div><span>{visibleRequests.length} result{visibleRequests.length === 1 ? '' : 's'}</span></div>
          {loading ? <div className="partners-state">Loading dress submissions…</div> : visibleRequests.length === 0 ? <div className="partners-empty"><span><FaClipboardList /></span><h3>No dress submissions found</h3><p>{requestTab === 'submitted' ? 'New customer-app submissions will appear here for review.' : 'Try another search or select a different status.'}</p></div> : <div className="partner-requests-list">{visibleRequests.map(renderRequestCard)}</div>}
          <p className="partners-footnote">Source: <code>products/{branchCode || '{branchCode}'}/dressRentalRequests</code>. Reviewing a request updates its status and offer fields only. This page does not create an active rental listing or issue a credit note automatically.</p>
        </> : <>
          <div className="partners-stats">
            <button className={partnerTab === 'all' ? 'is-selected' : ''} onClick={() => setPartnerTab('all')}><span className="partners-stat-icon"><FaHandshake /></span><span><small>All partners</small><strong>{partnerCounts.all}</strong></span></button>
            <button className={partnerTab === 'pending' ? 'is-selected' : ''} onClick={() => setPartnerTab('pending')}><span className="partners-stat-icon pending"><FaClock /></span><span><small>Pending approval</small><strong>{partnerCounts.pending}</strong></span></button>
            <button className={partnerTab === 'active' ? 'is-selected' : ''} onClick={() => setPartnerTab('active')}><span className="partners-stat-icon active"><FaCheckCircle /></span><span><small>Connected</small><strong>{partnerCounts.active}</strong></span></button>
            <button className={partnerTab === 'rejected' ? 'is-selected' : ''} onClick={() => setPartnerTab('rejected')}><span className="partners-stat-icon rejected"><FaUser /></span><span><small>Rejected / inactive</small><strong>{partnerCounts.rejected}</strong></span></button>
          </div>
          <div className="partners-toolbar"><div className="partners-search"><FaSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partner, phone, email or dress code..." /></div><span>{visiblePartners.length} result{visiblePartners.length === 1 ? '' : 's'}</span></div>
          {loading ? <div className="partners-state">Loading partners…</div> : visiblePartners.length === 0 ? <div className="partners-empty"><span><FaHandshake /></span><h3>No partners found</h3><p>{partnerTab === 'pending' ? 'There are no partner records waiting for approval.' : 'Try another search or select a different status.'}</p></div> : <div className="partners-list">
            {visiblePartners.map((partner) => <article className="partner-card" key={partner.id}><div className="partner-avatar">{String(partner.name || 'P').trim().charAt(0).toUpperCase()}</div><div className="partner-card-body"><div className="partner-card-top"><div><h3>{partner.name}</h3><p>{partner.mobile || 'No mobile number'}{partner.email ? ` · ${partner.email}` : ''}</p></div><span className={`partner-status status-${partner.status}`}>{partner.status === 'active' ? 'Connected' : partner.status === 'pending' ? 'Pending approval' : partner.status}</span></div><div className="partner-card-meta"><span><FaBoxOpen /> {partner.products.length} connected dress{partner.products.length === 1 ? '' : 'es'}</span>{partner.products.length > 0 && partner.products.some((p) => !p.isCreditNotePartner) && <span>Commission: {(partner.products.filter((p) => !p.isCreditNotePartner).reduce((sum, p) => sum + (Number(p.partnerCommissionPercentage) || 0), 0) / partner.products.filter((p) => !p.isCreditNotePartner).length).toFixed(1)}% avg.</span>}{partner.products.some((p) => p.isCreditNotePartner && Number(p.creditAmount) > 0) && <span>Credit given for dress: {money(partner.products.filter((p) => p.isCreditNotePartner).reduce((sum, p) => sum + (Number(p.creditAmount) || 0), 0))}</span>}</div>{partner.products.length > 0 && <div className="partner-products">{partner.products.map((product) => <div className="partner-product-row" key={product.id}><div><strong>{product.productName || product.name || product.title || product.brandName || 'Dress'}</strong><small>Code: {product.productCode || product.code || product.id}</small></div><span>{product.isCreditNotePartner ? `Credit ${money(product.creditAmount)}` : `${Number(product.partnerCommissionPercentage) || 0}%`}</span><em className={`partner-product-status status-${product.partnerStatus}`}>{product.partnerStatus === 'active' ? 'Connected' : product.partnerStatus}</em></div>)}</div>}</div>{partner.status === 'pending' && <button className="partner-approve" onClick={() => approvePartner(partner)} disabled={savingKey === partner.id}>{savingKey === partner.id ? 'Approving…' : <><FaCheckCircle /> Approve</>}</button>}</article>)}
          </div>}
          <p className="partners-footnote">Partnerships are loaded from product/customer records. Credit-note partners are included only when the dress-specific credit history explicitly links the credit to that dress and customer. Dress submissions are managed separately in the first tab.</p>
        </>}
      </main>
    </div>

    {reviewRequest && <div className="partner-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewRequest(null); }}><section className="partner-review-modal" role="dialog" aria-modal="true" aria-labelledby="partner-review-title">
      <div className="partner-modal-header"><div><span className="partners-eyebrow">DRESS SUBMISSION REVIEW</span><h2 id="partner-review-title">{reviewRequest.dressName || 'Untitled dress'}</h2><p>Request ID: {reviewRequest.id}</p></div><button className="partner-modal-close" onClick={() => setReviewRequest(null)} aria-label="Close"><FaTimes /></button></div>
      <div className="partner-review-content">
        <div className="partner-review-gallery">{(Array.isArray(reviewRequest.imageUrls) ? reviewRequest.imageUrls : []).length ? <><img className="partner-review-main-image" src={reviewRequest.imageUrls[Math.min(photoIndex, reviewRequest.imageUrls.length - 1)]} alt="Dress submission" />{reviewRequest.imageUrls.length > 1 && <div className="partner-review-thumbs">{reviewRequest.imageUrls.map((url, index) => <button key={url} className={index === photoIndex ? 'selected' : ''} onClick={() => setPhotoIndex(index)}><img src={url} alt={`Dress photo ${index + 1}`} /></button>)}</div>}</> : <div className="partner-review-no-photo"><FaImage /> No photos uploaded</div>}</div>
        <div className="partner-review-details"><div><small>Owner mobile</small><strong>{reviewRequest.ownerPhone || '—'}</strong></div><div><small>Submitted</small><strong>{dateLabel(reviewRequest.createdAt)}</strong></div><div><small>Category / size</small><strong>{reviewRequest.category || '—'} / {reviewRequest.size || '—'}</strong></div><div><small>Condition</small><strong>{reviewRequest.condition || '—'}</strong></div><div className="wide"><small>Description</small><p>{reviewRequest.description || 'No description provided.'}</p></div><div className="wide"><small>Requested model</small><strong>{normalize(reviewRequest.preferredModel) === 'revenue_share' ? 'Revenue sharing' : 'Dor credit note'}</strong></div></div>
        <div className="partner-review-form"><h3>Commercial offer</h3><p>Set terms for the owner. Saving an offer marks it as sent; it does not activate the listing or create a credit note.</p>
          <label>Approved rental price (₹)<input type="number" min="0" step="1" value={reviewForm.approvedRentalPrice} onChange={(e) => setReviewForm((f) => ({ ...f, approvedRentalPrice: e.target.value }))} placeholder="Enter rental price" /></label>
          {normalize(reviewRequest.preferredModel) === 'revenue_share' ? <div className="partner-form-two"><label>Owner share (%)<input type="number" min="0" max="100" value={reviewForm.ownerSharePercent} onChange={(e) => setReviewForm((f) => ({ ...f, ownerSharePercent: e.target.value }))} /></label><label>Dor share (%)<input type="number" min="0" max="100" value={reviewForm.dorSharePercent} onChange={(e) => setReviewForm((f) => ({ ...f, dorSharePercent: e.target.value }))} /></label></div> : <label>Approved credit note amount (₹)<input type="number" min="0" step="1" value={reviewForm.approvedCreditAmount} onChange={(e) => setReviewForm((f) => ({ ...f, approvedCreditAmount: e.target.value }))} placeholder="Enter credit amount" /></label>}
          <label>Admin notes (optional)<textarea rows="3" value={reviewForm.adminNotes} onChange={(e) => setReviewForm((f) => ({ ...f, adminNotes: e.target.value }))} placeholder="Condition notes, pickup details, terms..." /></label>
        </div>
      </div>
      <div className="partner-modal-actions"><button className="partner-reject-button" onClick={() => updateRequest('rejected')} disabled={savingKey === reviewRequest.id}><FaBan /> Reject submission</button><span className="partner-modal-spacer" /><button className="partner-cancel-button" onClick={() => setReviewRequest(null)} disabled={savingKey === reviewRequest.id}>Cancel</button><button className="partner-save-offer" onClick={() => updateRequest('approved')} disabled={savingKey === reviewRequest.id}>{savingKey === reviewRequest.id ? 'Saving…' : <><FaCheckCircle /> Save & send offer</>}</button></div>
    </section></div>}
    <ToastContainer position="top-right" autoClose={3500} />
  </div>;
}
