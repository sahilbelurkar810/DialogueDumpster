// src/components/Navbar.js
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../AuthContext";
import logo from "../logo-d.png";

const Nav = styled.nav`
  background-color: var(--color-dark-surface);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);

  @media (max-width: 768px) {
    padding: 1rem;
    flex-wrap: wrap;
  }
`;

const Brand = styled(Link)`
  text-decoration: none;
  white-space: nowrap;
  display: flex;
  align-items: center;

  img {
    height: 80px;
    width: auto;
    transition: transform 0.2s ease-in-out;
  }

  &:hover img {
    transform: scale(1.05);
  }

  @media (max-width: 480px) {
    img {
      height: 50px;
    }
  }
`;

const NavContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
`;

const NavLinks = styled.ul`
  list-style: none;
  display: flex;
  gap: 2rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    text-align: center;
    max-height: ${(props) => (props.isOpen ? "500px" : "0")};
    overflow: hidden;
    transition: max-height 0.3s ease-in-out;
  }
`;

const NavLink = styled(Link)`
  font-weight: 500;
  text-decoration: none;
  color: var(--color-text-light);
  transition: color 0.2s ease-in-out;
  &.active {
    color: var(--color-accent-primary);
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0;
    display: block;
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
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
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
  margin: 0;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }
`;

const HamburgerMenu = styled.button`
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  @media (max-width: 768px) {
    display: flex;
  }

  span {
    width: 100%;
    height: 3px;
    background-color: var(--color-accent-primary);
    border-radius: 5px;
    transition: all 0.3s ease-in-out;
  }

  ${(props) =>
    props.isOpen &&
    `
    span:nth-child(1) {
      transform: translateY(8px) rotate(45deg);
    }
    span:nth-child(2) {
      opacity: 0;
    }
    span:nth-child(3) {
      transform: translateY(-8px) rotate(-45deg);
    }
  `}
`;

const AuthButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileAuthButtonsContainer = styled.div`
  display: none;
  flex-direction: column;
  width: 100%;
  gap: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-dark-border);
  margin-top: 0.8rem;

  @media (max-width: 768px) {
    display: ${(props) => (props.isOpen ? "flex" : "none")};

    ${NavButtonPrimary}, ${NavButtonSecondary} {
      width: 100%;
    }
  }
`;

const UserContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
  }
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
        <img src={logo} alt="Dialogue Dumpster Logo" />
      </Brand>
      <HamburgerMenu isOpen={isOpen} onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </HamburgerMenu>
      <NavContainer>
        <NavLinks isOpen={isOpen}>
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
            <AuthButtonsContainer>
              <NavButtonSecondary to="/login" onClick={closeMenu}>
                Login
              </NavButtonSecondary>
              <NavButtonPrimary to="/signup" onClick={closeMenu}>
                Sign Up
              </NavButtonPrimary>
            </AuthButtonsContainer>
            <MobileAuthButtonsContainer isOpen={isOpen}>
              <NavButtonSecondary to="/login" onClick={closeMenu}>
                Login
              </NavButtonSecondary>
              <NavButtonPrimary to="/signup" onClick={closeMenu}>
                Sign Up
              </NavButtonPrimary>
            </MobileAuthButtonsContainer>
          </>
        ) : (
          <UserContainer>
            <UserInfo>Welcome, {user?.username || "User"}</UserInfo>
            <NavButtonSecondary to="#" onClick={handleLogout}>
              Logout
            </NavButtonSecondary>
          </UserContainer>
        )}
      </NavContainer>
    </Nav>
  );
}

export default Navbar;
