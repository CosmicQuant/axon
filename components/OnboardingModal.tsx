
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    X, User, Truck, Briefcase, FileText, Phone, MapPin,
    ArrowRight, Loader, CheckCircle, Shield, Building2, LogOut, AlertTriangle,
    Camera, Upload, Image as ImageIcon, Navigation
} from 'lucide-react';
import { VehicleType } from '../types';
import { VEHICLES } from './booking/constants';
import { storageService } from '../services/storageService';
import { mapService } from '../services/mapService';
import { compressImage } from '../utils/imageUtils';

interface OnboardingModalProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen: propIsOpen, onClose }) => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (propIsOpen !== undefined) {
            setIsOpen(propIsOpen);
        }
    }, [propIsOpen]);

    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [kraPin, setKraPin] = useState('');

    // Driver specific
    const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.BODA);
    const [plateNumber, setPlateNumber] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');

    // Driver vehicle spec (KeNHA / EAC Vehicle Load Control Act compliance)
    // — actual GVW, payload, tare, and axle count as declared by the driver/
    // fleet partner. Used for payload-aware order matching.
    const [vehicleId, setVehicleId] = useState('');
    const [payloadTonnes, setPayloadTonnes] = useState('');
    const [gvwTonnes, setGvwTonnes] = useState('');
    const [tareTonnes, setTareTonnes] = useState('');
    const [axleCount, setAxleCount] = useState('');

    // Business specific
    const [businessRegNumber, setBusinessRegNumber] = useState('');

    // Image Upload State
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string>('');
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [licensePreview, setLicensePreview] = useState<string>('');
    const [idFile, setIdFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string>('');
    const [pinCertificateFile, setPinCertificateFile] = useState<File | null>(null);
    const [pinCertificatePreview, setPinCertificatePreview] = useState<string>('');

    // Address Autocomplete
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAddressInput = (val: string) => {
        setAddress(val);
        setAddressSuggestions([]);
        if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
        if (val.length > 2) {
            addressDebounceRef.current = setTimeout(async () => {
                const results = await mapService.getSuggestions(val);
                setAddressSuggestions(results);
            }, 350);
        }
    };

    const handleUseCurrentLocation = () => {
        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    const results = await mapService.getSuggestions(`${lat},${lng}`);
                    if (results.length > 0) {
                        setAddress(results[0].label);
                    } else {
                        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                    }
                } catch {
                    setAddress('');
                } finally {
                    setIsLoadingLocation(false);
                }
            },
            () => setIsLoadingLocation(false),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'license' | 'id' | 'pinCertificate') => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === 'profile') {
                setProfileFile(file);
                setProfilePreview(URL.createObjectURL(file));
            } else if (type === 'license') {
                setLicenseFile(file);
                setLicensePreview(URL.createObjectURL(file));
            } else if (type === 'id') {
                setIdFile(file);
                setIdPreview(URL.createObjectURL(file));
            } else if (type === 'pinCertificate') {
                setPinCertificateFile(file);
                setPinCertificatePreview(URL.createObjectURL(file));
            }
        }
    };

    useEffect(() => {
        if (user) {
            const isDriver = user.role === 'driver';
            const isBusiness = user.role === 'business';

            // If already marked as onboarded, don't show the modal
            if (user.onboarded) {
                setIsOpen(false);
                return;
            }

            // Core requirements
            const hasBasicInfo = user.name && user.phone;

            const needsOnboarding =
                !user.onboarded ||
                (isDriver && (
                    !hasBasicInfo || !user.idNumber ||
                    !user.licenseNumber ||
                    !user.plateNumber ||
                    !user.kraPin ||
                    !user.address ||
                    !user.vehicleType ||
                    !user.licenseImage ||
                    !user.idImage ||
                    !user.profileImage
                )) ||
                (isBusiness && (!hasBasicInfo || !user.kraPin || !user.address || !user.businessRegNumber || !user.pinCertificateImage)) ||
                (user.role === 'customer' && (!hasBasicInfo || !user.idNumber));

            if (needsOnboarding) {
                setIsOpen(true);
                setName(isBusiness ? (user.companyName || user.name || '') : (user.name || ''));
                setPhone(user.phone || '');
                setAddress(user.address || '');
                setKraPin(user.kraPin || '');
                setIdNumber(user.idNumber || '');
                if (isDriver) {
                    setVehicleType(user.vehicleType || VehicleType.BODA);
                    setPlateNumber(user.plateNumber || '');
                    setLicenseNumber(user.licenseNumber || '');
                    setVehicleId((user as any).vehicleId || '');
                    setPayloadTonnes((user as any).payloadTonnes ? String((user as any).payloadTonnes) : '');
                    setGvwTonnes((user as any).gvwTonnes ? String((user as any).gvwTonnes) : '');
                    setTareTonnes((user as any).tareTonnes ? String((user as any).tareTonnes) : '');
                    setAxleCount((user as any).axleCount ? String((user as any).axleCount) : '');
                } else if (isBusiness) {
                    setBusinessRegNumber(user.businessRegNumber || '');
                }
            } else {
                setIsOpen(false);
            }
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const validateForm = () => {
        if (!name) return "Full name is required";
        if (!phone || phone.length < 10) return "Valid phone number is required";
        
        if (user.role !== 'business') {
            if (!idNumber) return "National ID number is required";
        }

        // Drivers and Businesses need more
        if (user.role !== 'customer') {
            if (!address) return "Address/Location is required";
            if (!kraPin) return "KRA PIN is required";
        }

        if (user.role === 'business') {
            if (!businessRegNumber) return "Business Registration Number is required";
            if (!pinCertificateFile && !user.pinCertificateImage) return "Please upload your PIN Certificate";
        }

        if (user.role === 'driver') {
            if (!licenseNumber) return "Driving License number is required";
            if (!plateNumber) return "Vehicle Plate Number is required";
            if (!licenseFile && !user.licenseImage) return "Please upload your Driving License photo";
            if (!idFile && !user.idImage) return "Please upload your National ID photo";
            if (!profileFile && !user.profileImage) return "Please upload your profile photo (Clear headshot)";
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updates: any = {
                name,
                phone,
                onboarded: true
            };
            
            if (user.role !== 'business') {
                updates.idNumber = idNumber;
            }

            // Run uploads sequentially to prevent Out-Of-Memory crashes on mobile devices during image compression.
            if (profileFile) {
                const compressedBlob = await compressImage(profileFile);
                const url = await storageService.uploadFile(compressedBlob, `users/${user.id}/profile_${Date.now()}`);
                updates.profileImage = url;
                updates.avatar = url;
                updates.photoURL = url;
            }

            if (licenseFile) {
                const compressedBlob = await compressImage(licenseFile);
                updates.licenseImage = await storageService.uploadFile(compressedBlob, `users/${user.id}/license_${Date.now()}`);
            }

            if (idFile) {
                const compressedBlob = await compressImage(idFile);
                updates.idImage = await storageService.uploadFile(compressedBlob, `users/${user.id}/id_${Date.now()}`);
            }

            if (pinCertificateFile) {
                const compressedBlob = await compressImage(pinCertificateFile);
                updates.pinCertificateImage = await storageService.uploadFile(compressedBlob, `users/${user.id}/pincert_${Date.now()}`);
            }

            if (user.role !== 'customer') {
                updates.address = address;
                updates.kraPin = kraPin.toUpperCase();
            }

            if (user.role === 'driver') {
                updates.licenseNumber = licenseNumber;
                updates.plateNumber = plateNumber.toUpperCase();
                updates.vehicleType = vehicleType;
                // Vehicle spec — feeds payload-aware matching.
                if (vehicleId) updates.vehicleId = vehicleId;
                if (payloadTonnes) updates.payloadTonnes = parseFloat(payloadTonnes);
                if (gvwTonnes) updates.gvwTonnes = parseFloat(gvwTonnes);
                if (tareTonnes) updates.tareTonnes = parseFloat(tareTonnes);
                if (axleCount) updates.axleCount = parseInt(axleCount);
            } else if (user.role === 'business') {
                updates.companyName = name;
                updates.businessRegNumber = businessRegNumber;
            }

            await updateUser(updates);
            setIsOpen(false);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        navigate('/');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"></div>

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border border-gray-100">
                {/* Header */}
                <div className="px-8 py-8 bg-brand-600 text-white relative">
                    <div className="flex items-center space-x-3 mb-2">
                        <Shield className="w-6 h-6 text-brand-200" />
                        <h2 className="text-2xl font-extrabold tracking-tight">Complete Your Profile</h2>
                    </div>
                    <p className="text-brand-100 text-sm">
                        We need a few more details to get your {user.role} account verified and ready for deliveries.
                    </p>

                    <div className="absolute -bottom-6 right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -top-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-8 bg-white">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-xl flex items-start">
                            <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Profile Image Section */}
                        <div className="flex flex-col items-center justify-center space-y-2 pb-2">
                            <div className="relative group">
                                <div className={`w-20 h-20 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center transition-all ${!profilePreview ? 'group-hover:border-brand-200 group-hover:bg-brand-50' : ''}`}>
                                    {profilePreview ? (
                                        <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-gray-400 group-hover:text-brand-500 transition-colors" />
                                    )}
                                </div>
                                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-brand-700 shadow-sm transition-all text-white">
                                    <Upload className="w-3 h-3" />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
                                </label>
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                Official Profile Photo {user.role === 'driver' && <span className="text-red-500">* Required</span>}
                            </p>
                        </div>

                        {/* Common Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                    {user.role === 'business' ? 'Company Name' : 'Full Name'}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                        {user.role === 'business' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm placeholder:text-gray-400"
                                        placeholder={user.role === 'business' ? "e.g. Acme Logistics" : "Your Name"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center">
                                    Phone Number <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">Required</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm placeholder:text-gray-400"
                                        placeholder="0700 000 000"
                                    />
                                </div>
                            </div>
                        </div>

                        {user.role !== 'business' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">National ID Number</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={idNumber}
                                        onChange={(e) => setIdNumber(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm placeholder:text-gray-400"
                                        placeholder="12345678"
                                    />
                                </div>
                            </div>
                        )}

                        {user.role !== 'customer' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">KRA PIN Number</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={kraPin}
                                            onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm uppercase placeholder:text-gray-400"
                                            placeholder="P000000000Z"
                                            maxLength={11}
                                        />
                                    </div>
                                </div>

                                {user.role === 'business' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Business Registration Number</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={businessRegNumber}
                                                onChange={(e) => setBusinessRegNumber(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm placeholder:text-gray-400"
                                                placeholder="e.g. PVT-XXXXXX"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                        {user.role === 'driver' ? 'Home Location' : 'Physical Address'}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors z-10">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={address}
                                            onChange={(e) => handleAddressInput(e.target.value)}
                                            className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm placeholder:text-gray-400"
                                            placeholder="e.g. Westlands, Nairobi"
                                            autoComplete="off"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleUseCurrentLocation}
                                            title="Use current location"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-brand-600 hover:bg-brand-50 transition-colors"
                                        >
                                            {isLoadingLocation
                                                ? <Loader className="w-4 h-4 animate-spin" />
                                                : <Navigation className="w-4 h-4" />}
                                        </button>
                                        {addressSuggestions.length > 0 && (
                                            <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                                                {addressSuggestions.map((s, i) => (
                                                    <li key={i}>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setAddress(s.label); setAddressSuggestions([]); }}
                                                            className="w-full text-left px-5 py-3 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 flex items-center gap-3 border-b border-gray-50 last:border-0"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                                            {s.label}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Driver Specific Fields */}
                        {user.role === 'driver' && (
                            <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4">
                                <div className="h-px bg-gray-100 w-full"></div>
                                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                    <Truck className="w-4 h-4 mr-2" /> Vehicle & Identification
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">License No.</label>
                                        <input
                                            type="text"
                                            required
                                            value={licenseNumber}
                                            onChange={(e) => setLicenseNumber(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm placeholder:text-gray-400"
                                            placeholder="DL-000000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Vehicle Type</label>
                                        <select
                                            value={vehicleType}
                                            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                                            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                                        >
                                            {Object.values(VehicleType).map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Plate Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={plateNumber}
                                        onChange={(e) => setPlateNumber(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm uppercase placeholder:text-gray-400"
                                        placeholder="KDA 001A"
                                    />
                                </div>

                                {/* Vehicle spec — KeNHA / EAC Load Control Act compliance.
                                    Actual GVW / payload / tare / axle as declared by the driver or
                                    fleet partner. Drives payload-aware order matching. */}
                                <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-brand-600" />
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Vehicle Specs (matching)</span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Vehicle Model / Tier</label>
                                        <select
                                            value={vehicleId}
                                            onChange={(e) => setVehicleId(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-900 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-medium text-sm"
                                        >
                                            <option value="">Select your vehicle…</option>
                                            {[...new Set(VEHICLES.map(v => v.family))].map(fam => (
                                                <optgroup key={fam} label={fam.charAt(0).toUpperCase() + fam.slice(1)}>
                                                    {VEHICLES.filter(v => v.family === fam).map(v => (
                                                        <option key={v.id} value={v.id}>{v.label}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Payload (T)</label>
                                            <input type="number" step="0.1" min="0" value={payloadTonnes} onChange={e => setPayloadTonnes(e.target.value)} placeholder="e.g. 7" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">GVW (T)</label>
                                            <input type="number" step="0.1" min="0" value={gvwTonnes} onChange={e => setGvwTonnes(e.target.value)} placeholder="e.g. 18" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Tare (T)</label>
                                            <input type="number" step="0.1" min="0" value={tareTonnes} onChange={e => setTareTonnes(e.target.value)} placeholder="e.g. 8" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Axles</label>
                                            <input type="number" min="0" value={axleCount} onChange={e => setAxleCount(e.target.value)} placeholder="e.g. 3" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium ml-1">Used to match you to orders your vehicle can legally carry. KeNHA weighbridge limits apply.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">National ID (Front)</label>
                                        <div
                                            onClick={() => document.getElementById('id-upload')?.click()}
                                            className={`relative h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${idPreview ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'}`}
                                        >
                                            {idPreview ? (
                                                <img src={idPreview} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <FileText className="w-8 h-8 text-gray-300 mb-2" />
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Upload ID Photo</span>
                                                </>
                                            )}
                                            <input id="id-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'id')} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Driving License (Front)</label>
                                        <div
                                            onClick={() => document.getElementById('license-upload')?.click()}
                                            className={`relative h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${licensePreview ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'}`}
                                        >
                                            {licensePreview ? (
                                                <img src={licensePreview} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Upload DL Photo</span>
                                                </>
                                            )}
                                            <input id="license-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'license')} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Business Specific Fields */}
                        {user.role === 'business' && (
                            <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4">
                                <div className="h-px bg-gray-100 w-full"></div>
                                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                    <Briefcase className="w-4 h-4 mr-2" /> Business Verification
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">PIN Certificate</label>
                                        <div
                                            onClick={() => document.getElementById('pincert-upload')?.click()}
                                            className={`relative h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${pinCertificatePreview ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'}`}
                                        >
                                            {pinCertificatePreview ? (
                                                <img src={pinCertificatePreview} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <FileText className="w-8 h-8 text-gray-300 mb-2" />
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Upload PIN Certificate</span>
                                                </>
                                            )}
                                            <input id="pincert-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'pinCertificate')} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleLogout}
                        className="flex-1 px-8 py-4 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all text-sm border border-transparent shadow-sm flex items-center justify-center space-x-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-500/25 hover:bg-brand-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm"
                    >
                        {loading ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>Complete Registration</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;
