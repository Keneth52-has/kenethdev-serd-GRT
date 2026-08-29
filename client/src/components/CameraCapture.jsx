import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  FlipHorizontal,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getCurrentGPSLocation } from '../utils/location';
import { createGPSStampedImage } from '../utils/watermark';
import { useAuth } from '../context/AuthContext';

export default function CameraCapture({
  onPhotoConfirmed,
  onCancel,
  photoType = 'MEMBER',
  memberNumber = 1,
  memberName = '',
  memberId = '',
  shgName = '',
  existingPhoto = null,
}) {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [gpsData, setGpsData] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [capturedOriginal, setCapturedOriginal] = useState(null);
  const [stampedPreview, setStampedPreview] = useState(
    existingPhoto?.stamped_image_url || existingPhoto?.stampedImageUrl || null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [shutterAnimation, setShutterAnimation] = useState(false);

  const stopCamera = () => {
    const activeStream = streamRef.current;

    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsCameraActive(false);
  };

  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera stream is not supported by this browser. Use device camera capture instead.'
        );
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera stream error:', err);
      setCameraError(
        err?.message ||
          'Unable to open camera. Allow camera permission and try again.'
      );
      setIsCameraActive(false);
    }
  };

  const fetchGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);

    try {
      const location = await getCurrentGPSLocation();
      setGpsData(location);
      return location;
    } catch (err) {
      console.error('GPS fetch error:', err);
      setGpsError(
        err?.message ||
          'GPS location could not be detected. Enable Location Services and try again.'
      );
      return null;
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

  useEffect(() => {
    const attachStream = async () => {
      const video = videoRef.current;
      const activeStream = streamRef.current;

      if (!video || !activeStream || !isCameraActive) return;

      video.srcObject = activeStream;

      try {
        await video.play();
      } catch (err) {
        console.error('Video preview playback error:', err);
        setCameraError('Camera opened, but the live preview could not start.');
      }
    };

    attachStream();
  }, [stream, isCameraActive]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const createStampedPhoto = async (originalDataUrl, location) => {
    const stamped = await createGPSStampedImage(originalDataUrl, {
      photo_type: photoType,
      member_number: photoType === 'MEMBER' ? memberNumber : null,
      member_name: memberName,
      member_id: memberId,
      shg_name: shgName,
      employee_name: user?.name || '',
      employee_id: user?.employee_id || '',
      latitude: location.latitude,
      longitude: location.longitude,
      gps_accuracy: location.accuracy,
      address: location.address || '',
      captured_at: location.timestamp || new Date().toISOString(),
    });

    setStampedPreview(stamped);
  };

  const handleSnap = async () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera preview is not ready. Wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setShutterAnimation(true);
    window.setTimeout(() => setShutterAnimation(false), 300);

    try {
      const location = gpsData || (await fetchGPS());

      if (!location) {
        setGpsError(
          'GPS location is required to capture this photograph. Enable location services and retry.'
        );
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const originalDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedOriginal(originalDataUrl);

      await createStampedPhoto(originalDataUrl, location);
      stopCamera();
    } catch (err) {
      console.error('Error generating GPS-stamped photo:', err);
      setCameraError(`Could not capture and stamp photo: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setCameraError(null);

    try {
      const location = gpsData || (await fetchGPS());

      if (!location) {
        throw new Error('GPS location is mandatory. Enable Location Services and retry.');
      }

      const originalDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read the selected image.'));
        reader.readAsDataURL(file);
      });

      setCapturedOriginal(originalDataUrl);
      await createStampedPhoto(originalDataUrl, location);
      stopCamera();
    } catch (err) {
      console.error('File capture error:', err);
      setGpsError(err.message || 'Unable to prepare the selected photo.');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
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
      setCameraError('Capture a photo with a valid GPS location before saving.');
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
      address: gpsData.address || '',
      captured_at: gpsData.timestamp || new Date().toISOString(),
      employee_id: user?.employee_id || '',
    });
  };

  const closeCamera = () => {
    stopCamera();
    onCancel?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
              {photoType === 'GROUP'
                ? '👥 SHG Group Photo'
                : `👤 Member ${String(memberNumber).padStart(2, '0')} Photo`}
            </span>
            <h3 className="mt-1 text-base font-bold text-white sm:text-lg">
              {photoType === 'GROUP'
                ? 'Group Photograph Verification'
                : memberName || `Member ${memberNumber}`}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-2">
            {gpsLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-sky-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Fetching GPS...</span>
              </div>
            ) : gpsData ? (
              <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>GPS Active (±{gpsData.accuracy}m)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={fetchGPS}
                className="flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Retry GPS</span>
              </button>
            )}

            <button
              type="button"
              onClick={closeCamera}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/20 p-3.5 text-xs text-rose-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-300">GPS Location Required</p>
                <p className="mt-0.5">{gpsError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchGPS}
              className="flex-shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Retry GPS
            </button>
          </div>
        )}

        {cameraError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-300">Camera Preview Issue</p>
              <p className="mt-0.5">{cameraError}</p>
            </div>
          </div>
        )}

        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 sm:aspect-[16/10]">
          {shutterAnimation && (
            <div className="absolute inset-0 z-30 animate-pulse bg-white" />
          )}

          {stampedPreview ? (
            <div className="relative h-full w-full">
              <img
                src={stampedPreview}
                alt="GPS stamped preview"
                className="h-full w-full bg-black object-contain"
              />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-bold text-white shadow-md">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>GPS Stamped & Verified</span>
              </div>
            </div>
          ) : isCameraActive ? (
            <div className="relative h-full w-full">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(event) => {
                  event.currentTarget.play().catch((err) => {
                    console.error('Video metadata playback error:', err);
                    setCameraError('Camera is active, but the preview could not start.');
                  });
                }}
                className="h-full w-full bg-black object-cover"
              />

              <div className="pointer-events-none absolute inset-6 flex flex-col justify-between rounded-xl border-2 border-white/20 p-3">
                <div className="flex justify-between font-mono text-[10px] text-white/60">
                  <span>+ GEOTAG ACTIVE</span>
                  <span>LIVE CAMERA</span>
                </div>
                <div className="mx-auto rounded-full bg-black/40 px-3 py-1 text-center text-xs font-medium text-white/80 backdrop-blur-sm">
                  {photoType === 'GROUP'
                    ? 'Center all SHG members in the frame'
                    : 'Center member face in frame'}
                </div>
              </div>

              <button
                type="button"
                onClick={toggleFacingMode}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2.5 text-white/90 backdrop-blur-sm hover:bg-black/80"
                title="Switch front/rear camera"
              >
                <FlipHorizontal className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 p-6 text-center">
              <Camera className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mx-auto max-w-xs text-xs text-slate-400">
                {cameraError ||
                  'Camera access is not active. Start the live camera or capture using your device camera app.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Start Live Stream
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Device Camera Capture
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {isProcessing && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-3 bg-black/80 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500" />
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-4 w-4" />
                Generating GPS Watermark Stamp...
              </p>
            </div>
          )}
        </div>

        {gpsData && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1 text-slate-300">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              <span>
                Lat: {gpsData.latitude}° • Lon: {gpsData.longitude}° (±{gpsData.accuracy}m)
              </span>
            </div>
            <div className="max-w-xs truncate text-slate-400">{gpsData.address}</div>
          </div>
        )}

        <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
          {stampedPreview ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retake Photo</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/60 hover:from-emerald-500 hover:to-emerald-400 sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Confirm & Save Photo</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 sm:flex-initial"
                >
                  Upload / Device App
                </button>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                disabled={isProcessing || !gpsData || !isCameraActive}
                onClick={handleSnap}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-emerald-950/80 hover:from-emerald-500 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Camera className="h-5 w-5" />
                <span>Capture & Geotag Photo</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}