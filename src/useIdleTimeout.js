import { useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Adjust path if needed

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes (in milliseconds)

export default function useIdleTimeout(onLogout) {
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/'; // Redirect to login/home
    }
  }, [onLogout]);

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLogout, INACTIVITY_LIMIT);
    };

    // Events that count as user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    // Bind event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer on mount
    resetTimer();

    // Cleanup listeners and timer on unmount
    return () => {
      clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [handleLogout]);
}