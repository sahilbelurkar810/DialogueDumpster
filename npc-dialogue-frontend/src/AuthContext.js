// src/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import Cookies from "js-cookie";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = Cookies.get("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => Cookies.get("authToken") || null);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    Cookies.set("user", JSON.stringify(userData), { expires: 7 });
    Cookies.set("authToken", authToken, { expires: 7 }); // Expires in 7 days
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    Cookies.remove("user");
    Cookies.remove("authToken");
  };

  const value = {
    user,
    token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
