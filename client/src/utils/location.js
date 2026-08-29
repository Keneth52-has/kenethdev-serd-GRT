/**
 * Geolocation and Reverse Geocoding Utility
 */

export async function getCurrentGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser or device.'));
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date(position.timestamp || Date.now()).toISOString();

        let address = '';
        try {
          // Attempt reverse geocoding if online
          if (navigator.onLine) {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`, {
              headers: { 'Accept-Language': 'en' },
              signal: AbortSignal.timeout(3000)
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.display_name) {
                // Shorten address to key components
                const addr = data.address || {};
                const village = addr.village || addr.suburb || addr.town || addr.city || '';
                const taluk = addr.county || addr.state_district || '';
                const state = addr.state || '';
                if (village || taluk) {
                  address = [village, taluk, state].filter(Boolean).join(', ');
                } else {
                  address = data.display_name.split(',').slice(0, 3).join(', ');
                }
              }
            }
          }
        } catch (e) {
          // Fallback if reverse geocode fails or times out
          console.warn('Reverse geocoding not reachable, using coordinates fallback');
        }

        if (!address) {
          address = `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`;
        }

        resolve({
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy || 5),
          timestamp,
          address
        });
      },
      (error) => {
        let message = 'GPS location could not be detected.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'GPS location permission was denied. Please enable location access in your browser/phone settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'GPS location is currently unavailable. Please ensure GPS/Location Services is switched ON.';
            break;
          case error.TIMEOUT:
            message = 'GPS location request timed out. Please retry in an open area with clear sky visibility.';
            break;
          default:
            message = error.message || message;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

/**
 * Format date & time nicely: "28-Aug-2026 04:25 PM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 -> 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}
