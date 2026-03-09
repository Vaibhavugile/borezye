import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse'; // Import PapaParse for CSV operations
import './User.css';
import UserHeader from './UserHeader';
import UserSidebar from './UserSidebar';
import search from '../../assets/Search.png'; // Import search icon
import downloadIcon from '../../assets/Download.png'; // Import download icon
import uploadIcon from '../../assets/Upload.png'; // Import upload icon
import { useUser } from '../Auth/UserContext';
import { FaSearch, FaFilter, FaDownload, FaUpload, FaPlus, FaEdit, FaTrash, FaCopy } from 'react-icons/fa';

const UserDashboard = () => {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0); // State to keep track of total users
  const [loading, setLoading] = useState(true); // Loading state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [searchField, setSearchField] = useState('name'); // Search field state
  const [importedData, setImportedData] = useState(null); // Imported data state
  const navigate = useNavigate();
  const { userData } = useUser();
  const [originalUsers, setOriginalUsers] = useState([]);

  useEffect(() => {
    const fetchUsersAndBranchData = async () => {
      try {
        const subusersRef = collection(db, `products/${userData.branchCode}/subusers`);
        const querySnapshot = await getDocs(subusersRef);
  
        const fetchedUsers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(fetchedUsers);
        setOriginalUsers(fetchedUsers);
  
        // Fetch total number of users allowed from 'branches' collection
        const branchRef = doc(db, 'branches', userData.branchCode);
        const branchSnap = await getDoc(branchRef);
        if (branchSnap.exists()) {
          const branchData = branchSnap.data();
          setTotalUsers(branchData.numberOfUsers || 0);
        } else {
          console.error('Branch not found. Branch Code:', userData.branchCode);
        }
      } catch (error) {
        console.error('Error fetching users or branch data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    if (userData?.branchCode) {
      fetchUsersAndBranchData();
    }
  }, [userData]);

  
  const handleDelete = async (id) => {
    try {
      const userDocRef = doc(db, `products/${userData.branchCode}/subusers/${id}`);
      const userDocSnap = await getDoc(userDocRef);
  
      if (userDocSnap.exists()) {
        // Delete user document
        await deleteDoc(userDocRef);
  
        // Increment available user slots in the branch
        const branchRef = doc(db, 'branches', userData.branchCode);
        const branchSnap = await getDoc(branchRef);
        if (branchSnap.exists()) {
          const branchData = branchSnap.data();
          const currentUsers = branchData.numberOfUsers || 0;
  
          await updateDoc(branchRef, {
            numberOfUsers: currentUsers + 1,
          });
          console.log('Branch user count updated.');
        } else {
          console.error('Branch not found. Branch Code:', userData.branchCode);
        }
  
        // Remove from local state
        setUsers(users.filter((user) => user.id !== id));
        setTotalUsers((prev) => prev + 1);
      } else {
        console.error('User not found. ID:', id);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };
  
  const handleEdit = (id) => {
    navigate(`/edituser/${id}`);
  };

  const handleAddUser = () => {
    navigate('/adduser');
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSearch = () => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    if (lowerCaseQuery === '') {
      setUsers(originalUsers); // Show all users if search query is empty
    } else {
      const filteredUsers = originalUsers.filter(user =>
        user[searchField]?.toLowerCase().includes(lowerCaseQuery)
      );
      setUsers(filteredUsers);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, searchField]);

  const exportToCSV = () => {
    const csv = Papa.unparse(users);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'users.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (result) => {
          const importedUsers = result.data.map(row => ({
            ...row,
          }));
          setImportedData(importedUsers);
          console.log(importedUsers);
        },
      });
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    try {
      const userDocRef = doc(db, 'subusers', id);
      await updateDoc(userDocRef, {
        isActive: !currentStatus,
      });

      setUsers(users.map(user =>
        user.id === id ? { ...user, isActive: !currentStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  return (
    <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <UserSidebar isOpen={sidebarOpen} onToggle={handleSidebarToggle} />
      <div className="dashboard-content">
        <UserHeader onMenuClick={handleSidebarToggle} isSidebarOpen={sidebarOpen} />
        <h2 style={{ marginLeft: '10px', marginTop: '100px', fontFamily: 'Public Sans', fontStyle: 'normal', fontWeight: '600', fontSize: '24px', lineHeight: '28px', color: '#000000' }}>
          Total Users
        </h2>
        <p style={{ marginLeft: '10px', fontFamily: 'Public Sans', fontStyle: 'normal', fontWeight: '400', fontSize: '20px', lineHeight: '24px', color: '#000000' }}>
          {totalUsers} Users Left
        </p>
        <div className="toolbar-container">
          <div className="search-bar-container7">
            <img src={search} alt="search icon" className="search-icon7" />
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="search-dropdown7"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="contactNumber">Contact Number</option>
              <option value="salary">Salary</option>
              <option value="role">Role</option>
            </select>
            <input
              type="text"
              placeholder={`Search by..`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="action-buttons">
          <label className="export-button" onClick={exportToCSV}>
              <FaUpload/>
              Export
            </label>
            <label htmlFor="import" className="import-button">
              <FaDownload/>
              Import
              <input
                type="file"
                id="import"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
            
            <label className="add-product-button" onClick={handleAddUser}><FaPlus />Add New User</label> 
            
          </div>
        </div>
        <div className="table-container">
          {loading ? (
            <p>Loading users...</p>
          ) : users.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Salary</th>
                  <th>Contact Number</th>
                  <th>Role</th>
                  <th>Status</th> {/* Updated Column */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.salary}</td>
                    <td>{user.contactNumber}</td>
                    <td>{user.role}</td>
                    <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div className="action-buttons">
                        <label onClick={() => handleEdit(user.id)}><FaEdit style={{ color: '#757575' , cursor: 'pointer'}} /></label>
                        <label onClick={() => handleDelete(user.id)}><FaTrash style={{ color: '#757575', cursor: 'pointer' }} /></label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No users found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
