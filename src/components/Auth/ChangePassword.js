// src/components/ChangePassword.js
import React, { useState } from 'react';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { TextField, Button } from '@mui/material';
import './changePassword.css'; // Import the CSS
import backIcon from '../../assets/arrowiosback_111116.png'
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      toast.warn('User not authenticated.');
      return;
    }

    if (newPassword !== repeatPassword) {
      toast.warn('New passwords do not match.');
      return;
    }

    try {
      // Reauthenticate the user
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update the password
      await updatePassword(user, newPassword);
      toast.success('Password updated successfully.');
      setTimeout(() => navigate('/welcome'),5000); // Redirect to the Welcome page or any other page after password change
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password. Please try again.');
    }
  };

  return (
    
    
       <div >
        <img
          src={backIcon}
          alt="button10"
          onClick={() => navigate("/overview")} // Navigate to the profile page
        />
     
      <div className="change-password">
      <h2>Change Your Password</h2>
      <form onSubmit={handleChangePassword}>
        <TextField
          label="Old Password"
          type="password"
          variant="outlined"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="New Password"
          type="password"
          variant="outlined"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Repeat New Password"
          type="password"
          variant="outlined"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
          fullWidth
        />
       <Button variant="contained" fullWidth onClick={() => navigate('/overview')} type="button" className='can'>Cancel</Button>

        <Button type="submit" variant="contained" fullWidth>
          Change Password
        </Button>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
      </form>
    </div>
    <ToastContainer/>
    </div>
  );
};
 


export default ChangePassword;
