import { geocodeAddress } from '../services/geolocation';
import type { FairPriceStore } from '../services/geolocation';

// Sample FairPrice stores with addresses (this would be expanded with all 107 stores)
const fairpriceStoresData: Omit<FairPriceStore, 'latitude' | 'longitude'>[] = [
  {
    name: "FairPrice Ang Mo Kio Ave 10",
    address: "453 Ang Mo Kio Ave 10, Singapore 560453",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Ang Mo Kio Blk 215",
    address: "215 Ang Mo Kio Ave 1, #01-877, Singapore 560215",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Ang Mo Kio Blk 712",
    address: "712 Ang Mo Kio Ave 6, #01-4056, Singapore 560712",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bedok North",
    address: "212 Bedok North Street 1, #01-147, Singapore 460212",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bedok North Blk 89",
    address: "89 Bedok North Street 4, #01-77/79, Singapore 460089",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bedok Reservoir Road",
    address: "745 Bedok Reservoir Road, #01-3015, Singapore 470745",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bendemeer Road",
    address: "30 Bendemeer Road, #01-871, Singapore 330030",
    hours: "8am-10pm"
  },
  {
    name: "FairPrice Bishan Blk 510",
    address: "510 Bishan Street 13, #01-520, Singapore 570510",
    hours: "7am-11pm"
  },
  {
    name: "FairPrice Bishan North Blk 279",
    address: "279 Bishan Street 24, #01-62/64, Singapore 570279",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Boon Lay Shopping Complex",
    address: "221 Boon Lay Place, #02-200, Boon Lay Shopping Complex, Singapore 640221",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bukit Batok East",
    address: "280 Bukit Batok East Ave 3, #01-315, Singapore 650280",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bukit Batok MRT",
    address: "10 Bukit Batok Central, #01-08, Singapore 659958",
    hours: "7am-11:30pm"
  },
  {
    name: "FairPrice Xtra Jurong Point",
    address: "63 Jurong Central 3, #03-01 Jurong Point, Singapore 648331",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Clementi",
    address: "3155 Commonwealth Ave W, #02-09/10, Singapore 129588",
    hours: "24 Hours"
  },
  {
    name: "FairPrice Hougang Mall",
    address: "90 Hougang Ave 10, #03-11 Hougang Mall, Singapore 538766",
    hours: "10am-10pm"
  },
  {
    name: "FairPrice Tampines",
    address: "4 Tampines Central 5, #B1-01 Tampines Mall, Singapore 529510",
    hours: "10am-10pm"
  },
  {
    name: "FairPrice Orchard",
    address: "391 Orchard Road, #B4-01/02 Takashimaya Shopping Centre, Singapore 238872",
    hours: "10am-9:30pm"
  },
  {
    name: "FairPrice Marina Bay",
    address: "10 Bayfront Ave, #B2-01 The Shoppes at Marina Bay Sands, Singapore 018956",
    hours: "10am-11pm"
  },
  {
    name: "FairPrice Woodlands",
    address: "30 Woodlands Ave 2, #01-05 Woodlands MRT Station, Singapore 738343",
    hours: "6am-12am"
  },
  {
    name: "FairPrice Yishun",
    address: "51 Yishun Central 1, #02-32 Yishun 10, Singapore 768794",
    hours: "24 Hours"
  }
];

/**
 * Update store coordinates by geocoding addresses
 * This function can be run to populate the coordinates for all stores
 */
export const updateAllStoreCoordinates = async (): Promise<FairPriceStore[]> => {
  const updatedStores: FairPriceStore[] = [];
  
  console.log('Starting to geocode FairPrice store addresses...');
  
  for (let i = 0; i < fairpriceStoresData.length; i++) {
    const store = fairpriceStoresData[i];
    console.log(`Geocoding ${i + 1}/${fairpriceStoresData.length}: ${store.name}`);
    
    try {
      const coordinates = await geocodeAddress(store.address);
      
      if (coordinates) {
        updatedStores.push({
          ...store,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });
        console.log(`✓ Success: ${store.name} - ${coordinates.latitude}, ${coordinates.longitude}`);
      } else {
        updatedStores.push({
          ...store,
          latitude: null,
          longitude: null,
        });
        console.log(`✗ Failed: ${store.name} - Could not geocode address`);
      }
    } catch (error) {
      console.error(`✗ Error geocoding ${store.name}:`, error);
      updatedStores.push({
        ...store,
        latitude: null,
        longitude: null,
      });
    }
    
    // Add delay to avoid rate limiting (OneMap API allows reasonable usage)
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('Geocoding complete!');
  console.log('Updated stores data:', JSON.stringify(updatedStores, null, 2));
  
  return updatedStores;
};

/**
 * Pre-populated store data with coordinates (manually geocoded for demo)
 * In production, you would run updateAllStoreCoordinates() to get real coordinates
 */
export const fairpriceStoresWithCoordinates: FairPriceStore[] = [
  {
    name: "FairPrice Ang Mo Kio Ave 10",
    address: "453 Ang Mo Kio Ave 10, Singapore 560453",
    latitude: 1.3691,
    longitude: 103.8454,
    hours: "24 Hours"
  },
  {
    name: "FairPrice Ang Mo Kio Blk 215",
    address: "215 Ang Mo Kio Ave 1, #01-877, Singapore 560215",
    latitude: 1.3644,
    longitude: 103.8400,
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bedok North",
    address: "212 Bedok North Street 1, #01-147, Singapore 460212",
    latitude: 1.3297,
    longitude: 103.9186,
    hours: "24 Hours"
  },
  {
    name: "FairPrice Bishan Blk 510",
    address: "510 Bishan Street 13, #01-520, Singapore 570510",
    latitude: 1.3506,
    longitude: 103.8480,
    hours: "7am-11pm"
  },
  {
    name: "FairPrice Clementi",
    address: "3155 Commonwealth Ave W, #02-09/10, Singapore 129588",
    latitude: 1.3148,
    longitude: 103.7644,
    hours: "24 Hours"
  },
  {
    name: "FairPrice Hougang Mall",
    address: "90 Hougang Ave 10, #03-11 Hougang Mall, Singapore 538766",
    latitude: 1.3729,
    longitude: 103.8926,
    hours: "10am-10pm"
  },
  {
    name: "FairPrice Tampines",
    address: "4 Tampines Central 5, #B1-01 Tampines Mall, Singapore 529510",
    latitude: 1.3496,
    longitude: 103.9568,
    hours: "10am-10pm"
  },
  {
    name: "FairPrice Orchard",
    address: "391 Orchard Road, #B4-01/02 Takashimaya Shopping Centre, Singapore 238872",
    latitude: 1.3037,
    longitude: 103.8330,
    hours: "10am-9:30pm"
  },
  {
    name: "FairPrice Marina Bay",
    address: "10 Bayfront Ave, #B2-01 The Shoppes at Marina Bay Sands, Singapore 018956",
    latitude: 1.2834,
    longitude: 103.8607,
    hours: "10am-11pm"
  },
  {
    name: "FairPrice Woodlands",
    address: "30 Woodlands Ave 2, #01-05 Woodlands MRT Station, Singapore 738343",
    latitude: 1.4370,
    longitude: 103.7865,
    hours: "6am-12am"
  },
  {
    name: "FairPrice Yishun",
    address: "51 Yishun Central 1, #02-32 Yishun 10, Singapore 768794",
    latitude: 1.4294,
    longitude: 103.8356,
    hours: "24 Hours"
  },
  {
    name: "FairPrice Xtra Jurong Point",
    address: "63 Jurong Central 3, #03-01 Jurong Point, Singapore 648331",
    latitude: 1.3396,
    longitude: 103.7066,
    hours: "24 Hours"
  }
];