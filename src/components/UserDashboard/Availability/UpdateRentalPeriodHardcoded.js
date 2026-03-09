// src/components/AdminTools/UpdateRentalPeriodHardcoded.js

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc,getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; // Adjust path if needed
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const UpdateRentalPeriodHardcoded = () => {

  const [loading, setLoading] = useState(false);
  const branchCode = '4444'; // 🔴 Hardcode your branch code here

  const handleUpdateProducts = async () => {
    setLoading(true);
    try {
      const productsRef = collection(db, `products/${branchCode}/products`);
      const snapshot = await getDocs(productsRef);

      if (snapshot.empty) {
        toast.warning('No products found in this branch.');
        setLoading(false);
        return;
      }

      const updateTasks = snapshot.docs.map((docSnap) => {
        const productRef = doc(db, `products/${branchCode}/products`, docSnap.id);
        return updateDoc(productRef, { minimumRentalPeriod: 3 });
      });

      await Promise.all(updateTasks);
      toast.success(`✅ Updated ${updateTasks.length} products successfully.`);
    } catch (error) {
      console.error('Error updating products:', error);
      toast.error('❌ Failed to update products. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h2>Update All Products</h2>
      <p>This will set <strong>minimumRentalPeriod = 3</strong> for all products in branch: <code>{branchCode}</code></p>
      <button
        onClick={handleUpdateProducts}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Updating...' : 'Update Products'}
      </button>

      <ToastContainer position="top-center" />
    </div>
  );
};



export default UpdateRentalPeriodHardcoded;
