import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const FirebaseAuthActionHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const continueUrl = params.get('continueUrl'); // optional

    if (mode === 'resetPassword' && oobCode) {
      // Redirect to /reset-password with query params
      let url = `/reset-password?mode=${mode}&oobCode=${oobCode}`;
      if (continueUrl) url += `&continueUrl=${encodeURIComponent(continueUrl)}`;

      navigate(url, { replace: true });
    } else {
      // For other modes or missing params, you can show a message or redirect elsewhere
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return <p>Loading...</p>;
};

export default FirebaseAuthActionHandler;
