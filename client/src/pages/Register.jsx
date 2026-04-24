import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { googleAuthRequest, registerRequest } from "../services/authApi";
import { getRoomsRequest } from "../services/roomsApi";
import { clearAuthToken, setAuthToken } from "../services/tokenStorage";
import { ArrowLeft, ArrowLeftRight, Eye, EyeOff } from "lucide-react";
import GoogleSignInButton from "../components/GoogleSignInButton";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!formData.name.trim()) {
      nextErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = "Email address is invalid";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError("");

      await registerRequest({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate("/login");
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to register. Please try again.";
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
      const message = error.response?.data?.message || "Unable to continue with Google. Please try again.";
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

      <div className="auth-card register-card">
        <div className="auth-header">
          <h1>Create your account</h1>
          <p>Join thousands of developers</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && <p className="form-server-error">{serverError}</p>}

          <div className="form-group">
            <label htmlFor="register-name">FULL NAME</label>
            <input
              id="register-name"
              name="name"
              type="text"
              className="form-control"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="register-email">EMAIL</label>
            <input
              id="register-email"
              name="email"
              type="email"
              className="form-control"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && (
              <span className="form-error">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-password">PASSWORD</label>
            <div className="password-wrapper">
              <input
                id="register-password"
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
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password">CONFIRM PASSWORD</label>
            <div className="password-wrapper">
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="form-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-filled btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="divider">OR CONTINUE WITH</div>
        <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isSubmitting} />

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
