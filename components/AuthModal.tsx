
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User, ArrowRight, Loader, Truck, ArrowLeft, CheckCircle, Briefcase, FileText, Phone, CreditCard, MapPin, Globe, Upload, Camera, Shield } from 'lucide-react';
import { VehicleType } from '../types';
import { authService } from '../services/authService';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: 'LOGIN' | 'SIGNUP' | 'ROLE_SELECT';
  preselectedRole?: 'customer' | 'driver' | 'business';
  customTitle?: string;
  customDescription?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultView = 'LOGIN', preselectedRole, customTitle, customDescription }) => {
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'ROLE_SELECT'>(defaultView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Roles
  const [role, setRole] = useState<'customer' | 'driver' | 'business'>('customer');

  // Driver specific
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.BODA);
  const [plate, setPlate] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [pinNumber, setPinNumber] = useState(''); // Generic for Tax/KRA PIN
  const [businessDescription, setBusinessDescription] = useState('');

  // Driver document uploads
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  useEffect(() => {
    // If default is signup, we might want to start at role select if no role preselected, 
    // but the user might have clicked "Sign up" generic button. 
    // Let's default SIGNUP request to show role select first if generic.
    if (defaultView === 'SIGNUP' && !preselectedRole) {
      setView('ROLE_SELECT');
    } else {
      setView(defaultView);
    }
  }, [defaultView, isOpen, preselectedRole]);

  useEffect(() => {
    if (preselectedRole) setRole(preselectedRole);
  }, [preselectedRole, isOpen]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    console.log("Modal: Google Auth Clicked. Role Selected:", role);
    setLoading(true);
    try {
      const gUser = await loginWithGoogle(role);
      console.log("Modal: Google Login Success");
      onClose(); // Close modal on success
      if (gUser?.role === 'driver') navigate('/driver');
      if (gUser?.role === 'business') navigate('/business-dashboard');
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || 'Google authentication failed');
    } finally {
      console.log("Modal: Auth Finished. Setting loading false.");
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, reverse geocode here.
          setAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.error("Error getting location", error);
          setAddress("Current Device Location (Simulation)");
        }
      );
    } else {
      setAddress("Device Location Unavailable");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field Validation
    if (view === 'SIGNUP') {
      if (!name) return setError('Name is required');
      if (!email) return setError('Email is required');
      if (!password) return setError('Password is required');
      if (!phone || phone.length < 10) return setError('Valid phone number is required');

      if (role === 'driver' || role === 'business') {
        if (!pinNumber) return setError('KRA PIN is required');
        if (!address) return setError('Physical address/location is required');

        if (role === 'driver') {
          if (!idNumber) return setError('National ID is required');
          if (!licenseNumber) return setError('License number is required');
          if (!plate) return setError('Vehicle plate number is required');
          if (!idCardImage) return setError('Please upload a photo of your ID card');
          if (!licenseImage) return setError('Please upload a photo of your driving license');
        }
      }
    }

    setLoading(true);

    try {
      if (view === 'LOGIN') {
        const loggedUser = await login(email, password);
        onClose();
        // Immediate redirection
        if (loggedUser?.role === 'driver') navigate('/driver');
        if (loggedUser?.role === 'business') navigate('/business-dashboard');
      } else if (view === 'SIGNUP') {
        const profileDetails = {
          phone,
          address,
          kraPin: pinNumber,
          businessDescription: role === 'business' ? businessDescription : undefined,
          ...(role === 'driver' ? {
            vehicleType,
            plateNumber: plate,
            idNumber,
            licenseNumber,
            idCardImage: idCardImage || undefined,
            licenseImage: licenseImage || undefined,
          } : {})
        };
        await signup(name, email, password, role, profileDetails);
        onClose();
      } else if (view === 'FORGOT_PASSWORD') {
        await authService.resetPassword(email);
        setResetSent(true);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || 'An error occurred';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        msg = "Incorrect email or password. Please check your details.";
      } else if (msg.includes('email-already-in-use')) {
        msg = "This email is already registered. Please log in instead.";
      } else {
        msg = msg.replace('Firebase: ', '').replace('auth/', '');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPassword = () => (
    <div className="px-8 py-6 space-y-6">
      {resetSent ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Check your email</h3>
            <p className="text-gray-500 text-sm mt-2">
              We have sent password recovery instructions to <span className="font-bold text-gray-900">{email}</span>
            </p>
          </div>
          <button
            onClick={() => {
              setResetSent(false);
              setView('LOGIN');
            }}
            className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 transition-colors"
          >
            Back to Log in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
            <p className="text-sm text-gray-500 mt-2">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-brand-700 hover:shadow-brand-500/30 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <span>Send Reset Link</span>}
          </button>

          <button
            type="button"
            onClick={() => setView('LOGIN')}
            className="w-full flex items-center justify-center text-sm font-semibold text-gray-500 hover:text-gray-900 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Log in
          </button>
        </form>
      )}
    </div>
  );

  const renderRoleSelection = () => (
    <div className="px-8 py-6 space-y-4">
      <h3 className="text-xl font-bold text-gray-900 text-center mb-6">Choose account type</h3>

      <button
        onClick={() => { setRole('customer'); setView('SIGNUP'); }}
        className="w-full flex items-center p-4 rounded-xl border-2 border-gray-100 hover:border-brand-500/50 hover:bg-brand-50 transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 group-hover:bg-brand-500/30 group-hover:text-brand-600 mr-4 transition-colors">
          <User className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-gray-900 group-hover:text-brand-600">Customer</p>
          <p className="text-sm text-gray-500">I want to send or receive packages.</p>
        </div>
      </button>

      <button
        onClick={() => { setRole('driver'); setView('SIGNUP'); }}
        className="w-full flex items-center p-4 rounded-xl border-2 border-gray-100 hover:border-yellow-400/50 hover:bg-yellow-50 transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-600 group-hover:bg-yellow-500/30 group-hover:text-yellow-600 mr-4 transition-colors">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-gray-900 group-hover:text-yellow-600">Driver</p>
          <p className="text-sm text-gray-500">I want to deliver and earn money.</p>
        </div>
      </button>

      <button
        onClick={() => { setRole('business'); setView('SIGNUP'); }}
        className="w-full flex items-center p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500/50 hover:bg-blue-50 transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 group-hover:bg-blue-500/30 group-hover:text-blue-600 mr-4 transition-colors">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-gray-900 group-hover:text-blue-600">Business</p>
          <p className="text-sm text-gray-500">I want to manage deliveries for my company.</p>
        </div>
      </button>

      <div className="pt-4 text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={() => setView('LOGIN')} className="font-bold text-brand-600 hover:underline">Log in</button>
        </p>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={onClose}
          ></motion.div>

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] sm:max-h-[90vh] overflow-y-auto no-scrollbar border border-gray-100 flex flex-col mb-[env(safe-area-inset-bottom,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 sm:hidden flex-shrink-0" onClick={onClose} />

            {/* Header - Only for Login/Signup views, Hidden for forgot password inside logic */}
            {view !== 'FORGOT_PASSWORD' && view !== 'ROLE_SELECT' && (
              <div className="px-8 pt-6 sm:pt-8 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {customTitle || (view === 'LOGIN' ? 'Welcome back' : 'Create account')}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium italic">
                    {customDescription || (view === 'LOGIN'
                      ? 'Access your AXON dashboard.'
                      : (role === 'business' ? 'Scale your business logistics.' : 'Join AXON to start moving.'))}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Close button absolute for forgot password view */}
            {view === 'FORGOT_PASSWORD' && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mx-8 mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center border border-red-100">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></div>
                {error}
              </div>
            )}

            {view === 'FORGOT_PASSWORD' ? renderForgotPassword() : view === 'ROLE_SELECT' ? renderRoleSelection() : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

                  {/* Google Auth */}
                  {(view === 'LOGIN' || view === 'SIGNUP') && (
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="w-full flex items-center justify-center bg-white border border-gray-200 text-gray-900 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors mb-2 shadow-sm"
                    >
                      <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        className="w-5 h-5 mr-3"
                      />
                      <span className="text-gray-700 font-semibold text-sm">
                        {view === 'LOGIN' ? 'Sign in with Google' : 'Sign up with Google'}
                      </span>
                    </button>
                  )}

                  {/* Role Selectors */}
                  {/* Role Selectors were here, now moved to dedicated screen */}

                  {view === 'SIGNUP' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        {role === 'business' ? 'Company Name' : 'Full Name'}
                      </label>
                      <div className="relative">
                        {role === 'business' ? (
                          <Briefcase className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        ) : (
                          <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        )}
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                          placeholder={role === 'business' ? "Acme Logistics Ltd" : "John Doe"}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  {/* Phone for ALL roles */}
                  {view === 'SIGNUP' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                            placeholder="0700 000 000"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">National ID</label>
                        <div className="relative">
                          <Shield className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            required
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                            placeholder="12345678"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Driver & Business Fields */}
                  {view === 'SIGNUP' && (role === 'driver' || role === 'business') && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">
                        {role === 'driver' ? 'Tax PIN (KRA)' : 'Company KRA PIN'}
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          required
                          value={pinNumber}
                          onChange={(e) => setPinNumber(e.target.value.toUpperCase())}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none uppercase bg-gray-50 placeholder:text-gray-300"
                          placeholder="A000000000Z"
                        />
                      </div>
                    </div>
                  )}

                  {/* Address with Location Button */}
                  {view === 'SIGNUP' && (role === 'driver' || role === 'business') && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                          {role === 'driver' ? 'Home Location' : 'Business Location'}
                        </label>
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold hover:bg-blue-100 flex items-center border border-blue-100"
                        >
                          <MapPin className="w-3 h-3 mr-1" /> Use Device Location
                        </button>
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                          placeholder="e.g. Westlands, Nairobi"
                        />
                      </div>
                    </div>
                  )}

                  {/* Business Description Field */}
                  {view === 'SIGNUP' && role === 'business' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Business Description</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <textarea
                          required
                          value={businessDescription}
                          onChange={(e) => setBusinessDescription(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 min-h-[80px] placeholder:text-gray-300"
                          placeholder="Describe your business and typical shipping needs..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Driver Specific Fields */}
                  {view === 'SIGNUP' && role === 'driver' && (
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 border border-gray-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase">License No.</label>
                          <input
                            type="text"
                            required
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-brand-500/50 bg-white placeholder:text-gray-300"
                            placeholder="DL..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Number Plate</label>
                          <input
                            type="text"
                            required
                            value={plate}
                            onChange={(e) => setPlate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-brand-500/50 uppercase bg-white placeholder:text-gray-300"
                            placeholder="KDA 123A"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Vehicle Type</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-brand-500/50 bg-white"
                        >
                          {Object.values(VehicleType).map(v => <option key={v} value={v} className="bg-white">{v}</option>)}
                        </select>
                      </div>

                      {/* Document Uploads Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Upload Documents</p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* ID Card Upload */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">ID Card (Front)</label>
                            <div
                              onClick={() => document.getElementById('id-card-upload')?.click()}
                              className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${idCardImage ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-brand-500/50'}`}
                            >
                              {idCardImage ? (
                                <img src={idCardImage} alt="ID Card" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <Camera className="w-5 h-5 text-gray-300 mb-1" />
                                  <span className="text-[10px] font-bold text-gray-400">Tap to upload</span>
                                </>
                              )}
                            </div>
                            <input
                              id="id-card-upload"
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIdCardFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => setIdCardImage(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>

                          {/* Driving License Upload */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Driving License</label>
                            <div
                              onClick={() => document.getElementById('license-upload')?.click()}
                              className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${licenseImage ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-brand-500/50'}`}
                            >
                              {licenseImage ? (
                                <img src={licenseImage} alt="License" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <Upload className="w-5 h-5 text-gray-300 mb-1" />
                                  <span className="text-[10px] font-bold text-gray-400">Tap to upload</span>
                                </>
                              )}
                            </div>
                            <input
                              id="license-upload"
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setLicenseFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => setLicenseImage(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-2 text-center">Photos must be clear and readable. These will be verified by our team.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
                      {view === 'LOGIN' && (
                        <button
                          type="button"
                          onClick={() => setView('FORGOT_PASSWORD')}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-brand-500/50 transition-all outline-none bg-gray-50 placeholder:text-gray-300"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-brand-700 hover:shadow-brand-500/30 transition-all flex items-center justify-center space-x-2 mt-4"
                  >
                    {loading ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>
                          {view === 'LOGIN' ? 'Sign In' : (
                            role === 'driver' ? 'Register as Driver' : (
                              role === 'business' ? 'Register Business' : 'Sign Up'
                            )
                          )}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                </form>

                {/* Footer */}
                {!view.includes('ROLE_SELECT') && (
                  <div className="px-8 pb-8 text-center">
                    <p className="text-sm text-gray-500">
                      {view === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}{' '}
                      <button
                        onClick={() => {
                          if (view === 'LOGIN') setView('ROLE_SELECT');
                          else setView('LOGIN');
                          setError('');
                        }}
                        className="font-bold text-brand-600 hover:text-brand-700 underline decoration-2 underline-offset-2"
                      >
                        {view === 'LOGIN' ? 'Sign up' : 'Log in'}
                      </button>
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div >
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
