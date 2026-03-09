import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useUser } from "./UserContext";

const EXCLUDED_PATHS = [
  "/usersidebar/availability" // ❌ auto logout disabled here
];

const InactivityGuard = ({ children }) => {
  const { autoLogoutEnabled, autoLogoutMinutes, setUserData } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);

  const isExcluded = EXCLUDED_PATHS.some((path) =>
    location.pathname.startsWith(path)
  );

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    navigate("/Login");
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      logout();
    }, autoLogoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    if (!autoLogoutEnabled || isExcluded) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer(); // start timer immediately

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [autoLogoutEnabled, autoLogoutMinutes, isExcluded]);

  return children;
};

export default InactivityGuard;
