"use client";

import React, { createContext, useContext } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  isAuthenticated,
  isAdmin,
  loading,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}) {
  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
