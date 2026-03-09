import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import './ForgotPassword.css';
import backIcon from '../../assets/arrowiosback_111116.png';
import { useNavigate } from 'react-router-dom'; // <-- Don't forget this if you're using navigate

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email has been sent. Please check your inbox.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError('Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="vaisak">
        <img
          src={backIcon}
          alt="back"
          onClick={() => navigate('/Login')}
        />
      </div>
      <h2>Forgot Password</h2>
      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleResetPassword}>
        <div className="form-group">
          <label htmlFor="email">Enter your email address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email"
            required
          />
        </div>
        <button type="submit" className="reset-button">Reset Password</button>
      </form>
    </div>
  );
};

export default ForgotPassword;
