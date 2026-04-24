import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services-script";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const hiddenButtonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [error, setError] = useState("");

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let isMounted = true;

    const initializeGoogleButton = async () => {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        if (isMounted) {
          setError("Google sign-in is not configured yet.");
        }
        return;
      }

      try {
        await loadGoogleScript();

        if (!isMounted || !hiddenButtonRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (!response?.credential) {
              setError("Google did not return a valid credential.");
              return;
            }

            onCredentialRef.current(response.credential);
          },
        });

        hiddenButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(hiddenButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: 280,
        });
      } catch {
        if (isMounted) {
          setError("Unable to load Google sign-in right now.");
        }
      }

      return undefined;
    };

    initializeGoogleButton();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCustomButtonClick = () => {
    if (disabled) {
      return;
    }

    const hiddenButtonHost = hiddenButtonRef.current;

    if (!hiddenButtonHost) {
      setError("Google sign-in is not ready yet. Please try again.");
      return;
    }

    const googleButtonElement =
      hiddenButtonHost.querySelector('div[role="button"]') || hiddenButtonHost.firstElementChild;

    if (!googleButtonElement) {
      setError("Google sign-in is not ready yet. Please try again.");
      return;
    }

    setError("");
    googleButtonElement.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  };

  return (
    <div className="google-auth-wrap" aria-live="polite">
      <button type="button" className="btn btn-google" onClick={handleCustomButtonClick} disabled={disabled}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        </svg>
        <span>Continue with Google</span>
      </button>
      <div ref={hiddenButtonRef} className="google-auth-hidden" aria-hidden="true" />
      {error ? <p className="form-server-error">{error}</p> : null}
    </div>
  );
};

export default GoogleSignInButton;
