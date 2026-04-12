import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginRequest } from "../services/authApi";
import { getRoomsRequest } from "../services/roomsApi";
import { ArrowLeftRight, Eye, EyeOff } from "lucide-react";

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

      localStorage.setItem("token", token);

      const roomsResponse = await getRoomsRequest(token);
      const initialRooms = Array.isArray(roomsResponse.data?.rooms) ? roomsResponse.data.rooms : [];

      navigate("/dashboard", {
        state: {
          initialRooms,
        },
      });
    } catch (error) {
      const message = error.response?.data?.message || "Unable to login. Please try again.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
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

        <button className="btn btn-google" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
