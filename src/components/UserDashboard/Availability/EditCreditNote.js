import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useUser } from '../../Auth/UserContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import './GenerateCreditNote.css';
import { useNavigate, useParams } from 'react-router-dom';

const EditCreditNote = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const { userData } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [Name, setName] = useState('');
  const [CreditUsed, setCreditUsed] = useState('');
  const [Balance, setBalance] = useState('');
  const [Comment, setComment] = useState('');
  const navigate = useNavigate();
  const { id } = useParams(); // Retrieve the credit note ID from the URL

  useEffect(() => {
    const fetchCreditNote = async () => {
      if (userData?.branchCode && id) {
        try {
          const creditNoteRef = doc(db, `products/${userData.branchCode}/creditNotes`, id);
          const creditNoteSnap = await getDoc(creditNoteRef);
          if (creditNoteSnap.exists()) {
            const data = creditNoteSnap.data();
            setName(data.Name || '');
            setMobileNumber(data.mobileNumber || '');
            setCreditAmount(data.amount || '');
            setCreditUsed(data.CreditUsed || '');
            setBalance(data.Balance || '');
            setComment(data.Comment || '');
          } else {
            toast.error('Credit note not found.');
            navigate('/usersidebar/creditnote');
          }
        } catch (error) {
          console.error('Error fetching credit note:', error);
          toast.error('Error fetching credit note.');
        }
      }
    };

    fetchCreditNote();
  }, [userData?.branchCode, id, navigate]);

  const handleUpdateCreditNote = async (e) => {
    e.preventDefault();
    if (!mobileNumber || !creditAmount || isNaN(Number(creditAmount)) || Number(creditAmount) <= 0) {
      toast.error('Please enter a valid mobile number and credit amount.');
      return;
    }

    try {
      if (userData?.branchCode && id) {
        const creditNoteRef = doc(db, `products/${userData.branchCode}/creditNotes`, id);
        await updateDoc(creditNoteRef, {
          Name: Name,
          mobileNumber: mobileNumber,
          amount: Number(creditAmount),
          CreditUsed: Number(CreditUsed) || 0,
          Balance: Number(Balance) || Number(creditAmount),
          Comment: Comment || 'N/A',
          updatedAt: new Date(),
          updatedBy: userData?.email || 'unknown',
        });
        toast.success('Credit note updated successfully!');
        setTimeout(() => navigate('/usersidebar/creditnote'), 3000);
      } else {
        toast.error('Branch code or credit note ID not found. Cannot update credit note.');
      }
    } catch (error) {
      console.error('Error updating credit note:', error);
      toast.error('Error updating credit note.');
    }
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="dashboard-content">
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <h2 style={{ marginLeft: '10px', marginTop: '120px' }}>Edit Credit Note</h2>
        <form onSubmit={handleUpdateCreditNote}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="Name">Name:</label>
              <input
                type="text"
                id="Name"
                value={Name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="mobileNumber">Mobile Number:</label>
              <input
                type="text"
                id="mobileNumber"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="creditAmount">Credit Amount:</label>
              <input
                type="number"
                id="creditAmount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="CreditUsed">Credit Used:</label>
              <input
                type="text"
                id="CreditUsed"
                value={CreditUsed}
                onChange={(e) => setCreditUsed(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="Balance">Balance:</label>
              <input
                type="text"
                id="Balance"
                value={Balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="Comment">Comment:</label>
              <input
                type="text"
                id="Comment"
                value={Comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
         <div className="button-group">
        <button onClick={() => navigate('/usersidebar/creditnote')} type="button" className="btn cancel">Cancel</button>

          <button type="submit" className="btn add-clead">Update Credit Note</button>
          </div>
        </form>

        <ToastContainer />
      </div>
    </div>
  );
};

export default EditCreditNote;
