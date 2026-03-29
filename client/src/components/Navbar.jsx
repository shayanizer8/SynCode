import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <h1 className="brand">SynCode</h1>
        <nav className="nav-links">
          <NavLink to="/login" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Login
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Register
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
