import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig'; // Firebase config import
import './EditUser.css';
import { toast, ToastContainer } from 'react-toastify'; // Import react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import CSS for react-toastify
import { useUser } from '../Auth/UserContext'; // Assuming you're using a UserContext for branchCode

const EditUser = () => {
  const { id } = useParams();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [weekOffs, setWeekOffs] = useState([]);
  const navigate = useNavigate();
  const { userData } = useUser(); // Get user data from context
  const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const [
  shiftStartTime,
  setShiftStartTime,
] = useState("10:00");



const [
  shiftEndTime,
  setShiftEndTime,
] = useState("19:00");



const [
  graceTime,
  setGraceTime,
] = useState(15);



const [
  overtimeGraceMinutes,
  setOvertimeGraceMinutes,
] = useState(30);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const docRef = doc(db, `products/${userData.branchCode}/subusers/${id}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setWeekOffs(userData.weekOffs || []);
          setShiftStartTime(

  userData.shiftStartTime ||

  "10:00"
);



setShiftEndTime(

  userData.shiftEndTime ||

  "19:00"
);



setGraceTime(

  userData.graceTime || 15
);



setOvertimeGraceMinutes(

  userData
    .overtimeGraceMinutes || 30
);
          setUser(userData);
          setIsActive(userData.isActive || false);
        } else {
          console.error('User not found');
          toast.error('User not found. Redirecting to users list.');
          setTimeout(() => navigate('/usersidebar/users'), 5000);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Error fetching user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
  
    if (userData?.branchCode) {
      fetchUser();
    }
  }, [id, navigate, userData]);

  const handleSave = async () => {
    try {
      const docRef = doc(db, `products/${userData.branchCode}/subusers/${id}`);
      await updateDoc(docRef, {
        ...user,
        isActive,
          weekOffs,



  shiftStartTime,

  shiftEndTime,



  graceTime:
    Number(graceTime),



  overtimeGraceMinutes:
    Number(
      overtimeGraceMinutes
    ),
        
      });
      const globalRef = doc(
  db,
  `subusers/${id}`
);

await updateDoc(globalRef, {

  ...user,

  isActive,

  weekOffs,

  shiftStartTime,

  shiftEndTime,

  graceTime:
    Number(graceTime),

  overtimeGraceMinutes:
    Number(
      overtimeGraceMinutes
    ),
});
      toast.success('User updated successfully!');
      setTimeout(() => navigate('/usersidebar/users'), 5000);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user. Please try again.');
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prevUser) => ({ ...prevUser, [name]: value }));
  };

  return (
    <div className="edit-user-container">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="edit-user-form">
          <h2>Edit User</h2>

          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={user.name || ''}
            onChange={handleInputChange}
          />

          <label>Email:</label>
          <input
            type="text"
            name="email"
            value={user.email || ''}
            onChange={handleInputChange}
          />

          <label>Salary:</label>
          <input
            type="text"
            name="salary"
            value={user.salary || ''}
            onChange={handleInputChange}
          />

          <label>Contact Number:</label>
          <input
            type="text"
            name="contactNumber"
            value={user.contactNumber || ''}
            onChange={handleInputChange}
          />

          <label>Role:</label>
          <input
            type="text"
            name="role"
            value={user.role || ''}
            onChange={handleInputChange}
          />

          
<label>Weekly Offs:</label>

<div className="weekoff-grid">

  {weekDays.map((day) => (

    <label
      key={day}
      className="weekoff-item"
    >

      <input
        type="checkbox"

        checked={weekOffs.includes(day)}

        onChange={(e) => {

          if (e.target.checked) {

            setWeekOffs([
              ...weekOffs,
              day,
            ]);

          } else {

            setWeekOffs(

              weekOffs.filter(
                (d) => d !== day
              )
            );
          }
        }}
      />

      {day}

    </label>
  ))}

</div>
{/* SHIFT START */}

<label>
  Shift Start Time:
</label>

<input
  type="time"

  value={shiftStartTime}

  onChange={(e)=>

    setShiftStartTime(
      e.target.value
    )
  }
/>



{/* SHIFT END */}

<label>
  Shift End Time:
</label>

<input
  type="time"

  value={shiftEndTime}

  onChange={(e)=>

    setShiftEndTime(
      e.target.value
    )
  }
/>



{/* GRACE TIME */}

<label>
  Grace Time (Minutes):
</label>

<input
  type="number"

  min="0"

  value={graceTime}

  onChange={(e)=>

    setGraceTime(
      e.target.value
    )
  }
/>



{/* OVERTIME */}

<label>
  Overtime Grace (Minutes):
</label>

<input
  type="number"

  min="0"

  value={
    overtimeGraceMinutes
  }

  onChange={(e)=>

    setOvertimeGraceMinutes(
      e.target.value
    )
  }
/>
          <label>Active:</label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={() => setIsActive((prev) => !prev)} // Toggle active status
          />

        <div className="edit-user-buttons">

  <button
    className="save-btn"
    onClick={handleSave}
  >
    Save
  </button>

  <button
    className="cancel-btn"
    onClick={() =>
      navigate('/usersidebar/users')
    }
  >
    Cancel
  </button>

</div>
        </div>
      )}
      <ToastContainer/>
    </div>
  );
};

export default EditUser;
