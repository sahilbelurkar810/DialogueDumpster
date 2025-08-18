// src/components/Navbar.js
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../AuthContext";

const Nav = styled.nav`
  background-color: var(--color-dark-surface);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
`;

const Brand = styled(Link)`
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-accent-primary);
  text-decoration: none;
`;

const NavLinks = styled.ul`
  list-style: none;
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const NavLink = styled(Link)`
  font-weight: 500;
  text-decoration: none;
  color: var(--color-text-light);
  transition: color 0.2s ease-in-out;
  &.active {
    color: var(--color-accent-primary);
  }
`;

const StyledButton = styled(Link)`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: var(--border-radius-lg);
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease-in-out;
  text-align: center;
  text-decoration: none;
`;

const NavButtonPrimary = styled(StyledButton)`
  background-color: var(--color-accent-primary);
  color: white;
  &:hover {
    background-color: #2563eb;
  }
`;

const NavButtonSecondary = styled(StyledButton)`
  background-color: var(--color-dark-surface);
  color: var(--color-text-light);
  border: 1px solid var(--color-dark-border);
  &:hover {
    background-color: #111827;
  }
`;

const UserInfo = styled.p`
  font-size: 1rem;
  color: var(--color-text-light);
  font-weight: 500;
`;

function Navbar() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  return (
    <Nav>
      <Brand to="/" onClick={closeMenu}>
        DIALOGUE DUMPSTER
      </Brand>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <NavLinks>
          <li>
            <NavLink
              to="/"
              className={location.pathname === "/" ? "active" : ""}
              onClick={closeMenu}
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/dialogue"
              className={location.pathname === "/dialogue" ? "active" : ""}
              onClick={closeMenu}
            >
              Dialogue
            </NavLink>
          </li>
          {token && (
            <li>
              <NavLink
                to="/token"
                className={location.pathname === "/token" ? "active" : ""}
                onClick={closeMenu}
              >
                Token
              </NavLink>
            </li>
          )}
        </NavLinks>
        {!token ? (
          <>
            <NavButtonSecondary to="/login">Login</NavButtonSecondary>
            <NavButtonPrimary to="/signup">Sign Up</NavButtonPrimary>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <UserInfo>Welcome, {user?.username || "User"}</UserInfo>
            <NavButtonSecondary to="#" onClick={handleLogout}>
              Logout
            </NavButtonSecondary>
          </div>
        )}
      </div>
    </Nav>
  );
}

export default Navbar;
