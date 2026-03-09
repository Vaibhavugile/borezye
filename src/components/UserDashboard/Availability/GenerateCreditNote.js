import React, { useState } from 'react';
import { db } from '../../../firebaseConfig';
import { useUser } from '../../Auth/UserContext';
import { v4 as uuidv4 } from 'uuid';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import './GenerateCreditNote.css';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const GenerateCreditNote = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const { userData } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [Name, setName] = useState('');
  const [CreditUsed, SetCreditUsed] = useState('');
  const [Balance, setBalance] = useState('');
  const [Comment, SetComment] = useState('');
  const navigate = useNavigate(); // Initialize navigate


const handleGenerateCreditNote = async (e) => {
  e.preventDefault();
  if (!mobileNumber || !creditAmount || isNaN(Number(creditAmount)) || Number(creditAmount) <= 0) {
    toast.error('Please enter a valid mobile number and credit amount.');
    return;
  }

  try {
    if (userData?.branchCode) {
      const creditNotesRef = collection(db, `products/${userData.branchCode}/creditNotes`);
      const existingQuery = query(creditNotesRef, where("mobileNumber", "==", mobileNumber));
      const querySnapshot = await getDocs(existingQuery);

      if (!querySnapshot.empty) {
        // If a credit note exists, update its balance
        const docSnapshot = querySnapshot.docs[0];
        const existingData = docSnapshot.data();
        const newBalance = (Number(existingData.Balance) || 0) + Number(creditAmount);

        await updateDoc(doc(db, `products/${userData.branchCode}/creditNotes`, docSnapshot.id), {
          Balance: newBalance,
          amount: (Number(existingData.amount) || 0) + Number(creditAmount),
          CreditUsed: Number(existingData.CreditUsed) || 0,
          Comment: Comment || existingData.Comment || 'N/A',
          updatedAt: new Date(),
          updatedBy: userData?.email || 'unknown',
        });

        toast.success(`Credit note updated successfully for mobile number: ${mobileNumber}`);
        setName('');
        setMobileNumber('');
        setCreditAmount('');
        SetCreditUsed('');
        setBalance('');
        SetComment('');
        setTimeout(() => navigate('/usersidebar/creditnote'), 5000);
      } else {
        // If no credit note exists, create a new one
        const creditNoteId = uuidv4();
        await addDoc(creditNotesRef, {
          creditNoteId: creditNoteId,
          Name: Name,
          mobileNumber: mobileNumber,
          amount: Number(creditAmount),
          CreditUsed: Number(CreditUsed) || 0,
          Balance: Number(Balance) || Number(creditAmount),
          Comment: Comment || 'N/A',
          createdAt: new Date(),
          createdBy: userData?.email || 'unknown',
          status: 'active',
        });
        toast.success(`Credit note generated successfully! ID: ${creditNoteId}`);
        setName('');
        setMobileNumber('');
        setCreditAmount('');
        SetCreditUsed('');
        setBalance('');
        SetComment('');
        setTimeout(() => navigate('/usersidebar/creditnote'), 5000);
      }
    } else {
      toast.error('Branch code not found. Cannot generate credit note.');
    }
  } catch (error) {
    console.error('Error generating credit note:', error);
    toast.error('Error generating credit note');
  }
};

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="dashboard-content">
        <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <h2 style={{ marginLeft: '10px', marginTop: '120px' }}>Generate Credit Note</h2>
        <form onSubmit={handleGenerateCreditNote}>
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
                onChange={(e) => SetCreditUsed(e.target.value)}
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
                onChange={(e) => SetComment(e.target.value)}
              />
            </div>
          </div>
          <div className="button-group">
            <button onClick={() => navigate('/usersidebar/creditnote')} type="button" className="btn cancel">Cancel</button>

            <button type="submit" className="btn add-clead">Generate Credit Note</button>
          </div>
        </form>

        <ToastContainer />
      </div>
    </div>
  );
};

export default GenerateCreditNote;
