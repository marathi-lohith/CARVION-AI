import React, { useEffect } from 'react';
import { ENV } from '../../../config/env.js';

export default function GoogleLoginButton({ onSuccess, onFailure, mode = 'signin' }) {
  useEffect(() => {
    // Dynamically load Google One-Tap Client SDK
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: ENV.GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              onSuccess(response.credential);
            } else {
              onFailure(new Error('Google Client verification failed: credentials returned empty.'));
            }
          },
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-btn-container'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: '368',
            text: mode === 'signup' ? 'continue_with' : 'signin_with',
            shape: 'rectangular'
          }
        );
      } else {
        onFailure(new Error('Google client SDK failed to load.'));
      }
    };

    return () => {
      // Clean up script on component unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onSuccess, onFailure, mode]);

  return (
    <div className="w-full flex justify-center py-2 select-none">
      <div id="google-btn-container" className="w-full max-w-[368px] min-h-[44px] flex justify-center" />
    </div>
  );
}
