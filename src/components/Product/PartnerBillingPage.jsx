import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, doc, getDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { useUser } from '../Auth/UserContext';
import UserHeader from '../UserDashboard/UserHeader';
import UserSidebar from '../UserDashboard/UserSidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaArrowLeft, FaSearch, FaSyncAlt, FaHandshake, FaRupeeSign,
  FaReceipt, FaClock, FaCheckCircle, FaExternalLinkAlt, FaImage,
  FaCreditCard, FaCalendarAlt, FaFileInvoiceDollar,
} from 'react-icons/fa';
import './PartnerBillingPage.css';

const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const norm = (v) => String(v ?? '').trim().toLowerCase();
const num = (...values) => {
  for (const value of values) if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
};
const dateValue = (value) => value?.toDate ? value.toDate() : value ? new Date(value) : null;
const dateLabel = (value) => { const d = dateValue(value); return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };
const typeOf = (p) => {
  const value = norm(p?.partnershipType || p?.partnerType || p?.partnershipModel || p?.preferredModel);
  if (['revenue_share', 'revenue-share', 'revenue share', 'commission'].includes(value)) return 'revenue_share';
  return value === 'credit_note' || value === 'credit-note' || value === 'credit note' || value === 'creditnote' ? 'credit_note' : '';
};
const activeProduct = (p) => typeOf(p) === 'revenue_share' && ![false, 'false', 0].includes(p.isPartnershipActive) && ![false, 'false', 0].includes(p.partnershipActive) && !['inactive', 'paused', 'suspended', 'ended', 'terminated', 'removed', 'rejected'].includes(norm(p.partnershipStatus || p.partnerStatus || 'active'));
const partnerIdOf = (p) => String(p.partnerId || p.partner?.id || p.partner?.customerId || '');
const productName = (p) => p.productName || p.name || p.title || p.brandName || 'Partner product';
const productCode = (p) => String(p.productCode || p.code || p.id || '');
const receiptOf = (b) => String(b.receiptNumber || b.receiptNo || b.paymentReceiptNumber || '');
const linesOf = (payment) => {
  for (const key of ['productsSummary', 'products', 'items', 'productDetails', 'bookingProducts', 'lineItems']) {
    if (Array.isArray(payment?.[key])) return payment[key];
  }
  return [];
};
const matchesLine = (line, product) => {
  const ids = [line.productId, line.id, line.productDocId, line.product?.id].filter((v) => v != null).map(String);
  const codes = [line.productCode, line.code, line.product?.productCode, line.product?.code].filter((v) => v != null).map(String);
  return ids.includes(String(product.id)) || codes.some((c) => c === productCode(product));
};
const getProductRent = (payment, booking, product) => {
  const lines = linesOf(payment);
  const line = lines.find((x) => matchesLine(x, product));
  const quantity = Math.max(1, num(line?.quantity, line?.qty, booking.quantity) || 1);
  const base = num(
    line?.baseRent, line?.grandTotalRent, line?.totalRent, line?.rentBeforeDiscount,
    line?.rent, line?.price, line?.unitRent != null ? Number(line.unitRent) * quantity : null,
    booking.baseRent, booking.productBaseRent, booking.grandTotalRent,
    booking.totalRent, booking.rentBeforeDiscount, booking.rent, booking.price
  );
  const explicitLineDiscount = num(line?.discount, line?.discountAmount, line?.discountOnRent, line?.rentDiscount,
    booking.discount, booking.discountAmount, booking.discountOnRent, booking.productDiscount);
  const billDiscount = num(payment?.totalDiscount, payment?.discountTotal, payment?.discountAmount,
    payment?.discount, payment?.total_discount, payment?.discountOnRent);
  // If the receipt only stores one bill-level discount, split it evenly across
  // its product lines (e.g. ₹500 across 5 products = ₹100 per product).
  const hasLineDiscount = lines.some((x) => num(x.discount, x.discountAmount, x.discountOnRent, x.rentDiscount) != null);
  const allocatedBillDiscount = explicitLineDiscount != null
    ? Math.max(0, explicitLineDiscount)
    : (!hasLineDiscount && billDiscount != null && lines.length > 0 ? Math.max(0, billDiscount / lines.length) : 0);
  const explicitNet = num(line?.netRent, line?.finalRent, line?.rentAfterDiscount,
    booking.netRent, booking.finalRent, booking.rentAfterDiscount, booking.netMatchedRent);
  if (base != null || explicitNet != null) {
    const net = explicitNet != null ? explicitNet : Math.max(0, (base || 0) - allocatedBillDiscount);
    return { matched: Boolean(line), line: line || null, baseRent: base, discount: allocatedBillDiscount, netRent: net, quantity, fallback: !line };
  }
  return { matched: false, line: null, baseRent: null, discount: allocatedBillDiscount, netRent: null, quantity };
};

export default function PartnerBillingPage() {
  const { userData } = useUser();
  const branchCode = String(userData?.branchCode || '').trim();
  const queryParams = new URLSearchParams(window.location.search);
  const requestedPartnerId = queryParams.get('partnerId') || '';
  const requestedPartnerMobile = queryParams.get('partnerMobile') || '';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [partners, setPartners] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settlement, setSettlement] = useState({ method: 'bank_transfer', reference: '', notes: '' });
  const [allocationAmounts, setAllocationAmounts] = useState({});
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const loadData = useCallback(async (quiet = false) => {
    if (!branchCode) { setLoading(false); return; }
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      const [productsSnap, customersSnap, settlementsSnap] = await Promise.all([
        getDocs(collection(db, `products/${branchCode}/products`)),
        getDocs(collection(db, `customers/${branchCode}/users`)),
        getDocs(collection(db, `products/${branchCode}/partnerSettlements`)),
      ]);
      const customerMap = new Map(customersSnap.docs.map((s) => [s.id, { id: s.id, ...s.data() }]));
      const settlementDocs = settlementsSnap.docs.map((s) => ({ id: s.id, ...s.data() }));
      const groups = new Map();
      const eligibleProducts = productsSnap.docs.map((s) => ({ id: s.id, ...s.data() })).filter(activeProduct);

      for (const product of eligibleProducts) {
        const partnerId = partnerIdOf(product);
        const embedded = product.partner || {};
        const customer = customerMap.get(partnerId);
        const name = product.partnerName || embedded.name || customer?.name || customer?.fullName || customer?.customerName || 'Unnamed partner';
        const key = partnerId || String(product.partnerMobile || embedded.mobile || embedded.phone || customer?.mobileNumber || customer?.phone || `product:${product.id}`);
        if (!groups.has(key)) groups.set(key, { id: key, customerId: partnerId || customer?.id || '', name, mobile: product.partnerMobile || embedded.mobile || embedded.phone || customer?.mobileNumber || customer?.phone || '', email: product.partnerEmail || customer?.email || '', products: [], bookings: [], settlements: [] });
        const group = groups.get(key);
        if (!group.products.some((p) => p.id === product.id)) group.products.push({ ...product, ownerSharePercent: num(product.ownerSharePercent, product.partnerCommissionPercentage, product.commissionPercentage) ?? 30, dorSharePercent: num(product.dorSharePercent) ?? (100 - (num(product.ownerSharePercent, product.partnerCommissionPercentage, product.commissionPercentage) ?? 30)) });
      }

      // Keep the requested partner visible even if none of their products pass
      // the active revenue-share filter. This prevents a deep link from looking
      // broken when the profile exists but the partnership is inactive/credit-note.
      const digits = (value) => String(value ?? '').replace(/\D/g, '');
      if (requestedPartnerId || requestedPartnerMobile) {
        const requestedCustomer = [...customerMap.values()].find((customer) => {
          const ids = [customer.id, customer.customerId, customer.userId, customer.uid].filter(Boolean).map(String);
          const mobiles = [customer.mobileNumber, customer.mobile, customer.phone, customer.phoneNumber, customer.whatsappNumber].filter(Boolean);
          return (requestedPartnerId && ids.includes(String(requestedPartnerId))) ||
            (requestedPartnerMobile && mobiles.some((m) => digits(m) === digits(requestedPartnerMobile))) ||
            (requestedPartnerId && mobiles.some((m) => digits(m) === digits(requestedPartnerId)));
        });
        if (requestedCustomer) {
          const existing = [...groups.values()].find((g) =>
            String(g.customerId || g.id) === String(requestedCustomer.id) ||
            (requestedPartnerMobile && digits(g.mobile) === digits(requestedPartnerMobile))
          );
          if (!existing) {
            const customerKey = String(requestedCustomer.customerId || requestedCustomer.id || requestedPartnerId || requestedPartnerMobile);
            groups.set(customerKey, {
              id: customerKey,
              customerId: String(requestedCustomer.id || requestedCustomer.customerId || ''),
              name: requestedCustomer.name || requestedCustomer.fullName || requestedCustomer.customerName || requestedCustomer.displayName || 'Partner',
              mobile: requestedCustomer.mobileNumber || requestedCustomer.mobile || requestedCustomer.phone || requestedCustomer.phoneNumber || requestedPartnerMobile,
              email: requestedCustomer.email || '',
              products: [], bookings: [], settlements: [],
            });
          }
        }
      }

      const bookingRows = await Promise.all(eligibleProducts.map(async (product) => {
        try {
          const snap = await getDocs(collection(db, `products/${branchCode}/products/${product.id}/bookings`));
          return snap.docs.map((d) => ({ id: d.id, ...d.data(), _product: product }));
        } catch (e) { console.warn('Unable to load bookings for partner product', product.id, e); return []; }
      }));
      const allBookings = bookingRows.flat();
      const receipts = [...new Set(allBookings.map(receiptOf).filter(Boolean))];
      const paymentPairs = await Promise.all(receipts.map(async (receipt) => {
        try {
          const snap = await getDoc(doc(db, `products/${branchCode}/payments`, receipt));
          return [receipt, snap.exists() ? { id: snap.id, ...snap.data() } : null];
        } catch (e) { console.warn('Unable to load receipt', receipt, e); return [receipt, null]; }
      }));
      const paymentByReceipt = new Map(paymentPairs);
      const seen = new Set();
      for (const row of allBookings) {
        const product = row._product;
        const group = [...groups.values()].find((candidate) => candidate.products.some((p) => String(p.id) === String(product.id)));
        if (!group) continue;
        const receiptNumber = receiptOf(row);
        const payment = receiptNumber ? paymentByReceipt.get(receiptNumber) : null;
        const uniqueKey = `${group.id}|${product.id}|${receiptNumber || row.id}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);
        const rent = getProductRent(payment || {}, row, product);
        const ownerPct = num(product.ownerSharePercent, product.partnerCommissionPercentage, product.commissionPercentage) ?? 30;
        const dorPct = num(product.dorSharePercent) ?? (100 - ownerPct);
        const partnerRevenue = rent.netRent == null ? null : Math.max(0, rent.netRent * ownerPct / 100);
        const dorRevenue = rent.netRent == null ? null : Math.max(0, rent.netRent * dorPct / 100);
        const status = norm(row.stage || row.bookingStage || row.status || row.userDetails?.stage || payment?.bookingStage || 'unknown');
        group.bookings.push({ id: row.id, receiptNumber, productId: product.id, productName: productName(product), productCode: productCode(product), booking: row, payment, ...rent, ownerSharePercent: ownerPct, dorSharePercent: dorPct, partnerRevenue, dorRevenue, status, createdAt: row.createdAt || payment?.createdAt || row.bookingDate || null, pickupDate: row.pickupDate || payment?.pickupDate || null, returnDate: row.returnDate || payment?.returnDate || null, paymentFound: Boolean(payment) });
      }
      groups.forEach((group) => {
        group.settlements = settlementDocs.filter((s) => String(s.partnerId || s.partnerKey || '') === String(group.customerId || group.id) || (s.partnerMobile && s.partnerMobile === group.mobile));
        const paidByBooking = new Map();
        group.settlements.filter((s) => norm(s.status) === 'paid' || norm(s.status) === 'completed').forEach((s) => {
          (Array.isArray(s.allocations) ? s.allocations : []).forEach((a) => {
            const key = `${a.productId}|${a.receiptNumber}`;
            paidByBooking.set(key, (paidByBooking.get(key) || 0) + (Number(a.amount) || 0));
          });
        });
        group.bookings = group.bookings.map((b) => {
          const paid = paidByBooking.get(`${b.productId}|${b.receiptNumber}`) || 0;
          const total = b.partnerRevenue;
          return { ...b, paidAmount: paid, pendingAmount: total == null ? null : Math.max(0, total - paid) };
        }).sort((a, b) => (dateValue(b.createdAt)?.getTime() || 0) - (dateValue(a.createdAt)?.getTime() || 0));
        group.totalPending = group.bookings.reduce((sum, b) => sum + (Number(b.pendingAmount) || 0), 0);
        group.totalRevenue = group.bookings.reduce((sum, b) => sum + (Number(b.partnerRevenue) || 0), 0);
        group.totalPaid = group.bookings.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
        group.unmatchedCount = group.bookings.filter((b) => b.partnerRevenue == null).length;
      });
      const result = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
      setPartners(result);
      // Deep-link from PartnersPage: select the exact partner by ID, then use
      // mobile as a fallback for legacy partner records grouped by phone.
      const requested = result.find((p) =>
        (requestedPartnerId && [String(p.id), String(p.customerId || '')].includes(String(requestedPartnerId))) ||
        (requestedPartnerMobile && digits(p.mobile) === digits(requestedPartnerMobile)) ||
        (requestedPartnerId && digits(p.mobile) === digits(requestedPartnerId))
      );
      setSelectedId((current) => requested?.id || (current && result.some((p) => p.id === current) ? current : ''));
    } catch (error) {
      console.error('Unable to load partner billing:', error);
      toast.error('Could not load partner billing. Check Firestore rules and the branch code.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [branchCode, requestedPartnerId, requestedPartnerMobile]);

  useEffect(() => { loadData(); }, [loadData]);
  const visiblePartners = useMemo(() => {
    const q = norm(search);
    return partners.filter((p) => !q || [p.name, p.mobile, p.email, ...p.products.map((x) => productName(x)), ...p.products.map((x) => productCode(x))].join(' ').toLowerCase().includes(q));
  }, [partners, search]);
  const selectedPartner = partners.find((p) => p.id === selectedId) || null;
  const pendingTotal = partners.reduce((s, p) => s + p.totalPending, 0);
  const dueBookingCount = partners.reduce((s, p) => s + p.bookings.filter((b) => Number(b.pendingAmount) > 0).length, 0);

  const openSettlement = () => {
    if (!selectedPartner) return;
    setSettlement({ method: 'bank_transfer', reference: '', notes: '' });
    setAllocationAmounts({});
    setScreenshotFile(null);
    setSettlementOpen(true);
  };

  const selectedAllocations = selectedPartner ? selectedPartner.bookings
    .filter((b) => Number(b.pendingAmount) > 0 && b.partnerRevenue != null)
    .map((b) => ({ booking: b, amount: Math.max(0, Number(allocationAmounts[`${b.productId}|${b.receiptNumber}`] || 0)) }))
    .filter((x) => x.amount > 0) : [];
  const settlementAmount = selectedAllocations.reduce((sum, x) => sum + x.amount, 0);

  const saveSettlement = async () => {
    if (!branchCode || !selectedPartner) return;
    if (!selectedAllocations.length || settlementAmount <= 0) return toast.error('Allocate a payment amount to at least one pending receipt.');
    for (const { booking, amount } of selectedAllocations) {
      if (!booking.receiptNumber) return toast.error(`Receipt number is missing for ${booking.productName}; this line cannot be settled safely.`);
      if (amount - Number(booking.pendingAmount || 0) > 0.009) return toast.error(`Allocation exceeds pending amount for receipt ${booking.receiptNumber}.`);
    }
    if (settlementAmount - selectedPartner.totalPending > 0.009) return toast.error('Allocation exceeds the partner’s total pending balance.');
    if (!settlement.reference.trim() && settlement.method !== 'cash') return toast.error('Enter the UTR / transaction reference.');
    if (!screenshotFile) return toast.error('Upload a payment screenshot/proof before recording the settlement.');
    if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(screenshotFile.type || '') && !/\.(png|jpe?g|webp|heic|heif)$/i.test(screenshotFile.name)) return toast.error('Choose an image file for payment proof.');
    if (screenshotFile.size > 10 * 1024 * 1024) return toast.error('Screenshot must be 10 MB or smaller.');

    setSaving(true);
    setUploadingScreenshot(true);
    try {
      const safeName = screenshotFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const proofRef = storageRef(getStorage(), `partnerSettlementProofs/${branchCode}/${selectedPartner.customerId || selectedPartner.id}/${Date.now()}_${safeName}`);
      await uploadBytes(proofRef, screenshotFile, { contentType: screenshotFile.type || 'image/jpeg' });
      const screenshotUrl = await getDownloadURL(proofRef);
      setUploadingScreenshot(false);
      const allocations = selectedAllocations.map(({ booking, amount }) => ({
        receiptNumber: booking.receiptNumber,
        bookingId: booking.id,
        productId: booking.productId,
        productCode: booking.productCode,
        productName: booking.productName,
        baseRent: booking.baseRent,
        discount: booking.discount,
        netRent: booking.netRent,
        ownerSharePercent: booking.ownerSharePercent,
        dorSharePercent: booking.dorSharePercent,
        partnerRevenue: booking.partnerRevenue,
        previouslyPaid: booking.paidAmount || 0,
        pendingBeforePayment: booking.pendingAmount,
        amount: Number(amount.toFixed(2)),
      }));
      await addDoc(collection(db, `products/${branchCode}/partnerSettlements`), {
        schemaVersion: 2,
        branchCode,
        partnerId: selectedPartner.customerId || selectedPartner.id,
        partnerKey: selectedPartner.id,
        partnerName: selectedPartner.name,
        partnerMobile: selectedPartner.mobile || '',
        amount: Number(settlementAmount.toFixed(2)),
        currency: 'INR',
        method: settlement.method,
        reference: settlement.reference.trim(),
        screenshotUrl,
        screenshotPath: proofRef.fullPath,
        screenshotName: screenshotFile.name,
        screenshotContentType: screenshotFile.type || 'image/jpeg',
        notes: settlement.notes.trim(),
        status: 'paid',
        allocations,
        bookingCount: allocations.length,
        recordedBy: userData?.email || userData?.name || userData?.uid || 'admin',
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      toast.success('Payment proof saved and payment allocated to the selected receipt/product lines.');
      setSettlementOpen(false);
      setScreenshotFile(null);
      setAllocationAmounts({});
      await loadData(true);
    } catch (error) {
      console.error('Partner settlement save failed:', error);
      toast.error(error.message || 'Could not save settlement. Check Firebase Storage and Firestore rules.');
    } finally { setSaving(false); setUploadingScreenshot(false); }
  };

  return <div className="partner-billing-page">
    <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className="partner-billing-main"><UserHeader onMenuClick={() => setSidebarOpen((v) => !v)} />
      <main className="partner-billing-content">
        {selectedPartner ? <>
          <button className="pb-back" onClick={() => { setSelectedId(''); window.history.replaceState({}, '', window.location.pathname); }}><FaArrowLeft /> All partners</button>
          <div className="pb-detail-hero"><div className="pb-avatar">{selectedPartner.name.trim().charAt(0).toUpperCase()}</div><div className="pb-hero-copy"><span className="pb-eyebrow"><FaHandshake /> PARTNER BILLING PROFILE</span><h1>{selectedPartner.name}</h1><p>{selectedPartner.mobile || 'No mobile number'}{selectedPartner.email ? ` · ${selectedPartner.email}` : ''}</p><div className="pb-tags"><span>{selectedPartner.products.length} active revenue-share product(s)</span><span>Only revenue-share partnerships included</span></div></div><button className="pb-primary" onClick={openSettlement} disabled={selectedPartner.totalPending <= 0}><FaCreditCard /> Record payout</button></div>
          <div className="pb-stat-grid"><div className="pb-stat"><span>Total partner revenue</span><strong>{money(selectedPartner.totalRevenue)}</strong><small>30% / configured owner share, product-level</small></div><div className="pb-stat pb-stat-warning"><span>Pending payout</span><strong>{money(selectedPartner.totalPending)}</strong><small>{selectedPartner.bookings.filter((b) => (b.pendingAmount || 0) > 0).length} receipt line(s) with balance</small></div><div className="pb-stat pb-stat-success"><span>Recorded as paid</span><strong>{money(selectedPartner.totalPaid)}</strong><small>From saved settlement allocations</small></div><div className="pb-stat"><span>Bookings / receipts</span><strong>{selectedPartner.bookings.length}</strong><small>{selectedPartner.unmatchedCount} needs rent matching</small></div></div>
          <section className="pb-panel"><div className="pb-panel-heading"><div><h2>Booking & receipt ledger</h2><p>Commission is calculated only on this partner’s connected product net rent—not the full bill.</p></div><span className="pb-count">{selectedPartner.bookings.length} bookings</span></div>
            {selectedPartner.bookings.length === 0 ? <div className="pb-empty"><FaReceipt /><h3>No bookings found</h3><p>Bookings are discovered from each connected product’s bookings subcollection.</p></div> : <div className="pb-table-wrap"><table className="pb-table"><thead><tr><th>Receipt / Date</th><th>Partner product</th><th>Base rent</th><th>Discount</th><th>Net product rent</th><th>Partner share</th><th>Paid</th><th>Pending</th><th>Match</th></tr></thead><tbody>{selectedPartner.bookings.map((b) => <tr key={`${b.productId}-${b.receiptNumber || b.id}`}><td>{b.receiptNumber ? <a className="pb-receipt-link" href={`/booking-details/${encodeURIComponent(b.receiptNumber)}`} onClick={(e) => { e.preventDefault(); window.location.assign(`/booking-details/${encodeURIComponent(b.receiptNumber)}`); }} title="Open booking details"><strong>{b.receiptNumber}</strong></a> : <strong>No receipt</strong>}<small>{dateLabel(b.createdAt)}</small><small className="pb-muted">{b.status}</small></td><td><strong>{b.productName}</strong><small>{b.productCode}</small></td><td>{b.baseRent == null ? '—' : money(b.baseRent)}</td><td>{money(b.discount)}</td><td>{b.netRent == null ? 'Needs match' : money(b.netRent)}</td><td>{b.partnerRevenue == null ? '—' : <><strong>{money(b.partnerRevenue)}</strong><small>{b.ownerSharePercent}% of net rent</small></>}</td><td>{money(b.paidAmount)}</td><td className={(b.pendingAmount || 0) > 0 ? 'pb-due' : ''}>{b.pendingAmount == null ? '—' : money(b.pendingAmount)}</td><td><span className={`pb-match ${b.matched ? 'matched' : 'unmatched'}`}>{b.matched ? 'Product line' : b.paymentFound ? 'Booking fallback' : 'No rent data'}</span></td></tr>)}</tbody></table></div>}
          </section>
          <section className="pb-panel"><div className="pb-panel-heading"><div><h2>Settlement history</h2><p>Each settlement is allocated against specific receipt/product lines and stores proof/reference details.</p></div></div>
            {selectedPartner.settlements.length === 0 ? <div className="pb-empty compact"><FaFileInvoiceDollar /><p>No settlements recorded for this partner yet.</p></div> : <div className="pb-settlement-list">{selectedPartner.settlements.sort((a,b) => (dateValue(b.recordedAt || b.createdAt)?.getTime() || 0) - (dateValue(a.recordedAt || a.createdAt)?.getTime() || 0)).map((s) => <article className="pb-settlement-card" key={s.id}><div className="pb-settlement-icon"><FaCheckCircle /></div><div className="pb-settlement-body"><strong>{money(s.amount)} <span className="pb-paid-badge">{s.status || 'paid'}</span></strong><p>{s.method || 'Payment'} · Ref: {s.reference || '—'}</p><small>{dateLabel(s.recordedAt || s.createdAt)} · {s.bookingCount || s.allocations?.length || 0} receipt allocation(s)</small>{s.notes && <p>{s.notes}</p>}{s.screenshotUrl && <a href={s.screenshotUrl} target="_blank" rel="noreferrer"><FaImage /> View payment screenshot <FaExternalLinkAlt /></a>}{Array.isArray(s.allocations) && <details><summary>View bill-wise allocation</summary><ul>{s.allocations.map((a, i) => <li key={`${a.receiptNumber}-${a.productId}-${i}`}>{a.receiptNumber || 'No receipt'} · {a.productName || a.productCode || a.productId}: <strong>{money(a.amount)}</strong></li>)}</ul></details>}</div></article>)}</div>}
          </section>
        </> : <>
          <div className="pb-page-heading"><div><span className="pb-eyebrow"><FaFileInvoiceDollar /> DOR PARTNER FINANCE</span><h1>Partner Billing & Payments</h1><p>Review revenue-share partners, pending owner payouts, booking receipts, and bill-wise settlement history.</p></div><button className="pb-refresh" onClick={() => loadData(true)} disabled={refreshing}><FaSyncAlt className={refreshing ? 'pb-spin' : ''} /> Refresh</button></div>
          {!branchCode && <div className="pb-warning">Your account has no branch code configured.</div>}
          <div className="pb-overview-grid"><div className="pb-overview-card"><span><FaHandshake /> Active revenue-share partners</span><strong>{partners.length}</strong><small>Credit-note arrangements excluded</small></div><div className="pb-overview-card"><span><FaClock /> Pending partner payouts</span><strong>{money(pendingTotal)}</strong><small>{dueBookingCount} receipt line(s) due</small></div><div className="pb-overview-card"><span><FaReceipt /> Revenue-share products</span><strong>{partners.reduce((s,p) => s + p.products.length, 0)}</strong><small>Only active revenue-share products</small></div></div>
          <div className="pb-toolbar"><div className="pb-search"><FaSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search partner, mobile, email, product code..." /></div><span>{visiblePartners.length} partner(s)</span></div>
          {loading ? <div className="pb-loading">Loading partner billing ledger…</div> : visiblePartners.length === 0 ? <div className="pb-empty"><FaHandshake /><h3>No active revenue-share partners</h3><p>Only products explicitly marked as active revenue share appear here. Credit-note products are excluded.</p></div> : <div className="pb-partner-grid">{visiblePartners.map((p) => <article className="pb-partner-card" key={p.id}><div className="pb-partner-top"><div className="pb-avatar">{p.name.trim().charAt(0).toUpperCase()}</div><div className="pb-partner-identity"><h3>{p.name}</h3><p>{p.mobile || 'No mobile number'}</p><span>{p.products.length} active revenue product(s)</span></div></div><div className="pb-partner-amounts"><div><small>Pending payout</small><strong className={p.totalPending > 0 ? 'pb-due' : ''}>{money(p.totalPending)}</strong></div><div><small>Lifetime revenue</small><strong>{money(p.totalRevenue)}</strong></div><div><small>Already paid</small><strong>{money(p.totalPaid)}</strong></div></div><div className="pb-product-pills">{p.products.slice(0,3).map((product) => <span key={product.id}>{productName(product)}</span>)}{p.products.length > 3 && <span>+{p.products.length - 3} more</span>}</div>{p.unmatchedCount > 0 && <div className="pb-unmatched-note">{p.unmatchedCount} booking(s) need product-level rent matching and are excluded from revenue totals.</div>}<button className="pb-open-partner" onClick={() => setSelectedId(p.id)}>Open partner details <FaExternalLinkAlt /></button></article>)}</div>}
          <p className="pb-footnote">Data source: <code>products/{branchCode || '{branchCode}'}/products/*/bookings</code>, receipt documents at <code>products/{branchCode || '{branchCode}'}/payments/{'{receiptNumber}'}</code>, and settlement records at <code>products/{branchCode || '{branchCode}'}/partnerSettlements</code>. Revenue totals are product-level only; receipts without a matched product rent are not guessed from bill totals.</p>
        </>}
      </main>
    </div>
    {settlementOpen && selectedPartner && <div className="pb-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setSettlementOpen(false); }}><section className="pb-modal pb-modal-wide"><div className="pb-modal-heading"><div><span className="pb-eyebrow">BILL-WISE PAYOUT</span><h2>Record partner payment</h2><p>{selectedPartner.name} · select exactly which receipt/product balances this payment settles.</p></div><button onClick={() => setSettlementOpen(false)} disabled={saving} aria-label="Close">×</button></div>
      <div className="pb-settlement-callout"><span>Pending available · selected allocation total</span><strong>{money(selectedPartner.totalPending)} · {money(settlementAmount)}</strong><small>Enter an amount against each receipt line. The sum of allocations becomes the payment amount; it cannot exceed any line’s pending balance.</small></div>
      <section className="pb-allocation-picker"><h3>1. Allocate payment bill-wise</h3><p>Only this partner product’s commission is settled. Other products on the same receipt are not included.</p>
        {selectedPartner.bookings.filter((b) => Number(b.pendingAmount) > 0 && b.partnerRevenue != null && b.receiptNumber).length === 0 ? <div className="pb-empty compact">No matched pending receipt lines are available to settle.</div> : <div className="pb-allocation-list">{selectedPartner.bookings.filter((b) => Number(b.pendingAmount) > 0 && b.partnerRevenue != null && b.receiptNumber).map((b) => { const key = `${b.productId}|${b.receiptNumber}`; const allocated = Number(allocationAmounts[key] || 0); return <div className="pb-allocation-row" key={key}><div className="pb-allocation-info"><strong>{b.receiptNumber}</strong><span>{b.productName} · {b.productCode}</span><small>Net rent {money(b.netRent)} × {b.ownerSharePercent}% = partner share {money(b.partnerRevenue)}</small><small>Already paid {money(b.paidAmount)} · Pending {money(b.pendingAmount)}</small></div><label>Allocate ₹<input aria-label={`Allocate for receipt ${b.receiptNumber}`} type="number" min="0" max={b.pendingAmount} step="0.01" value={allocationAmounts[key] ?? ''} onChange={(e) => { const raw = e.target.value; const value = raw === '' ? '' : Math.max(0, Math.min(Number(b.pendingAmount), Number(raw) || 0)); setAllocationAmounts((old) => ({ ...old, [key]: value })); }} placeholder="0.00" /></label></div>; })}</div>}
      </section>
      <div className="pb-payment-total"><span>Payment amount from allocations</span><strong>{money(settlementAmount)}</strong><small>{selectedAllocations.length} receipt/product line(s) selected</small></div>
      <h3 className="pb-form-step-title">2. Payment details</h3>
      <label>Payment method<select value={settlement.method} onChange={(e) => setSettlement((s) => ({ ...s, method: e.target.value }))}><option value="bank_transfer">Bank transfer / NEFT / IMPS</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
      <label>UTR / transaction reference{settlement.method !== 'cash' && <span className="pb-required"> required</span>}<input value={settlement.reference} onChange={(e) => setSettlement((s) => ({ ...s, reference: e.target.value }))} placeholder="Enter transaction ID / UTR / cheque number" /></label>
      <label>Payment screenshot / proof <span className="pb-required">required</span><input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />{screenshotFile && <small className="pb-file-selected"><FaImage /> {screenshotFile.name} · {(screenshotFile.size / 1024 / 1024).toFixed(2)} MB</small>}</label>
      <p className="pb-upload-note"><FaImage /> Screenshot is uploaded to Firebase Storage at settlement time (maximum 10 MB). The saved settlement stores its download URL and storage path.</p>
      <label>Admin notes (optional)<textarea rows="3" value={settlement.notes} onChange={(e) => setSettlement((s) => ({ ...s, notes: e.target.value }))} placeholder="Payment confirmation, bank/account notes, or reason for partial settlement…" /></label>
      <div className="pb-modal-actions"><button className="pb-secondary" onClick={() => setSettlementOpen(false)} disabled={saving}>Cancel</button><button className="pb-primary" onClick={saveSettlement} disabled={saving || settlementAmount <= 0 || !selectedAllocations.length}>{saving ? (uploadingScreenshot ? 'Uploading proof…' : 'Saving payment…') : <><FaCheckCircle /> Record payment & settle selected bills</>}</button></div>
      <p className="pb-settlement-disclaimer">This records a payment you have already made; it does not send a bank/UPI transfer. Firestore/Storage security rules must restrict writes to authorized admins.</p>
    </section></div>}
    <ToastContainer position="top-right" autoClose={3500} />
  </div>;
}
