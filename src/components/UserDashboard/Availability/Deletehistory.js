import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../UserDashboard/UserHeader';
import UserSidebar from '../../UserDashboard/UserSidebar';
import { useUser } from '../../Auth/UserContext';
import search from '../../../assets/Search.png';
import { FaSearch, FaDownload, FaUpload, FaPlus, FaEdit, FaTrash, FaCopy, FaWhatsapp } from 'react-icons/fa';
import Papa from 'papaparse';
import '../Availability/Availability.css'; // Use the same CSS file
import { format } from 'date-fns';
import { Label } from 'recharts';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DeletedHistoryPage = () => {
    const [deletedBookings, setDeletedBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState('');
    const [filteredDeletedBookings, setFilteredDeletedBookings] = useState([]);
    const { userData } = useUser();
    const [selectedReceiptNumber, setSelectedReceiptNumber] = useState(null);
    
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDeletedBookings = async () => {
            setLoading(true);
            try {
                const deletedBookingsRef = collection(db, `products/${userData.branchCode}/deletedBookings`);
                const q = query(deletedBookingsRef, orderBy('deletedAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const deletedBookingsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    pickupDate: doc.data().pickupDate?.toDate() || null,
                    returnDate: doc.data().returnDate?.toDate() || null,
                    createdAt: doc.data().createdAt?.toDate() || null,
                    deletedAt: doc.data().deletedAt?.toDate() || null,
                    clientname: doc.data().userDetails?.name,
                    contactNo: doc.data().userDetails?.contact,
                    email: doc.data().userDetails?.email,
                    productCodes: doc.data().productCodes || [], // Ensure productCodes exists
                }));
                setDeletedBookings(deletedBookingsData);
                setFilteredDeletedBookings(deletedBookingsData);
            } catch (error) {
                toast.error('Error fetching deleted bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeletedBookings();
    }, [userData.branchCode]);

    const handleDeletePermanently = async (bookingId) => {
        const confirmed = window.confirm("Are you sure you want to permanently delete this record?");
        if (!confirmed) return;
        try {
            const deletedDocRef = doc(db, `products/${userData.branchCode}/deletedBookings`, bookingId);
            await deleteDoc(deletedDocRef);
            toast.success('Record permanently deleted successfully');
            setDeletedBookings(deletedBookings.filter(booking => booking.id !== bookingId));
            setFilteredDeletedBookings(filteredDeletedBookings.filter(booking => booking.id !== bookingId));
        } catch (error) {
            console.error("Error permanently deleting record:", error);
            toast.error('Error permanently deleting record');
        }
    };

    const handleSearch = () => {
        const lowerCaseQuery = searchQuery.toLowerCase();

        if (lowerCaseQuery === '') {
            setFilteredDeletedBookings(deletedBookings);
        } else {
            const filtered = deletedBookings.filter((booking) => {
                const productCodesString = booking.productCodes ? booking.productCodes.join(', ') : '';

                if (searchField === 'receiptNumber') {
                    return booking.receiptNumber && String(booking.receiptNumber).toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'bookingcreation') {
                    return booking.createdAt && booking.createdAt.toLocaleDateString().toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'username') {
                    return booking.clientname && booking.clientname.toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'contactNo') {
                    return booking.contactNo && String(booking.contactNo).toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'emailId') {
                    return booking.email && booking.email.toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'productCode') {
                    return productCodesString.toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'pickupDate') {
                    return booking.pickupDate && booking.pickupDate.toLocaleDateString().toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'returnDate') {
                    return booking.returnDate && booking.returnDate.toLocaleDateString().toLowerCase().includes(lowerCaseQuery);
                } else if (searchField === 'deletionDate') {
                    return booking.deletedAt && booking.deletedAt.toLocaleDateString().toLowerCase().includes(lowerCaseQuery);
                } else {
                    return (
                        (booking.receiptNumber && String(booking.receiptNumber).toLowerCase().includes(lowerCaseQuery)) ||
                        (booking.createdAt && booking.createdAt.toLocaleDateString().toLowerCase().includes(lowerCaseQuery)) ||
                        (booking.clientname && booking.clientname.toLowerCase().includes(lowerCaseQuery)) ||
                        (booking.contactNo && String(booking.contactNo).toLowerCase().includes(lowerCaseQuery)) ||
                        (booking.email && booking.email.toLowerCase().includes(lowerCaseQuery)) ||
                        productCodesString.toLowerCase().includes(lowerCaseQuery) ||
                        (booking.pickupDate && booking.pickupDate.toLocaleDateString().toLowerCase().includes(lowerCaseQuery)) ||
                        (booking.returnDate && booking.returnDate.toLocaleDateString().toLowerCase().includes(lowerCaseQuery)) ||
                        (booking.deletedAt && booking.deletedAt.toLocaleDateString().toLowerCase().includes(lowerCaseQuery))
                    );
                }
            });
            setFilteredDeletedBookings(filtered);
        }
    };

    useEffect(() => {
        handleSearch();
    }, [searchQuery, searchField, deletedBookings]);

    const exportToCSV = () => {
        const processedBookings = deletedBookings.map(booking => {
            const createdAtDate = booking.createdAt ? booking.createdAt.toLocaleString() : 'N/A';
            const deletedAtDate = booking.deletedAt ? booking.deletedAt.toLocaleString() : 'N/A';
            const productCodesString = booking.productCodes ? booking.productCodes.join(', ') : 'N/A';

            return {
                ...booking,
                clientname: booking.clientname || 'N/A',
                contactNo: booking.contactNo || 'N/A',
                email: booking.email || 'N/A',
                productCodes: productCodesString,
                createdAt: createdAtDate,
                deletedAt: deletedAtDate,
            };
        });

        const csv = Papa.unparse(processedBookings);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'deleted_bookings.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
     const handleBookingClick = (booking) => {
    setSelectedReceiptNumber(booking.receiptNumber);
// From a deleted bookings list component
navigate(`/booking-details/${booking.receiptNumber}`, {
  state: { isDeleted: true },
});
  };

    return (
        <div className={`dashboard-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <UserSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <div className="dashboard-content">
                <UserHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <h2 style={{ marginLeft: '10px', marginTop: '120px' }}>
                    Deleted Booking History
                </h2>

                <div className="toolbar-container">
                    <div className="search-bar-container7">
                        <img src={search} alt="search icon" className="search-icon7" />
                        <select
                            value={searchField}
                            onChange={(e) => setSearchField(e.target.value)}
                            className="search-dropdown7"
                        >
                            <option value="">Search By</option>
                            <option value="receiptNumber">Receipt Number</option>
                            <option value="bookingcreation">Booking Creation</option>
                            <option value="username">Clients Name</option>
                            <option value="contactNo">Contact Number</option>
                            <option value="emailId">Email Id</option>
                            <option value="productCode">Product Code</option>
                            <option value="pickupDate">Pickup Date</option>
                            <option value="returnDate">Return Date</option>
                            <option value="deletionDate">Deletion Date</option>
                        </select>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                        />
                    </div>

                    <div className='action-buttons'>
                        <label className="export-button" onClick={exportToCSV}>
                            <FaUpload /> Export
                        </label>
                    </div>
                </div>

                {loading ? (
                    <p>Loading deleted bookings...</p>
                ) : (
                    <div className="booking-list">
                        {filteredDeletedBookings.length > 0 ? (
                            <table className="booking-table">
                                <thead>
                                    <tr>
                                        <th>Receipt Number</th>
                                        <th>Deletion Date</th>
                                        <th>Booking Creation Date</th>
                                        <th>Clients Name</th>
                                        <th>Contact Number</th>
                                        <th>Email id</th>
                                        <th>Product Codes</th> {/* Updated header */}
                                        <th>Pickup Date</th>
                                        <th>Return Date</th>
                                        <th>Deleted By</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDeletedBookings.map((booking) => (
                                        <tr key={booking.id}>
                                            <td>
                                                {/* Make only the receipt number clickable */}
                                                <span

                                                    onClick={() => handleBookingClick(booking)}
                                                >
                                                    {booking.receiptNumber}
                                                </span>
                                            </td>
                                            <td>{booking.deletedAt?.toLocaleString() || 'N/A'}</td>
                                            <td>{booking.createdAt?.toLocaleString() || 'N/A'}</td>
                                            <td>{booking.clientname || 'N/A'}</td>
                                            <td>{booking.contactNo || 'N/A'}</td>
                                            <td>{booking.email || 'N/A'}</td>
                                            <td>
                                                {booking.productCodes && booking.productCodes.map((code, index) => (
                                                    <div key={index}>
                                                        {code}
                                                    </div>
                                                ))}
                                            </td>
                                            <td>{booking.pickupDate?.toLocaleString() || 'N/A'}</td>
                                            <td>{booking.returnDate?.toLocaleString() || 'N/A'}</td>
                                            <td>{booking.deletedBy || 'N/A'}</td>
                                            <td>
                                                {userData?.role !== 'Subuser' && (
                                                    <button
                                                        onClick={() => handleDeletePermanently(booking.id)}
                                                        className="delete-button"
                                                        style={{ backgroundColor: 'red', color: 'white' }}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No deleted bookings found.</p>
                        )}
                    </div>
                )}
            </div>
            <ToastContainer />
        </div>
    );
};

export default DeletedHistoryPage;