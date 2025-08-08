#!/usr/bin/env node

/**
 * Script to update all FairPrice store coordinates using OneMap API
 * Run with: node scripts/updateStores.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OneMap API credentials from environment variables
const ONEMAP_EMAIL = process.env.ONEMAP_EMAIL;
const ONEMAP_PASSWORD = process.env.ONEMAP_PASSWORD;

if (!ONEMAP_EMAIL || !ONEMAP_PASSWORD) {
  console.error('❌ OneMap credentials not found in environment variables');
  console.error('Please set ONEMAP_EMAIL and ONEMAP_PASSWORD in your .env.local file');
  process.exit(1);
}

/**
 * Get OneMap API access token
 */
const getOneMapToken = async () => {
  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ONEMAP_EMAIL,
      password: ONEMAP_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get OneMap token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
};

/**
 * Extract postal code from address
 */
const extractPostalCode = (address) => {
  const match = address.match(/Singapore\s+(\d{6})/i);
  return match ? match[1] : null;
};

/**
 * Generate alternative address formats for better geocoding success
 */
const generateAddressVariants = (originalAddress, storeName) => {
  const variants = [];
  
  // Original address
  variants.push(originalAddress);
  
  // Extract postal code
  const postalCode = extractPostalCode(originalAddress);
  if (postalCode) {
    variants.push(postalCode);
  }
  
  // Remove unit numbers and floor info
  let cleanAddress = originalAddress
    .replace(/#\d+-\d+/g, '') // Remove #01-123 format
    .replace(/#[A-Z]\d+-\d+/g, '') // Remove #B1-01 format
    .replace(/,\s*#.*?,/g, ',') // Remove unit info between commas
    .replace(/,\s*Singapore.*$/i, '') // Remove Singapore and postal
    .trim();
  
  if (cleanAddress !== originalAddress) {
    variants.push(cleanAddress);
  }
  
  // Extract building/mall name from store name
  const buildingNames = [
    'AMK Hub', 'Junction 8', 'West Mall', 'Hillion Mall', 'Bukit Panjang Plaza',
    'Coronation Plaza', 'Beauty World Centre', 'Canberra Plaza', 'Chinatown Point',
    'City Square Mall', 'Marina Bay Sands', 'Takashimaya', 'ION Orchard',
    'Bedok Mall', 'Clementi Mall', 'Hougang Mall', 'Jurong Point', 'JEM',
    'Westgate', 'Kallang Wave Mall', 'Parkway Parade', 'Velocity', 'United Square',
    'Downtown East', 'White Sands', 'Waterway Point', 'Punggol Plaza',
    'Queensway Shopping Centre', 'Sun Plaza', 'Sembawang Shopping Centre',
    'Compass One', 'Sengkang Grand Mall', 'Rivervale Mall', 'NEX',
    'myVillage at Serangoon Garden', 'Eastpoint', 'Tampines Mall', 'Tampines 1',
    'Century Square', 'HDB Hub', 'Causeway Point', 'Northpoint City', 'Yishun 10'
  ];
  
  for (const building of buildingNames) {
    if (storeName.includes(building)) {
      variants.push(building);
      break;
    }
  }
  
  // Extract MRT station names
  if (storeName.includes('MRT')) {
    const mrtMatch = storeName.match(/([A-Za-z\s]+)\s+MRT/);
    if (mrtMatch) {
      variants.push(`${mrtMatch[1].trim()} MRT`);
    }
  }
  
  // Extract area names for HDB blocks
  const areaMatch = originalAddress.match(/^\d+\s+([A-Za-z\s]+(?:Ave|Avenue|Street|Road|Drive|Lane|Crescent|Close|Walk|Place|View|Link|Central|North|South|East|West))/);
  if (areaMatch) {
    variants.push(areaMatch[1].trim());
  }
  
  return [...new Set(variants)]; // Remove duplicates
};

/**
 * Geocode address using OneMap API with multiple format attempts
 */
const geocodeWithOneMap = async (originalAddress, storeName, token) => {
  const variants = generateAddressVariants(originalAddress, storeName);
  
  console.log(`  Trying ${variants.length} address variants...`);
  
  for (let i = 0; i < variants.length; i++) {
    const address = variants[i];
    console.log(`    ${i + 1}. "${address}"`);
    
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodedAddress}&returnGeom=Y&getAddrDetails=Y`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.log(`       API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.found > 0 && data.results.length > 0) {
        const result = data.results[0];
        console.log(`       ✓ Found! (${data.found} results)`);
        return {
          latitude: parseFloat(result.LATITUDE),
          longitude: parseFloat(result.LONGITUDE || result.LONGTITUDE),
          foundAddress: result.ADDRESS,
          searchTerm: address
        };
      } else {
        console.log(`       ✗ No results`);
      }
    } catch (error) {
      console.log(`       ✗ Error: ${error.message}`);
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return null;
};

/**
 * Comprehensive list of all FairPrice stores in Singapore
 */
const ALL_FAIRPRICE_STORES = [
  // Ang Mo Kio
  { name: "FairPrice Ang Mo Kio Ave 10", address: "453 Ang Mo Kio Ave 10, Singapore 560453", hours: "24 Hours" },
  { name: "FairPrice Ang Mo Kio Blk 215", address: "215 Ang Mo Kio Ave 1, #01-877, Singapore 560215", hours: "24 Hours" },
  { name: "FairPrice Ang Mo Kio Blk 712", address: "712 Ang Mo Kio Ave 6, #01-4056, Singapore 560712", hours: "24 Hours" },
  { name: "FairPrice AMK Hub", address: "53 Ang Mo Kio Ave 3, #B1-01, AMK Hub, Singapore 569933", hours: "8am-11pm" },
  { name: "FairPrice Ang Mo Kio Blk 226", address: "226 Ang Mo Kio Ave 1, #01-1651, Singapore 560226", hours: "7am-11pm" },
  { name: "FairPrice Ang Mo Kio Blk 406", address: "406 Ang Mo Kio Ave 10, #01-1829, Singapore 560406", hours: "7am-11pm" },
  { name: "FairPrice Ang Mo Kio Blk 628", address: "628 Ang Mo Kio Ave 4, #01-900, Singapore 560628", hours: "24 Hours" },
  
  // Bedok
  { name: "FairPrice Bedok North", address: "212 Bedok North Street 1, #01-147, Singapore 460212", hours: "24 Hours" },
  { name: "FairPrice Bedok North Blk 89", address: "89 Bedok North Street 4, #01-77/79, Singapore 460089", hours: "24 Hours" },
  { name: "FairPrice Bedok Reservoir Road", address: "745 Bedok Reservoir Road, #01-3015, Singapore 470745", hours: "24 Hours" },
  { name: "FairPrice Bedok Mall", address: "311 New Upper Changi Road, #B1-01, Bedok Mall, Singapore 467360", hours: "8am-11pm" },
  { name: "FairPrice Bedok Blk 538", address: "538 Bedok North Street 3, #01-195, Singapore 460538", hours: "7am-11pm" },
  { name: "FairPrice Bedok Blk 85", address: "85 Bedok North Avenue 4, #01-09, Singapore 460085", hours: "24 Hours" },
  { name: "FairPrice Bedok South", address: "18 Bedok South Road, #01-58, Singapore 460018", hours: "7am-11pm" },
  
  // Bishan
  { name: "FairPrice Bishan Blk 510", address: "510 Bishan Street 13, #01-520, Singapore 570510", hours: "7am-11pm" },
  { name: "FairPrice Bishan North Blk 279", address: "279 Bishan Street 24, #01-62/64, Singapore 570279", hours: "24 Hours" },
  { name: "FairPrice Junction 8", address: "9 Bishan Place, #B1-01, Junction 8, Singapore 579837", hours: "8am-11pm" },
  { name: "FairPrice Bishan Blk 230", address: "230 Bishan Street 23, #01-84, Singapore 570230", hours: "7am-11pm" },
  
  // Boon Lay
  { name: "FairPrice Boon Lay Shopping Complex", address: "221 Boon Lay Place, #02-200, Boon Lay Shopping Complex, Singapore 640221", hours: "24 Hours" },
  { name: "FairPrice Boon Lay Blk 190", address: "190 Boon Lay Drive, #01-306, Singapore 640190", hours: "7am-11pm" },
  
  // Bukit Batok
  { name: "FairPrice Bukit Batok East", address: "280 Bukit Batok East Ave 3, #01-315, Singapore 650280", hours: "24 Hours" },
  { name: "FairPrice Bukit Batok MRT", address: "10 Bukit Batok Central, #01-08, Singapore 659958", hours: "7am-11:30pm" },
  { name: "FairPrice Bukit Batok West", address: "166 Bukit Batok West Ave 8, #01-256/258, Singapore 650166", hours: "24 Hours" },
  { name: "FairPrice West Mall", address: "1 Bukit Batok Central Link, #B1-01, West Mall, Singapore 658713", hours: "8am-11pm" },
  
  // Bukit Merah
  { name: "FairPrice Bukit Ho Swee", address: "50 Havelock Road, #01-755, Singapore 160050", hours: "24 Hours" },
  { name: "FairPrice Bukit Merah Central", address: "166 Bukit Merah Central, #01-3531 & #02-3531, Singapore 150166", hours: "7am-11pm" },
  { name: "FairPrice Depot", address: "108 Depot Road, #01-01, Depot Heights Shopping Centre, Singapore 100108", hours: "8am-11pm" },
  { name: "FairPrice Bukit Merah View", address: "2 Bukit Merah Central, #01-3186, Singapore 150002", hours: "7am-11pm" },
  
  // Bukit Panjang
  { name: "FairPrice Hillion Mall", address: "17 Petir Road, #B2-67, Hillion Mall, Singapore 678278", hours: "24 Hours" },
  { name: "FairPrice Bukit Panjang Plaza", address: "1 Jelebu Road, #B1-01, Bukit Panjang Plaza, Singapore 677743", hours: "8am-11pm" },
  
  // Bukit Timah
  { name: "FairPrice Coronation Plaza", address: "587 Bukit Timah Road, #01-01, Coronation Plaza, Singapore 269707", hours: "8am-11pm" },
  { name: "FairPrice Beauty World Centre", address: "144 Upper Bukit Timah Road, #B1-01, Beauty World Centre, Singapore 588177", hours: "8am-11pm" },
  
  // Canberra
  { name: "FairPrice Canberra Plaza", address: "133 Canberra View, #B1-03/04, Canberra Plaza, Singapore 750133", hours: "8am-11pm" },
  { name: "FairPrice Canberra Road Blk 511", address: "511 Canberra Road, #02-03, Singapore 750511", hours: "7am-11pm" },
  
  // Central Area
  { name: "FairPrice Chinatown Point", address: "133 New Bridge Road, #B1-01, Chinatown Point, Singapore 059413", hours: "8am-11pm" },
  { name: "FairPrice City Square Mall", address: "180 Kitchener Road, #B1-09/10, Singapore 208539", hours: "8am-11pm" },
  { name: "FairPrice Marina Bay Sands", address: "10 Bayfront Ave, #B2-01, The Shoppes at Marina Bay Sands, Singapore 018956", hours: "10am-11pm" },
  { name: "FairPrice Orchard Takashimaya", address: "391 Orchard Road, #B4-01/02, Takashimaya Shopping Centre, Singapore 238872", hours: "10am-9:30pm" },
  { name: "FairPrice ION Orchard", address: "2 Orchard Turn, #B4-01, ION Orchard, Singapore 238801", hours: "10am-10pm" },
  { name: "FairPrice Bendemeer Road", address: "30 Bendemeer Road, #01-871, Singapore 330030", hours: "8am-10pm" },
  
  // Changi
  { name: "FairPrice Changi Airport T2", address: "65 Airport Boulevard, #B16-029, Basement Level South, Terminal 2, Changi Airport, Singapore 819643", hours: "7am-11pm" },
  { name: "FairPrice Changi Airport T3", address: "65 Airport Boulevard, #B2-01, Terminal 3, Changi Airport, Singapore 819663", hours: "24 Hours" },
  { name: "FairPrice Changi City Point", address: "5 Changi Business Park Central 1, #B1-01, Changi City Point, Singapore 486038", hours: "8am-11pm" },
  
  // Clementi
  { name: "FairPrice Clementi Ave", address: "451 Clementi Ave 3, #01-307, Singapore 120451", hours: "24 Hours" },
  { name: "FairPrice Clementi Blk 352", address: "352 Clementi Ave 2, #01-141/143, Singapore 120352", hours: "24 Hours" },
  { name: "FairPrice Clementi Mall", address: "3155 Commonwealth Ave W, #02-09/10, Singapore 129588", hours: "24 Hours" },
  { name: "FairPrice Dover", address: "28 Dover Crescent, #01-83, Singapore 130028", hours: "8am-11pm" },
  
  // Geylang
  { name: "FairPrice Geylang East", address: "114 Aljunied Avenue 2, #01-75, Singapore 380114", hours: "24 Hours" },
  { name: "FairPrice Geylang Lorong 38", address: "612/620 Geylang Lorong 38, Singapore 389551", hours: "24 Hours" },
  { name: "FairPrice Circuit Road", address: "77 Circuit Road, #01-464/466, Singapore 370077", hours: "8am-10pm" },
  { name: "FairPrice Eunos Crescent", address: "5 Eunos Crescent, #01-2619/21, Singapore 400005", hours: "8am-10pm" },
  
  // Holland Village
  { name: "FairPrice Buona Vista Community Centre", address: "36 Holland Drive, #01-03/04/05, Singapore 270036", hours: "24 Hours" },
  { name: "FairPrice Ghim Moh Link", address: "29A Ghim Moh Link, #01-01, Singapore 271029", hours: "24 Hours" },
  
  // Hougang
  { name: "FairPrice Hougang Mall", address: "90 Hougang Ave 10, #03-11, Hougang Mall, Singapore 538766", hours: "10am-10pm" },
  { name: "FairPrice Hougang Blk 682", address: "682 Hougang Ave 4, #01-310, Singapore 530682", hours: "24 Hours" },
  { name: "FairPrice Hougang 1", address: "105 Hougang Ave 1, #01-1277, Singapore 530105", hours: "7am-11pm" },
  { name: "FairPrice Hougang Green Shopping Mall", address: "21 Hougang Street 51, #01-35, Hougang Green Shopping Mall, Singapore 538719", hours: "8am-11pm" },
  
  // Jurong East
  { name: "FairPrice Xtra Jurong Point", address: "63 Jurong Central 3, #03-01, Jurong Point, Singapore 648331", hours: "24 Hours" },
  { name: "FairPrice JEM", address: "50 Jurong Gateway Road, #B1-01, JEM, Singapore 608549", hours: "8am-11pm" },
  { name: "FairPrice Westgate", address: "3 Gateway Drive, #B2-01, Westgate, Singapore 608532", hours: "8am-11pm" },
  
  // Jurong West
  { name: "FairPrice Jurong West Blk 504", address: "504 Jurong West Street 51, #01-291, Singapore 640504", hours: "7am-11pm" },
  { name: "FairPrice Jurong West Blk 143", address: "143 Jurong Gateway Road, #01-279, Singapore 600143", hours: "24 Hours" },
  { name: "FairPrice Gek Poh Shopping Centre", address: "762 Jurong West Street 75, #01-265, Gek Poh Shopping Centre, Singapore 640762", hours: "8am-11pm" },
  
  // Kallang
  { name: "FairPrice Kallang Wave Mall", address: "1 Stadium Place, #B1-01, Kallang Wave Mall, Singapore 397628", hours: "8am-11pm" },
  { name: "FairPrice Bendemeer", address: "30 Bendemeer Road, #01-871, Singapore 330030", hours: "8am-10pm" },
  
  // Marine Parade
  { name: "FairPrice Marine Parade", address: "80 Marine Parade Road, #01-01, Parkway Parade, Singapore 449269", hours: "8am-11pm" },
  { name: "FairPrice Chai Chee", address: "29B Chai Chee Ave, #01-62, Singapore 462029", hours: "24 Hours" },
  
  // Novena
  { name: "FairPrice Velocity @ Novena Square", address: "238 Thomson Road, #B2-01, Velocity @ Novena Square, Singapore 307683", hours: "8am-11pm" },
  { name: "FairPrice United Square", address: "101 Thomson Road, #B1-01, United Square, Singapore 307591", hours: "8am-11pm" },
  
  // Pasir Ris
  { name: "FairPrice Downtown East", address: "1 Pasir Ris Close, #02-127, E!Hub Downtown East, Singapore 519599", hours: "8am-11pm" },
  { name: "FairPrice White Sands", address: "1 Pasir Ris Central Street 3, #B1-01, White Sands, Singapore 518457", hours: "8am-11pm" },
  { name: "FairPrice Pasir Ris Blk 279", address: "279 Pasir Ris Street 21, #01-111, Singapore 510279", hours: "7am-11pm" },
  
  // Punggol
  { name: "FairPrice Waterway Point", address: "83 Punggol Central, #B1-01, Waterway Point, Singapore 828761", hours: "8am-11pm" },
  { name: "FairPrice Punggol Plaza", address: "168 Punggol Field, #01-01, Punggol Plaza, Singapore 820168", hours: "8am-11pm" },
  { name: "FairPrice Punggol Blk 681A", address: "681A Punggol Drive, #01-01, Singapore 821681", hours: "7am-11pm" },
  
  // Queenstown
  { name: "FairPrice Queensway Shopping Centre", address: "1 Queensway, #01-01, Queensway Shopping Centre, Singapore 149053", hours: "8am-11pm" },
  { name: "FairPrice Dawson Place", address: "57 Dawson Road, #01-07, Dawson Place, Singapore 142057", hours: "24 Hours" },
  { name: "FairPrice Cambridge Blk 43", address: "43 Cambridge Road, #01-15, Singapore 210043", hours: "7am-11pm" },
  
  // Sembawang
  { name: "FairPrice Sun Plaza", address: "30 Sembawang Drive, #B1-01, Sun Plaza, Singapore 757713", hours: "8am-11pm" },
  { name: "FairPrice Sembawang Shopping Centre", address: "604 Sembawang Road, #01-01, Sembawang Shopping Centre, Singapore 758459", hours: "8am-11pm" },
  
  // Sengkang
  { name: "FairPrice Compass One", address: "1 Sengkang Square, #B1-01, Compass One, Singapore 545078", hours: "8am-11pm" },
  { name: "FairPrice Compassvale Link", address: "277C Compassvale Link, #01-13, Singapore 544277", hours: "24 Hours" },
  { name: "FairPrice Sengkang Grand Mall", address: "70 Sengkang East Way, #01-01, Sengkang Grand Mall, Singapore 544792", hours: "8am-11pm" },
  { name: "FairPrice Rivervale Mall", address: "11 Rivervale Crescent, #B1-01, Rivervale Mall, Singapore 545082", hours: "8am-11pm" },
  
  // Serangoon
  { name: "FairPrice NEX", address: "23 Serangoon Central, #B2-01, NEX, Singapore 556083", hours: "8am-11pm" },
  { name: "FairPrice myVillage at Serangoon Garden", address: "1 Maju Avenue, #01-01, myVillage at Serangoon Garden, Singapore 556679", hours: "8am-11pm" },
  { name: "FairPrice Serangoon Blk 261", address: "261 Serangoon Central Drive, #01-57, Singapore 550261", hours: "7am-11pm" },
  
  // Simei
  { name: "FairPrice Eastpoint", address: "3 Simei Street 6, #05-01, Eastpoint, Singapore 528833", hours: "24 Hours" },
  { name: "FairPrice Simei Blk 203", address: "203 Simei Street 1, #01-09, Singapore 520203", hours: "7am-11pm" },
  
  // Tampines
  { name: "FairPrice Tampines Mall", address: "4 Tampines Central 5, #B1-01, Tampines Mall, Singapore 529510", hours: "10am-10pm" },
  { name: "FairPrice Tampines 1", address: "10 Tampines Central 1, #04-01, Tampines 1, Singapore 529536", hours: "8am-11pm" },
  { name: "FairPrice Century Square", address: "2 Tampines Central 5, #B1-01, Century Square, Singapore 529509", hours: "8am-11pm" },
  { name: "FairPrice Tampines Blk 201", address: "201 Tampines Street 21, #01-1139, Singapore 520201", hours: "7am-11pm" },
  { name: "FairPrice Tampines Blk 827", address: "827 Tampines Street 81, #01-148, Singapore 520827", hours: "24 Hours" },
  
  // Toa Payoh
  { name: "FairPrice HDB Hub", address: "480 Lorong 6 Toa Payoh, #B1-01, HDB Hub, Singapore 310480", hours: "8am-11pm" },
  { name: "FairPrice Toa Payoh Blk 185", address: "185 Toa Payoh Central, #01-334, Singapore 310185", hours: "7am-11pm" },
  { name: "FairPrice Toa Payoh Blk 79", address: "79 Toa Payoh Central, #01-01, Singapore 310079", hours: "24 Hours" },
  
  // Woodlands
  { name: "FairPrice Woodlands MRT", address: "30 Woodlands Ave 2, #01-05, Woodlands MRT Station, Singapore 738343", hours: "6am-12am" },
  { name: "FairPrice Causeway Point", address: "1 Woodlands Square, #B1-01, Causeway Point, Singapore 738099", hours: "8am-11pm" },
  { name: "FairPrice Woodlands Blk 888", address: "888 Woodlands Drive 50, #01-745, Singapore 730888", hours: "7am-11pm" },
  { name: "FairPrice Admiralty Place", address: "678 Woodlands Ave 6, #01-01, Admiralty Place, Singapore 730678", hours: "8am-11pm" },
  
  // Yishun
  { name: "FairPrice Yishun 10", address: "51 Yishun Central 1, #02-32, Yishun 10, Singapore 768794", hours: "24 Hours" },
  { name: "FairPrice Northpoint City", address: "930 Yishun Ave 2, #B1-01, Northpoint City, Singapore 769098", hours: "8am-11pm" },
  { name: "FairPrice Yishun Blk 925", address: "925 Yishun Central 1, #01-215, Singapore 760925", hours: "7am-11pm" },
  { name: "FairPrice Yishun Blk 846", address: "846 Yishun Ring Road, #01-3651, Singapore 760846", hours: "24 Hours" },
  
  // Additional stores from various sources
  { name: "FairPrice Finest Scotts Square", address: "6 Scotts Road, #B1-01, Scotts Square, Singapore 228209", hours: "8am-11pm", storeType: "FairPrice Finest" },
  { name: "FairPrice Finest Great World City", address: "1 Kim Seng Promenade, #B1-01, Great World City, Singapore 237994", hours: "8am-11pm", storeType: "FairPrice Finest" },
  { name: "FairPrice Finest Market Street", address: "1 Raffles Place, #B1-01, One Raffles Place, Singapore 048616", hours: "7am-9pm", storeType: "FairPrice Finest" },
  { name: "FairPrice Finest Raffles City", address: "252 North Bridge Road, #B1-01, Raffles City Shopping Centre, Singapore 179103", hours: "8am-11pm", storeType: "FairPrice Finest" },
  { name: "FairPrice Finest Parkway Parade", address: "80 Marine Parade Road, #B1-01, Parkway Parade, Singapore 449269", hours: "8am-11pm", storeType: "FairPrice Finest" },
  { name: "FairPrice Finest Tanglin Mall", address: "163 Tanglin Road, #B1-01, Tanglin Mall, Singapore 247933", hours: "8am-11pm", storeType: "FairPrice Finest" },
  { name: "FairPrice Finest Forum The Shopping Mall", address: "583 Orchard Road, #B1-01, Forum The Shopping Mall, Singapore 238884", hours: "8am-11pm", storeType: "FairPrice Finest" },
  
  // FairPrice Xtra (Hypermarkets)
  { name: "FairPrice Xtra Harbourfront Centre", address: "1 Maritime Square, #02-01, HarbourFront Centre, Singapore 099253", hours: "24 Hours", storeType: "FairPrice Xtra" },
  { name: "FairPrice Xtra Nex", address: "23 Serangoon Central, #B2-01, NEX, Singapore 556083", hours: "8am-11pm", storeType: "FairPrice Xtra" },
  { name: "FairPrice Xtra Ang Mo Kio", address: "53 Ang Mo Kio Ave 3, #B1-01, AMK Hub, Singapore 569933", hours: "8am-11pm", storeType: "FairPrice Xtra" }
];

/**
 * Update all FairPrice store coordinates using OneMap API
 */
const updateAllFairPriceStores = async () => {
  console.log('🏪 Starting comprehensive FairPrice store geocoding...');
  console.log(`Total stores to process: ${ALL_FAIRPRICE_STORES.length}`);
  
  try {
    // Get OneMap access token
    const token = await getOneMapToken();
    console.log('✓ OneMap authentication successful');
    
    const updatedStores = [];
    const failedStores = [];
    const successfulStores = [];
    
    for (let i = 0; i < ALL_FAIRPRICE_STORES.length; i++) {
      const store = ALL_FAIRPRICE_STORES[i];
      console.log(`\nProcessing ${i + 1}/${ALL_FAIRPRICE_STORES.length}: ${store.name}`);
      
      try {
        const result = await geocodeWithOneMap(store.address, store.name, token);
        
        if (result) {
          updatedStores.push({
            ...store,
            latitude: result.latitude,
            longitude: result.longitude,
          });
          successfulStores.push({
            name: store.name,
            searchTerm: result.searchTerm,
            foundAddress: result.foundAddress
          });
          console.log(`✓ SUCCESS: ${result.latitude}, ${result.longitude}`);
          console.log(`  Found via: "${result.searchTerm}"`);
          console.log(`  Address: ${result.foundAddress}`);
        } else {
          updatedStores.push({
            ...store,
            latitude: null,
            longitude: null,
          });
          failedStores.push(store.name);
          console.log(`❌ FAILED: Could not geocode any address variant`);
        }
      } catch (error) {
        console.error(`❌ ERROR geocoding ${store.name}:`, error);
        updatedStores.push({
          ...store,
          latitude: null,
          longitude: null,
        });
        failedStores.push(store.name);
      }
      
      // Add delay to respect API rate limits
      if (i < ALL_FAIRPRICE_STORES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }
    
    console.log('\n=== GEOCODING SUMMARY ===');
    console.log(`Total stores processed: ${ALL_FAIRPRICE_STORES.length}`);
    console.log(`Successfully geocoded: ${successfulStores.length}`);
    console.log(`Failed to geocode: ${failedStores.length}`);
    console.log(`Success rate: ${((successfulStores.length / ALL_FAIRPRICE_STORES.length) * 100).toFixed(1)}%`);
    
    if (failedStores.length > 0) {
      console.log('\n❌ Failed stores:');
      failedStores.forEach(name => console.log(`- ${name}`));
    }
    
    if (successfulStores.length > 0) {
      console.log('\n✅ Sample successful geocoding results:');
      successfulStores.slice(0, 5).forEach(result => {
        console.log(`- ${result.name}`);
        console.log(`  Search term: "${result.searchTerm}"`);
        console.log(`  Found: ${result.foundAddress}`);
      });
    }
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'fairprice-stores-updated.json');
    fs.writeFileSync(outputPath, JSON.stringify(updatedStores, null, 2));
    console.log(`\n💾 Updated store data saved to: ${outputPath}`);
    
    return updatedStores;
    
  } catch (error) {
    console.error('❌ Error during geocoding process:', error);
    throw error;
  }
};

// Run the update process
updateAllFairPriceStores()
  .then(() => {
    console.log('\n🎉 Store update process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Store update process failed:', error);
    process.exit(1);
  });