
/**
 * Converts latitude and longitude to 3D coordinates on a sphere
 * @param latitude Latitude in degrees (-90 to 90)
 * @param longitude Longitude in degrees (-180 to 180)
 * @param radius Radius of the sphere
 * @returns { x, y, z } 3D coordinates
 */
export const geoToCartesian = (
  latitude: number,
  longitude: number,
  radius: number
): { x: number; y: number; z: number } => {
  // Convert latitude and longitude from degrees to radians
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return { x, y, z };
};

/**
 * Generate random coordinates if location is not available
 * @returns { latitude, longitude } Random geographical coordinates
 */
export const generateRandomGeoCoordinates = (): { latitude: number; longitude: number } => {
  return {
    latitude: (Math.random() * 180) - 90,  // Random latitude between -90 and 90
    longitude: (Math.random() * 360) - 180  // Random longitude between -180 and 180
  };
};

/**
 * Get a display name for a location based on coordinates
 * @param latitude Latitude in degrees
 * @param longitude Longitude in degrees
 * @returns A string describing the general location
 */
export const getLocationName = (latitude: number, longitude: number): string => {
  // This is a simple approximation - in a real app you might use reverse geocoding
  
  // Determine continent/region based on rough coordinates
  let region = 'Unknown';
  
  if (latitude > 66) {
    region = 'Arctic';
  } else if (latitude < -66) {
    region = 'Antarctica';
  } else if (latitude > 0 && latitude < 35 && longitude > -20 && longitude < 55) {
    region = 'Africa';
  } else if (latitude > 0 && longitude > 55 && longitude < 145) {
    region = 'Asia';
  } else if (latitude > 35 && longitude > -10 && longitude < 40) {
    region = 'Europe';
  } else if (latitude > -10 && latitude < 15 && longitude > -80 && longitude < -35) {
    region = 'South America';
  } else if (latitude > 15 && longitude > -125 && longitude < -50) {
    region = 'North America';
  } else if (latitude < 0 && longitude > 110 && longitude < 180) {
    region = 'Oceania';
  }
  
  // Determine hemisphere
  const latHemisphere = latitude >= 0 ? 'Northern' : 'Southern';
  const longHemisphere = longitude >= 0 ? 'Eastern' : 'Western';
  
  return `${region}, ${latHemisphere} ${longHemisphere} Hemisphere`;
};
