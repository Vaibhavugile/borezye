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

  if (
    !mobileNumber ||
    !creditAmount ||
    isNaN(Number(creditAmount)) ||
    Number(creditAmount) <= 0
  ) {
    toast.error(
      'Please enter a valid mobile number and credit amount.'
    );
    return;
  }

  try {
    if (!userData?.branchCode) {
      toast.error(
        'Branch code not found. Cannot generate credit note.'
      );
      return;
    }

    const creditNotesRef = collection(
      db,
      `products/${userData.branchCode}/creditNotes`
    );

    const existingQuery = query(
      creditNotesRef,
      where('mobileNumber', '==', mobileNumber)
    );

    const querySnapshot = await getDocs(existingQuery);

    /* =======================================================
       EXISTING CUSTOMER
    ======================================================= */

    if (!querySnapshot.empty) {
      const docSnapshot = querySnapshot.docs[0];

      const existingData = docSnapshot.data();

      const previousBalance =
        Number(existingData.Balance) || 0;

      const addedAmount =
        Number(creditAmount);

      const newBalance =
        previousBalance + addedAmount;

      /* ================= UPDATE MAIN CREDIT NOTE ================= */

      await updateDoc(
        doc(
          db,
          `products/${userData.branchCode}/creditNotes`,
          docSnapshot.id
        ),
        {
          Balance: newBalance,

          amount:
            (Number(existingData.amount) || 0) +
            addedAmount,

          CreditUsed:
            Number(existingData.CreditUsed) || 0,

          Comment:
            Comment ||
            existingData.Comment ||
            'N/A',

          updatedAt: new Date(),

          updatedBy:
            userData?.email || 'unknown',
        }
      );

      /* ================= ADD HISTORY ================= */

      await addDoc(
        collection(
          db,
          `products/${userData.branchCode}/creditNotes/${docSnapshot.id}/history`
        ),
        {
          type: 'ADD',

          amount: addedAmount,

          previousBalance: previousBalance,

          newBalance: newBalance,

          receiptNo: '',

          orderId: '',

          note:
            Comment || 'Credit added',

          createdAt: new Date(),

          createdBy:
            userData?.email || 'unknown',
        }
      );

      toast.success(
        `Credit note updated successfully for mobile number: ${mobileNumber}`
      );
    }

    /* =======================================================
       NEW CUSTOMER
    ======================================================= */

    else {
      const creditNoteId = uuidv4();

      const openingBalance =
        Number(Balance) ||
        Number(creditAmount);

      const creditDoc = await addDoc(
        creditNotesRef,
        {
          creditNoteId: creditNoteId,

          Name: Name,

          mobileNumber: mobileNumber,

          amount: Number(creditAmount),

          CreditUsed:
            Number(CreditUsed) || 0,

          Balance: openingBalance,

          Comment: Comment || 'N/A',

          createdAt: new Date(),

          createdBy:
            userData?.email || 'unknown',

          status: 'active',
        }
      );

      /* ================= ADD HISTORY ================= */

      await addDoc(
        collection(
          db,
          `products/${userData.branchCode}/creditNotes/${creditDoc.id}/history`
        ),
        {
          type: 'ADD',

          amount: Number(creditAmount),

          previousBalance: 0,

          newBalance: openingBalance,

          receiptNo: '',

          orderId: '',

          note:
            Comment ||
            'Initial credit added',

          createdAt: new Date(),

          createdBy:
            userData?.email || 'unknown',
        }
      );

      toast.success(
        `Credit note generated successfully! ID: ${creditNoteId}`
      );
    }

    /* ================= RESET FORM ================= */

    setName('');
    setMobileNumber('');
    setCreditAmount('');
    SetCreditUsed('');
    setBalance('');
    SetComment('');

    setTimeout(() => {
      navigate('/usersidebar/creditnote');
    }, 2000);

  } catch (error) {
    console.error(
      'Error generating credit note:',
      error
    );

    toast.error(
      'Error generating credit note'
    );
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
