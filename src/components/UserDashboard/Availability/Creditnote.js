import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  query,
  deleteDoc,
  doc,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useUser } from '../../Auth/UserContext';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import './CreditNoteDashboard.css';
import search from '../../../assets/Search.png';
import { FaUpload, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

const CreditNoteDashboard = () => {
  const [creditNotes, setCreditNotes] = useState([]);
  const [filteredCreditNotes, setFilteredCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const { userData } = useUser();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('');

  /* ================= FETCH ================= */
  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      if (!userData?.branchCode) return;

      const ref = collection(
        db,
        `products/${userData.branchCode}/creditNotes`
      );
      const snapshot = await getDocs(query(ref));

      const data = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || null,
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

      setCreditNotes(data);
      setFilteredCreditNotes(data);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching credit notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, [userData?.branchCode]);

  /* ================= SEARCH ================= */
  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = creditNotes.filter((note) => {
      if (!searchField) return true;
      const value = String(note[searchField] || '').toLowerCase();
      return value.includes(q);
    });
    setFilteredCreditNotes(filtered);
  }, [searchQuery, searchField, creditNotes]);

  /* ================= KPI ================= */
  const kpis = filteredCreditNotes.reduce(
    (acc, n) => {
      acc.total += 1;
      acc.amount += Number(n.amount || 0);
      acc.used += Number(n.CreditUsed || 0);
      acc.balance += Number(n.Balance || 0);
      return acc;
    },
    { total: 0, amount: 0, used: 0, balance: 0 }
  );

  /* ================= IMPORT ================= */
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file || !userData?.branchCode) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const ref = collection(
            db,
            `products/${userData.branchCode}/creditNotes`
          );

          const promises = results.data.map((row) => {
            if (!row.mobileNumber || !row.amount) return null;

            return addDoc(ref, {
              creditNoteId: uuidv4(),
              Name: row.Name || '',
              mobileNumber: row.mobileNumber,
              alternateMobileNumber: row.alternateMobileNumber || '',
              amount: Number(row.amount),
              CreditUsed: Number(row.CreditUsed) || 0,
              Balance:
                Number(row.Balance) ||
                Number(row.amount) - Number(row.CreditUsed || 0),
              Comment: row.Comment || 'N/A',
              status: row.status || 'active',
              createdAt: new Date(),
              createdBy: userData?.email || 'import',
            });
          });

          await Promise.all(promises.filter(Boolean));
          toast.success('Credit notes imported successfully');
          fetchCreditNotes();
        } catch (err) {
          console.error(err);
          toast.error('Import failed');
        } finally {
          setImporting(false);
          e.target.value = '';
        }
      },
    });
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this credit note?')) return;
    try {
      await deleteDoc(
        doc(db, `products/${userData.branchCode}/creditNotes`, id)
      );
      fetchCreditNotes();
      toast.success('Deleted successfully');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="dashboard-content creditnote-page">
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <h2 className="creditnote-title">Credit Note Management</h2>

        {/* KPI */}
        <div className="creditnote-kpi-grid">
          <div className="kpi-card">
            <h4>Total Notes</h4>
            <p>{kpis.total}</p>
          </div>
          <div className="kpi-card">
            <h4>Total Amount</h4>
            <p>₹ {kpis.amount}</p>
          </div>
          <div className="kpi-card">
            <h4>Credit Used</h4>
            <p>₹ {kpis.used}</p>
          </div>
          <div className="kpi-card highlight">
            <h4>Balance</h4>
            <p>₹ {kpis.balance}</p>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="creditnote-toolbar">
          <div className="creditnote-search">
            <img src={search} alt="search" />
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="">Search By</option>
              <option value="Name">Name</option>
              <option value="mobileNumber">Mobile</option>
              <option value="status">Status</option>
            </select>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
            />
          </div>

          <div className="creditnote-actions">
             {userData?.role !== "Subuser" && (
            <button
              className="creditnote-btn primary"
              onClick={() => navigate('/add-credit-note')}
            >
              <FaPlus /> Add
            </button>
             )}

            <button
              className="creditnote-btn secondary"
              onClick={handleImportClick}
              disabled={importing}
            >
              <FaUpload /> {importing ? 'Importing…' : 'Import'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileImport}
            />
          </div>
        </div>

        {/* CARDS */}
        {loading ? (
          <p className="creditnote-loading">Loading…</p>
        ) : (
          <div className="creditnote-card-grid">
            {filteredCreditNotes.map((n) => (
              <div className="creditnote-card" key={n.id}>
                <div className="card-header">
                  <h3>{n.Name}</h3>
                  <span className={`status ${n.status}`}>{n.status}</span>
                </div>

                <div className="card-body">
                  <p><strong>Mobile:</strong> {n.mobileNumber}</p>
                  <p><strong>Amount:</strong> ₹ {n.amount}</p>
                  <p><strong>Used:</strong> ₹ {n.CreditUsed}</p>
                  <p><strong>Balance:</strong> ₹ {n.Balance}</p>
                  <p className="comment">{n.Comment}</p>
                </div>

                <div className="card-actions">
                  <FaEdit onClick={() => navigate(`/edit-credit-note/${n.id}`)} />
                  {userData?.role !== 'Subuser' && (
                    <FaTrash onClick={() => handleDelete(n.id)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <ToastContainer />
      </div>
    </div>
  );
};

export default CreditNoteDashboard;
