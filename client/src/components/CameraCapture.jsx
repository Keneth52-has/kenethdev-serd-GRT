import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, MapPin, FlipHorizontal, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import { getCurrentGPSLocation, formatDateTime } from '../utils/location';
import { createGPSStampedImage } from '../utils/watermark';
import { useAuth } from '../context/AuthContext';

export default function CameraCapture({
  onPhotoConfirmed,
  onCancel,
  photoType = 'MEMBER', // 'MEMBER' or 'GROUP'
  memberNumber = 1,
  memberName = '',
  memberId = '',
  shgName = '',
  existingPhoto = null
}) {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // States
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // environment = rear camera
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // GPS States
  const [gpsData, setGpsData] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Captured Photo States
  const [capturedOriginal, setCapturedOriginal] = useState(null);
  const [stampedPreview, setStampedPreview] = useState(existingPhoto?.stamped_image_url || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shutterAnimation, setShutterAnimation] = useState(false);

  // Initialize camera stream
  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera stream not supported by this browser. Use file capture below.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError(err.message || 'Unable to open camera stream. Please allow camera permissions or use direct file capture.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Fetch initial GPS on component mount
  const fetchGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const loc = await getCurrentGPSLocation();
      setGpsData(loc);
    } catch (err) {
      console.error('GPS fetch error:', err);
      setGpsError(err.message || 'GPS location could not be detected. Please enable Location Services.');
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    fetchGPS();

    return () => {
      stopCamera();
    };
  }, []);

  const toggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  // Snap photo from video stream
  const handleSnap = async () => {
    // 1. Verify GPS location is present or prompt to retry
    if (!gpsData) {
      setGpsLoading(true);
      try {
        const freshGps = await getCurrentGPSLocation();
        setGpsData(freshGps);
        await processSnapWithGPS(freshGps);
      } catch (err) {
        setGpsError('GPS location is required to capture this photograph. Please enable location services and try again.');
        setGpsLoading(false);
        return;
      }
    } else {
      await processSnapWithGPS(gpsData);
    }
  };

  const processSnapWithGPS = async (currentGps) => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setShutterAnimation(true);
    setTimeout(() => setShutterAnimation(false), 300);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const originalDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedOriginal(originalDataUrl);

      // Create GPS stamped watermark image
      const stamped = await createGPSStampedImage(originalDataUrl, {
        photo_type: photoType,
        member_number: memberNumber,
        member_name: memberName,
        member_id: memberId,
        shg_name: shgName,
        employee_name: user?.name,
        employee_id: user?.employee_id,
        latitude: currentGps.latitude,
        longitude: currentGps.longitude,
        gps_accuracy: currentGps.accuracy,
        address: currentGps.address,
        captured_at: currentGps.timestamp || new Date().toISOString()
      });

      setStampedPreview(stamped);
      stopCamera();
    } catch (err) {
      console.error('Error generating photo watermark:', err);
      alert('Error stamping photo: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle fallback file upload input
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Fetch fresh GPS
      let currentGps = gpsData;
      if (!currentGps) {
        currentGps = await getCurrentGPSLocation();
        setGpsData(currentGps);
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalDataUrl = event.target.result;
        setCapturedOriginal(originalDataUrl);

        const stamped = await createGPSStampedImage(originalDataUrl, {
          photo_type: photoType,
          member_number: memberNumber,
          member_name: memberName,
          member_id: memberId,
          shg_name: shgName,
          employee_name: user?.name,
          employee_id: user?.employee_id,
          latitude: currentGps.latitude,
          longitude: currentGps.longitude,
          gps_accuracy: currentGps.accuracy,
          address: currentGps.address,
          captured_at: new Date().toISOString()
        });

        setStampedPreview(stamped);
        stopCamera();
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsProcessing(false);
      setGpsError('GPS location is mandatory. ' + (err.message || 'Please enable location services.'));
    }
  };

  const handleRetake = () => {
    setCapturedOriginal(null);
    setStampedPreview(null);
    startCamera(facingMode);
    fetchGPS();
  };

  const handleConfirm = () => {
    if (!stampedPreview || !gpsData) {
      alert('Please ensure photo is captured with GPS location.');
      return;
    }

    onPhotoConfirmed({
      photo_type: photoType,
      member_number: photoType === 'MEMBER' ? memberNumber : null,
      original_image_url: capturedOriginal || stampedPreview,
      stamped_image_url: stampedPreview,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      gps_accuracy: gpsData.accuracy,
      address: gpsData.address,
      captured_at: gpsData.timestamp || new Date().toISOString(),
      employee_id: user?.employee_id
    });
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 text-white border border-slate-800 shadow-2xl relative">
      
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {photoType === 'GROUP' ? '👥 SHG Group Photo' : `👤 Member ${String(memberNumber).padStart(2, '0')} Photo`}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1">
            {photoType === 'GROUP' ? 'Group Photograph Verification' : (memberName || `Member ${memberNumber}`)}
          </h3>
        </div>

        {/* GPS Live Status Badge */}
        <div className="text-right">
          {gpsLoading ? (
            <div className="flex items-center gap-1.5 text-xs text-sky-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching GPS...</span>
            </div>
          ) : gpsData ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <MapPin className="w-3.5 h-3.5" />
              <span>GPS Active (±{gpsData.accuracy}m)</span>
            </div>
          ) : (
            <button
              onClick={fetchGPS}
              className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 hover:bg-rose-500/20"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>GPS Required (Retry)</span>
            </button>
          )}
        </div>
      </div>

      {/* GPS Error Warning Alert */}
      {gpsError && (
        <div className="mb-4 p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">GPS Location Required</p>
              <p className="mt-0.5">{gpsError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchGPS}
            className="flex-shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* Main View Area: Video Live Stream OR Stamped Photo Preview */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        
        {/* Shutter flash effect */}
        {shutterAnimation && (
          <div className="absolute inset-0 bg-white z-30 animate-shutter"></div>
        )}

        {/* 1. Stamped Photo Preview Mode */}
        {stampedPreview ? (
          <div className="relative w-full h-full">
            <img
              src={stampedPreview}
              alt="GPS Stamped Preview"
              className="w-full h-full object-contain bg-black"
            />
            <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 shadow-md">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>GPS Stamped & Verified</span>
            </div>
          </div>
        ) : (
          /* 2. Live Camera View Mode */
          <div className="relative w-full h-full flex items-center justify-center">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Camera Overlay Framing Guide */}
                <div className="absolute inset-6 border-2 border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between text-[10px] text-white/60 font-mono">
                    <span>+ GEOTAG ACTIVE</span>
                    <span>HD 1080p</span>
                  </div>
                  <div className="text-center text-xs text-white/70 bg-black/40 backdrop-blur-sm py-1 px-3 rounded-full mx-auto font-medium">
                    {photoType === 'GROUP' ? 'Center all SHG members in the frame' : 'Center member face in frame'}
                  </div>
                </div>

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-black/80 rounded-full text-white/90 backdrop-blur-sm transition-all"
                  title="Switch Camera (Front/Rear)"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
              </>
            ) : (
              /* Fallback when stream is inactive / blocked */
              <div className="text-center p-6 space-y-3">
                <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {cameraError || 'Camera access not initialized. Please click below to start camera or capture via device file input.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700"
                  >
                    Start Live Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                  >
                    📱 Device Camera Capture
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden Fallback Native Camera File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Generating GPS Watermark Stamp...
            </p>
          </div>
        )}

      </div>

      {/* Location Details Strip below photo */}
      {gpsData && (
        <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Lat: {gpsData.latitude}° • Lon: {gpsData.longitude}° (±{gpsData.accuracy}m)</span>
          </div>
          <div className="text-slate-400 truncate max-w-xs">
            {gpsData.address}
          </div>
        </div>
      )}

      {/* Control Action Buttons */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {stampedPreview ? (
          /* Preview Mode Actions */
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retake Photo</span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold shadow-lg shadow-emerald-950/60 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Save Photo</span>
            </button>
          </>
        ) : (
          /* Live Camera Actions */
          <>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
              >
                Upload / Device App
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={isProcessing || !gpsData}
              onClick={handleSnap}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-base font-bold shadow-xl shadow-emerald-950/80 transition-all disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              <span>📷 Capture & Geotag Photo</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
}
