import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { googleAuthRequest, loginRequest } from "../services/authApi";
import { getRoomsRequest } from "../services/roomsApi";
import { clearAuthToken, setAuthToken } from "../services/tokenStorage";
import { ArrowLeft, ArrowLeftRight, Eye, EyeOff } from "lucide-react";
import GoogleSignInButton from "../components/GoogleSignInButton";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError("");

      const response = await loginRequest({
        email: formData.email.trim(),
        password: formData.password,
      });

      const token = response.data?.token;

      if (!token) {
        setServerError("Token was not returned by server");
        return;
      }

      clearAuthToken();
      setAuthToken(token);

      const roomsResponse = await getRoomsRequest(token);
      const initialRooms = Array.isArray(roomsResponse.data?.rooms) ? roomsResponse.data.rooms : [];

      navigate("/dashboard", {
        state: {
          initialRooms,
        },
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.request
          ? "Unable to reach the server. Check that the backend is running and CLIENT_URL matches your Vite URL."
          : "Unable to login. Please try again.");
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    try {
      setIsSubmitting(true);
      setServerError("");

      const response = await googleAuthRequest({ idToken: credential });
      const token = response.data?.token;

      if (!token) {
        setServerError("Token was not returned by server");
        return;
      }

      clearAuthToken();
      setAuthToken(token);

      const roomsResponse = await getRoomsRequest(token);
      const initialRooms = Array.isArray(roomsResponse.data?.rooms) ? roomsResponse.data.rooms : [];

      navigate("/dashboard", {
        state: {
          initialRooms,
        },
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.request
          ? "Unable to reach the server. Check that the backend is running and CLIENT_URL matches your Vite URL."
          : "Unable to login with Google. Please try again.");
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <button type="button" className="auth-back-btn" onClick={() => navigate("/")}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back</span>
      </button>

      <div className="auth-page-logo auth-logo">
        <ArrowLeftRight size={20} aria-hidden="true" />
        <h2>SynCode</h2>
      </div>

      <div className="auth-card login-card">
        <div className="auth-header auth-header-left">
          <h1>Welcome back</h1>
          <p>Sign in to continue coding</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError ? <p className="form-server-error">{serverError}</p> : null}

          <div className="form-group">
            <label htmlFor="login-email">EMAIL ADDRESS</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="form-control"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email ? <span className="form-error">{errors.email}</span> : null}
          </div>

          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="login-password">PASSWORD</label>
              <a href="#" className="forgot-link">
                Forgot password?
              </a>
            </div>
            <div className="password-wrapper">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password ? <span className="form-error">{errors.password}</span> : null}
          </div>

          <button type="submit" className="btn btn-filled btn-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="divider">OR CONTINUE WITH</div>
        <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isSubmitting} />

        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
