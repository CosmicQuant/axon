import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import type { User, SignupProfileDetails } from '../types';
import { VehicleType } from '../types';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const authService = {
  // Login with Email/Password
  login: async (email: string, password: string): Promise<User> => {
    console.log("Service: Attempting Email/Password Login...");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("Service: Auth Success. User ID:", firebaseUser.uid);

      // Fetch extra profile data from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        console.log("Service: Firestore profile found.");
        let userData = { id: firebaseUser.uid, email: firebaseUser.email!, ...userDoc.data() } as User;

        // Fetch extended profile if needed
        if (userData.role === 'driver') {
          const driverDoc = await getDoc(doc(db, 'drivers', firebaseUser.uid));
          if (driverDoc.exists()) {
            userData = { ...userData, ...driverDoc.data() };
          } else {
            // Quick Repair for driver
            console.log("Service: Driver doc missing, repairing...");
            await setDoc(doc(db, 'drivers', firebaseUser.uid), {
              userId: firebaseUser.uid,
              status: 'offline',
              rating: 5.0,
              totalTrips: 0,
              vehicleType: VehicleType.BODA,
              plateNumber: '',
              licenseNumber: '',
              idNumber: ''
            });
          }
        } else if (userData.role === 'business') {
          const businessDoc = await getDoc(doc(db, 'businesses', firebaseUser.uid));
          if (businessDoc.exists()) {
            userData = { ...userData, ...businessDoc.data() };
          } else {
            // Quick Repair for business
            console.log("Service: Business doc missing, repairing...");
            await setDoc(doc(db, 'businesses', firebaseUser.uid), {
              userId: firebaseUser.uid,
              companyName: userData.companyName || userData.name || 'My Business',
              verified: false
            });
          }
        }
        return userData;
      } else {
        console.warn("Service: User Authenticated but Firestore Profile MISSING. Attempting Repair...");
        // Critical Self-Repair: Create the missing user doc
        const newUserProfile: any = {
          name: firebaseUser.displayName || email.split('@')[0],
          email: firebaseUser.email,
          role: 'customer', // Default to customer if we lost the data
          avatar: `https://ui-avatars.com/api/?name=${email}`,
          phone: ''
        };
        await setDoc(userDocRef, newUserProfile);
        console.log("Service: Profile Repaired.");
        return { id: firebaseUser.uid, ...newUserProfile } as User;
      }
    } catch (error) {
      console.error("Service: Login Error", error);
      throw error;
    }
  },

  // Login/Signup with Google
  loginWithGoogle: async (role: 'customer' | 'driver' | 'business' = 'customer'): Promise<User> => {
    console.log("Service: Starting Google Auth...");
    try {
      let firebaseUser;

      const isNative = Capacitor.isNativePlatform();
      console.log("Is Native:", isNative);

      if (isNative) {
        console.log("Service: Using Native Google Auth");
        GoogleAuth.initialize();
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        firebaseUser = result.user;
      } else {
        console.log("Service: Using Web Google Popup");
        const result = await signInWithPopup(auth, googleProvider);
        firebaseUser = result.user;
      }

      console.log("Service: Google Auth Success. User:", firebaseUser.uid);

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);


      if (userDoc.exists()) {
        console.log("Service: User profile exists in 'users'. Fetching extended data...");
        let userData = { id: firebaseUser.uid, email: firebaseUser.email!, ...userDoc.data() } as User;

        // Ensure local consistency - if role in DB is different, maybe update or respect DB?
        // For now, let's fetch the specific doc based on the DB role (source of truth)
        const currentRole = userData.role;

        if (currentRole === 'driver') {
          const docRef = doc(db, 'drivers', firebaseUser.uid);
          const driverDoc = await getDoc(docRef);
          if (driverDoc.exists()) {
            userData = { ...userData, ...driverDoc.data() };
          } else {
            // Repair: Driver role but no driver doc? Create it.
            console.log("Service: Driver doc missing, repairing...");
            await setDoc(docRef, {
              userId: firebaseUser.uid,
              status: 'offline',
              rating: 5.0,
              totalTrips: 0,
              vehicleType: VehicleType.BODA,
              plateNumber: '',
              licenseNumber: '',
              idNumber: ''
            });
          }
        } else if (currentRole === 'business') {
          const docRef = doc(db, 'businesses', firebaseUser.uid);
          const businessDoc = await getDoc(docRef);
          if (businessDoc.exists()) {
            userData = { ...userData, ...businessDoc.data() };
          } else {
            // Repair
            console.log("Service: Business doc missing, repairing...");
            await setDoc(docRef, {
              userId: firebaseUser.uid,
              companyName: userData.companyName || userData.name,
              verified: false
            });
          }
        }
        return userData;
      } else {
        console.log("Service: New user. Creating profile...");
        // Create a profile for new Google users with the specified role
        const newUserProfile = {
          name: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email,
          role: role,
          avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.displayName}`,
          phone: ''
        };
        await setDoc(userDocRef, newUserProfile);

        // Create specific collection doc if needed
        if (role === 'driver') {
          await setDoc(doc(db, 'drivers', firebaseUser.uid), {
            userId: firebaseUser.uid,
            status: 'offline',
            rating: 5.0,
            totalTrips: 0,
            // Defaults, user must update profile later
            vehicleType: VehicleType.BODA,
            plateNumber: '',
            licenseNumber: '',
            idNumber: ''
          });
        } else if (role === 'business') {
          await setDoc(doc(db, 'businesses', firebaseUser.uid), {
            userId: firebaseUser.uid,
            companyName: newUserProfile.name,
            verified: false
          });
        }

        return { id: firebaseUser.uid, ...newUserProfile } as User;
      }
    } catch (error) {
      console.error("Service: Google Auth Failed", error);
      throw error;
    }
  },

  // Signup
  signup: async (
    name: string,
    email: string,
    password: string,
    role: 'customer' | 'driver' | 'business' = 'customer',
    profileDetails?: SignupProfileDetails
  ): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update Display Name in Auth
    await firebaseUpdateProfile(firebaseUser, { displayName: name });

    // Construct the extended user object
    const newUser: Partial<User> = {
      name,
      email,
      role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      phone: profileDetails?.phone || '',
      address: profileDetails?.address || '',
    };

    if (role === 'driver') {
      newUser.vehicleType = profileDetails?.vehicleType;
      newUser.plateNumber = profileDetails?.plateNumber;
      newUser.idNumber = profileDetails?.idNumber;
      newUser.licenseNumber = profileDetails?.licenseNumber;
      newUser.kraPin = profileDetails?.kraPin;
    } else if (role === 'business') {
      newUser.companyName = name;
      newUser.kraPin = profileDetails?.kraPin;
      newUser.businessDescription = profileDetails?.businessDescription;
    }

    // Save to Firestore 'users' collection (Common Auth Data)
    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

    // Save to Specific Collections
    if (role === 'driver') {
      await setDoc(doc(db, 'drivers', firebaseUser.uid), {
        userId: firebaseUser.uid,
        vehicleType: profileDetails?.vehicleType,
        plateNumber: profileDetails?.plateNumber,
        idNumber: profileDetails?.idNumber,
        licenseNumber: profileDetails?.licenseNumber,
        kraPin: profileDetails?.kraPin,
        status: 'offline',
        rating: 5.0,
        totalTrips: 0
      });
    } else if (role === 'business') {
      await setDoc(doc(db, 'businesses', firebaseUser.uid), {
        userId: firebaseUser.uid,
        companyName: name,
        kraPin: profileDetails?.kraPin,
        address: profileDetails?.address,
        businessDescription: profileDetails?.businessDescription,
        verified: false
      });
    }

    return { id: firebaseUser.uid, ...newUser } as User;
  },

  // Update Profile
  updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    const userDocRef = doc(db, 'users', userId);

    // 1. Update main users collection
    await updateDoc(userDocRef, updates);

    // 2. Update specific collections based on role
    // We need to fetch current role if not provided in updates
    let role = updates.role;
    if (!role) {
      const snap = await getDoc(userDocRef);
      role = snap.data()?.role;
    }

    if (role === 'driver') {
      const driverRef = doc(db, 'drivers', userId);
      const driverUpdates: any = {};
      if (updates.name !== undefined) driverUpdates.name = updates.name;
      if (updates.phone !== undefined) driverUpdates.phone = updates.phone;
      if (updates.avatar !== undefined) driverUpdates.avatar = updates.avatar;
      if (updates.idNumber !== undefined) driverUpdates.idNumber = updates.idNumber;
      if (updates.licenseNumber !== undefined) driverUpdates.licenseNumber = updates.licenseNumber;
      if (updates.plateNumber !== undefined) driverUpdates.plateNumber = updates.plateNumber;
      if (updates.vehicleType !== undefined) driverUpdates.vehicleType = updates.vehicleType;
      if (updates.kraPin !== undefined) driverUpdates.kraPin = updates.kraPin;
      if (updates.address !== undefined) driverUpdates.address = updates.address;
      if (updates.profileImage !== undefined) driverUpdates.profileImage = updates.profileImage;
      if (updates.licenseImage !== undefined) driverUpdates.licenseImage = updates.licenseImage;
      if (updates.idImage !== undefined) driverUpdates.idImage = updates.idImage;

      // Check if driver doc exists before updating
      const dSnap = await getDoc(driverRef);
      if (dSnap.exists()) {
        await updateDoc(driverRef, driverUpdates);
      } else {
        await setDoc(driverRef, { userId, ...driverUpdates, status: 'offline', rating: 5.0, totalTrips: 0 });
      }
    } else if (role === 'business') {
      const businessRef = doc(db, 'businesses', userId);
      const bizUpdates: any = {};
      if (updates.companyName !== undefined) bizUpdates.companyName = updates.companyName;
      if (updates.kraPin !== undefined) bizUpdates.kraPin = updates.kraPin;
      if (updates.address !== undefined) bizUpdates.address = updates.address;
      if (updates.phone !== undefined) bizUpdates.phone = updates.phone;

      const bSnap = await getDoc(businessRef);
      if (bSnap.exists()) {
        await updateDoc(businessRef, bizUpdates);
      } else {
        await setDoc(businessRef, { userId, ...bizUpdates, verified: false });
      }
    }

    // Return fully merged updated user
    const updatedSnap = await getDoc(userDocRef);
    let userData = { id: userId, ...updatedSnap.data() } as User;

    if (role === 'driver') {
      const dSnap = await getDoc(doc(db, 'drivers', userId));
      if (dSnap.exists()) userData = { ...userData, ...dSnap.data() };
    } else if (role === 'business') {
      const bSnap = await getDoc(doc(db, 'businesses', userId));
      if (bSnap.exists()) userData = { ...userData, ...bSnap.data() };
    }

    return userData;
  },

  // Logout
  logout: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Force Google Sign-Out on native devices to clear the "Sticky" session
        await GoogleAuth.signOut();
      }
    } catch (error) {
      // Allow non-blocking failure (e.g. if user wasn't logged in with Google)
      console.log('Native Google Logout skipped or failed', error);
    }
    await signOut(auth);
  },

  // Reset Password
  resetPassword: async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  },

  updatePassword: async (newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    await firebaseUpdatePassword(user, newPassword);
  },

  updateEmail: async (newEmail: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    // Note: This might require recent login
    try {
      await updateDoc(doc(db, 'users', user.uid), { email: newEmail });
      // We also update the auth email if possible, but Firestore is our primary source for the UI
      // In a real app, you'd use verifyBeforeUpdateEmail
    } catch (error) {
      console.error("Failed to update email in Firestore", error);
      throw error;
    }
  },

  deleteAccount: async (userId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || user.uid !== userId) throw new Error("Unauthorized or no user logged in");

    try {
      // 1. Delete from Firestore
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      const role = userSnap.data()?.role;

      if (role === 'driver') {
        await deleteDoc(doc(db, 'drivers', userId));
      } else if (role === 'business') {
        await deleteDoc(doc(db, 'businesses', userId));
      }
      await deleteDoc(userDocRef);

      // 2. Delete from Firebase Auth
      await user.delete();
    } catch (error) {
      console.error("Service: Delete Account Error", error);
      throw error;
    }
  }
};
