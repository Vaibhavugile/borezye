import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const oobCode = searchParams.get('oobCode');

  // On mount, verify oobCode and get email
  useEffect(() => {
    if (!oobCode) {
      setError('Invalid password reset link.');
      setLoading(false);
      return;
    }

    const auth = getAuth();

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Invalid or expired reset code:', err);
        setError('Invalid or expired password reset link.');
        setLoading(false);
      });
  }, [oobCode]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const auth = getAuth();
    const db = getFirestore();

    try {
      // Step 1: Reset password in Firebase Auth
      await confirmPasswordReset(auth, oobCode, newPassword);
      console.log('✅ Password updated in Firebase Auth');

      // Step 2: Update Firestore 'branches' document with new password (WARNING: In real apps, never store plaintext passwords)
      const q = query(collection(db, 'branches'), where('emailId', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        for (const docSnap of querySnapshot.docs) {
          await updateDoc(doc(db, 'branches', docSnap.id), {
            password: newPassword, // WARNING: Consider hashing or better security for passwords!
          });
          console.log('✅ Firestore password field updated');
        }
      } else {
        console.warn(`No branches document found with emailId: ${email}`);
      }

      setMessage('✅ Password has been reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/Login'), 3000);
    } catch (err) {
      console.error('❌ Error resetting password:', err);
      setError('Failed to reset password. The link might be expired or invalid.');
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="reset-password-container">
      <h2>Set New Password</h2>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleResetPassword}>
        <input
          type="email"
          value={email}
          readOnly
          disabled
          style={{ backgroundColor: '#eee', cursor: 'not-allowed' }}
        />
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit">Update Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
