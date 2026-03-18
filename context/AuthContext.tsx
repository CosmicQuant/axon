import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { VehicleType } from '../types';
import { authService } from '../services/authService';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface ProfileDetails {
  phone?: string;
  idNumber?: string;
  licenseNumber?: string;
  address?: string;
  kraPin?: string;
  vehicleType?: VehicleType;
  plateNumber?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  switchRole: (role: 'customer' | 'driver' | 'business') => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (role?: 'customer' | 'driver' | 'business') => Promise<User>;
  signup: (name: string, email: string, password: string, role?: 'customer' | 'driver' | 'business', profileDetails?: ProfileDetails) => Promise<User>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            let userData = { id: firebaseUser.uid, email: firebaseUser.email!, ...docSnap.data() } as User;

            // Check for extended profile data if not present or just to be safe
            if (userData.role === 'driver') {
              const driverDoc = await getDoc(doc(db, 'drivers', firebaseUser.uid));
              if (driverDoc.exists()) {
                userData = { ...userData, ...driverDoc.data() };
              }
            } else if (userData.role === 'business') {
              const businessDoc = await getDoc(doc(db, 'businesses', firebaseUser.uid));
              if (businessDoc.exists()) {
                userData = { ...userData, ...businessDoc.data() };
              }
            }

            setUser(userData);
          } else {
            // Fallback if firestore doc doesn't exist yet (e.g. just created)
            // This might happen if onAuthStateChanged fires before signup completes writing to DB
            console.warn("User authenticated but no profile found in Firestore");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const switchRole = async (role: 'customer' | 'driver' | 'business') => {
    if (!user) return;

    // Update local state immediately for UI responsiveness
    setUser(prev => prev ? { ...prev, role } : null);

    // Update Firestore to persist the role change
    try {
      await authService.updateProfile(user.id, { role });
    } catch (error) {
      console.error("Failed to update role in Firestore", error);
      // Optionally revert local state if failed
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (role: 'customer' | 'driver' | 'business' = 'customer'): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedUser = await authService.loginWithGoogle(role);
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: 'customer' | 'driver' | 'business' = 'customer', profileDetails?: ProfileDetails): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await authService.signup(name, email, password, role, profileDetails);
      setUser(newUser);
      return newUser;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    // We don't set global isLoading to true here to avoid app-wide flickering/resetting
    try {
      const updatedUser = await authService.updateProfile(user.id, updates);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update profile", error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await authService.updatePassword(newPassword);
    } catch (error) {
      console.error("Failed to update password", error);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await authService.deleteAccount(user.id);
      setUser(null);
    } catch (error) {
      console.error("AuthContext: Delete Account Error", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      switchRole,
      login,
      loginWithGoogle,
      signup,
      updateUser,
      updatePassword,
      logout,
      deleteAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
