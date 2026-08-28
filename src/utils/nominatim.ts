export interface GeocodeDetails {
  streetName: string | null;
  region: string | null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const details = await reverseGeocodeDetails(lat, lng);
  return details.streetName;
}

export async function reverseGeocodeDetails(lat: number, lng: number): Promise<GeocodeDetails> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&accept-language=en`
    );
    if (!res.ok) return { streetName: null, region: null };
    const data = await res.json();
    const addr = data.address ?? {};

    const streetName =
      addr.road ?? addr.pedestrian ?? addr.footway ?? addr.cycleway ??
      addr.suburb ?? addr.neighbourhood ?? data.display_name ?? null;

    // Prefer the finest meaningful administrative unit available
    const region =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ??
      addr.county ?? addr.state_district ?? addr.state ?? null;

    return { streetName, region };
  } catch {
    return { streetName: null, region: null };
  }
}
