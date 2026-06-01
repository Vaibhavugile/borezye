import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(() => {
    const savedUserData = localStorage.getItem('userData');
    return savedUserData ? JSON.parse(savedUserData) : null;
  });

  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(false);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(2);
const [crmApiKey, setCrmApiKey] = useState("");
  useEffect(() => {
    if (userData) {
      localStorage.setItem('userData', JSON.stringify(userData));
    } else {
      localStorage.removeItem('userData');
    }
  }, [userData]);

  useEffect(() => {
    if (!userData?.branchCode) return;

    const fetchBranchSettings = async () => {
      try {
        const ref = doc(db, "branches", userData.branchCode);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setAutoLogoutEnabled(!!data.autoLogoutEnabled);
          setAutoLogoutMinutes(data.autoLogoutMinutes || 2);
              const apiKey =
  data.crmApiKey || "";

setCrmApiKey(apiKey);

localStorage.setItem(
  "crmApiKey",
  apiKey
);
        }
    
      } catch (error) {
        console.error("Error fetching auto logout settings", error);
      }
    };

    fetchBranchSettings();
  }, [userData?.branchCode]);

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        autoLogoutEnabled,
        autoLogoutMinutes,
        crmApiKey,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
