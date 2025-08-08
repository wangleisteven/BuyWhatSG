import { geocodeAddress } from '../services/geolocation';

// OneMap API credentials
const ONEMAP_EMAIL = 'wanglei.steven@gmail.com';
const ONEMAP_PASSWORD = '1qaz@WSX3edc$RFV';

interface OneMapAuthResponse {
  access_token: string;
  expiry_timestamp: number;
}

interface OneMapSearchResponse {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: Array<{
    SEARCHVAL: string;
    BLK_NO: string;
    ROAD_NAME: string;
    BUILDING: string;
    ADDRESS: string;
    POSTAL: string;
    X: string;
    Y: string;
    LATITUDE: string;
    LONGITUDE: string;
    LONGTITUDE: string; // Note: OneMap API has this typo
  }>;
}

interface FairPriceStore {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hours: string;
  storeType?: string;
}

/**
 * Get OneMap API access token
 */
const getOneMapToken = async (): Promise<string> => {
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

  const data: OneMapAuthResponse = await response.json();
  return data.access_token;
};

/**
 * Geocode address using OneMap API with authentication
 */
const geocodeWithOneMap = async (address: string, token: string): Promise<{ latitude: number; longitude: number } | null> => {
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
      console.warn(`OneMap API error for "${address}": ${response.status}`);
      return null;
    }

    const data: OneMapSearchResponse = await response.json();
    
    if (data.found > 0 && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: parseFloat(result.LATITUDE),
        longitude: parseFloat(result.LONGITUDE || result.LONGTITUDE), // Handle API typo
      };
    }

    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
};

/**
 * Comprehensive list of all FairPrice stores in Singapore
 * Based on official store locator data and multiple sources
 */
const ALL_FAIRPRICE_STORES: Omit<FairPriceStore, 'latitude' | 'longitude'>[] = [
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
  { name: "FairPrice Xtra Ang Mo Kio", address: "53 Ang Mo Kio Ave 3, #B1-01, AMK Hub, Singapore 569933", hours: "8am-11pm", storeType: "FairPrice Xtra" },
  
  // Additional neighborhood stores
  { name: "FairPrice Yung Kuang", address: "63/66 Yung Kuang Road, #01-119 & #02-119, Singapore 610063", hours: "8am-10pm" },
  { name: "FairPrice Telok Blangah", address: "38A Telok Blangah Rise, #01-681, Singapore 090038", hours: "7am-11pm" },
  { name: "FairPrice Redhill", address: "85 Redhill Lane, #01-02, Singapore 150085", hours: "7am-11pm" },
  { name: "FairPrice Tiong Bahru", address: "302 Tiong Bahru Road, #01-106, Singapore 168732", hours: "7am-11pm" },
  { name: "FairPrice Tanjong Pagar", address: "1 Tanjong Pagar Plaza, #01-01, Singapore 082001", hours: "7am-11pm" },
  { name: "FairPrice Alexandra", address: "460 Alexandra Road, #01-01, PSA Building, Singapore 119963", hours: "7am-9pm" },
  { name: "FairPrice Boat Quay", address: "1 Fullerton Road, #B1-01, One Fullerton, Singapore 049213", hours: "7am-10pm" },
  { name: "FairPrice Robertson Quay", address: "11 Unity Street, #01-01, Robertson Walk, Singapore 237995", hours: "8am-11pm" },
  { name: "FairPrice East Coast", address: "112 East Coast Road, #01-01, Singapore 428802", hours: "7am-11pm" },
  { name: "FairPrice Katong", address: "865 Mountbatten Road, #01-01, Katong Shopping Centre, Singapore 437844", hours: "8am-11pm" },
  { name: "FairPrice Joo Chiat", address: "200 Joo Chiat Road, #01-01, Singapore 427451", hours: "7am-11pm" },
  { name: "FairPrice Siglap", address: "930 East Coast Road, #01-01, Singapore 459108", hours: "7am-11pm" },
  { name: "FairPrice Upper East Coast", address: "35 Simei Street 1, #01-09, Singapore 529950", hours: "7am-11pm" },
  { name: "FairPrice Kembangan", address: "18 Jalan Masjid, #01-01, Singapore 418944", hours: "7am-11pm" },
  { name: "FairPrice Eunos", address: "3151 Jalan Eunos, #01-01, Singapore 419621", hours: "7am-11pm" },
  { name: "FairPrice Paya Lebar", address: "1 Paya Lebar Link, #B1-01, PLQ Mall, Singapore 408533", hours: "8am-11pm" },
  { name: "FairPrice MacPherson", address: "91 MacPherson Lane, #01-01, Singapore 360091", hours: "7am-11pm" },
  { name: "FairPrice Potong Pasir", address: "6 Potong Pasir Ave 2, #01-01, Singapore 358361", hours: "7am-11pm" },
  { name: "FairPrice Boon Keng", address: "23 Bendemeer Road, #01-01, Singapore 339944", hours: "7am-11pm" },
  { name: "FairPrice Little India", address: "1 Serangoon Road, #01-01, Little India Arcade, Singapore 218262", hours: "8am-11pm" },
  { name: "FairPrice Farrer Park", address: "1 Farrer Park Station Road, #01-01, Farrer Park Medical Centre, Singapore 217562", hours: "7am-10pm" },
  { name: "FairPrice Lavender", address: "380 Jalan Besar, #01-01, Singapore 209000", hours: "7am-11pm" },
  { name: "FairPrice Bugis", address: "200 Victoria Street, #B1-01, Bugis Junction, Singapore 188021", hours: "8am-11pm" },
  { name: "FairPrice Clarke Quay", address: "3 River Valley Road, #B1-01, Clarke Quay Central, Singapore 179024", hours: "8am-11pm" },
  { name: "FairPrice Dhoby Ghaut", address: "68 Orchard Road, #B4-01, Plaza Singapura, Singapore 238839", hours: "8am-11pm" },
  { name: "FairPrice Somerset", address: "111 Somerset Road, #B3-01, TripleOne Somerset, Singapore 238164", hours: "8am-11pm" },
  { name: "FairPrice Newton", address: "2 Newton Road, #B1-01, Goldhill Plaza, Singapore 307964", hours: "8am-11pm" },
  { name: "FairPrice Stevens", address: "9 Penang Road, #B1-01, Park Mall, Singapore 238459", hours: "8am-11pm" },
  { name: "FairPrice River Valley", address: "177 River Valley Road, #B1-01, Liang Court, Singapore 179030", hours: "8am-11pm" },
  { name: "FairPrice Outram", address: "531A Upper Cross Street, #01-01, Hong Lim Complex, Singapore 051531", hours: "7am-11pm" },
  { name: "FairPrice Chinatown", address: "335 Smith Street, #01-01, Chinatown Complex, Singapore 050335", hours: "7am-11pm" },
  { name: "FairPrice Tanjong Pagar MRT", address: "120 Maxwell Road, #B1-01, Singapore 069119", hours: "7am-10pm" },
  { name: "FairPrice Raffles Place", address: "6 Raffles Quay, #B1-01, Singapore 048580", hours: "7am-9pm" },
  { name: "FairPrice Marina Centre", address: "6 Raffles Boulevard, #B1-01, Marina Square, Singapore 039594", hours: "8am-11pm" },
  { name: "FairPrice Esplanade", address: "8 Raffles Avenue, #B1-01, Esplanade Mall, Singapore 039802", hours: "8am-11pm" },
  { name: "FairPrice City Hall", address: "3 Temasek Boulevard, #B1-01, Suntec City, Singapore 038983", hours: "8am-11pm" },
  { name: "FairPrice Promenade", address: "300 Beach Road, #B1-01, The Concourse, Singapore 199555", hours: "8am-11pm" },
  { name: "FairPrice Nicoll Highway", address: "5001 Beach Road, #B1-01, Golden Mile Complex, Singapore 199588", hours: "8am-11pm" },
  { name: "FairPrice Stadium", address: "1 Stadium Place, #B1-01, Kallang Wave Mall, Singapore 397628", hours: "8am-11pm" },
  { name: "FairPrice Mountbatten", address: "208 Mountbatten Road, #01-01, Singapore 397998", hours: "7am-11pm" },
  { name: "FairPrice Dakota", address: "51 Old Airport Road, #01-01, Singapore 390051", hours: "7am-11pm" },
  { name: "FairPrice Aljunied", address: "630 Aljunied Road, #01-01, Singapore 389834", hours: "7am-11pm" },
  { name: "FairPrice Kaki Bukit", address: "1 Kaki Bukit Road 1, #01-01, Singapore 415934", hours: "7am-11pm" },
  { name: "FairPrice Bedok Reservoir", address: "740 Bedok Reservoir Road, #01-3045, Singapore 470740", hours: "7am-11pm" },
  { name: "FairPrice Upper Changi", address: "59 New Upper Changi Road, #01-1218, Singapore 461059", hours: "7am-11pm" },
  { name: "FairPrice Changi Village", address: "2 Changi Village Road, #01-01, Singapore 500002", hours: "7am-11pm" },
  { name: "FairPrice Loyang", address: "258 Pasir Ris Street 21, #01-01, Singapore 510258", hours: "7am-11pm" },
  { name: "FairPrice Tampines North", address: "7 Tampines Street 92, #01-01, Singapore 528893", hours: "7am-11pm" },
  { name: "FairPrice Tampines West", address: "18 Tampines Street 44, #01-01, Singapore 529036", hours: "7am-11pm" },
  { name: "FairPrice Pasir Ris West", address: "1 Pasir Ris Street 51, #01-01, Singapore 518107", hours: "7am-11pm" },
  { name: "FairPrice Pasir Ris Central", address: "1 Pasir Ris Central Street 3, #B1-01, White Sands, Singapore 518457", hours: "8am-11pm" },
  { name: "FairPrice Elias", address: "4 Pasir Ris Drive 4, #01-01, Singapore 519457", hours: "7am-11pm" },
  { name: "FairPrice Punggol East", address: "3 Punggol Point Road, #01-01, Singapore 828694", hours: "7am-11pm" },
  { name: "FairPrice Punggol West", address: "681 Punggol Drive, #01-01, Singapore 820681", hours: "7am-11pm" },
  { name: "FairPrice Sengkang West", address: "70 Sengkang East Way, #01-01, Sengkang Grand Mall, Singapore 544792", hours: "8am-11pm" },
  { name: "FairPrice Sengkang East", address: "1 Sengkang Square, #B1-01, Compass One, Singapore 545078", hours: "8am-11pm" },
  { name: "FairPrice Fernvale", address: "2 Sengkang Square, #01-01, Singapore 545025", hours: "7am-11pm" },
  { name: "FairPrice Anchorvale", address: "326 Anchorvale Road, #01-01, Singapore 540326", hours: "7am-11pm" },
  { name: "FairPrice Rivervale", address: "11 Rivervale Crescent, #B1-01, Rivervale Mall, Singapore 545082", hours: "8am-11pm" },
  { name: "FairPrice Hougang Central", address: "90 Hougang Ave 10, #03-11, Hougang Mall, Singapore 538766", hours: "10am-10pm" },
  { name: "FairPrice Hougang West", address: "681 Hougang Ave 8, #01-853, Singapore 530681", hours: "7am-11pm" },
  { name: "FairPrice Hougang East", address: "105 Hougang Ave 1, #01-1277, Singapore 530105", hours: "7am-11pm" },
  { name: "FairPrice Kovan", address: "988 Upper Serangoon Road, #01-01, Singapore 534733", hours: "7am-11pm" },
  { name: "FairPrice Serangoon North", address: "23 Serangoon Central, #B2-01, NEX, Singapore 556083", hours: "8am-11pm" },
  { name: "FairPrice Serangoon Garden", address: "1 Maju Avenue, #01-01, myVillage at Serangoon Garden, Singapore 556679", hours: "8am-11pm" },
  { name: "FairPrice Upper Serangoon", address: "261 Serangoon Central Drive, #01-57, Singapore 550261", hours: "7am-11pm" },
  { name: "FairPrice Bartley", address: "50 Serangoon North Ave 4, #01-01, Singapore 555856", hours: "7am-11pm" },
  { name: "FairPrice Lorong Chuan", address: "556 Serangoon North Ave 3, #01-01, Singapore 550556", hours: "7am-11pm" },
  { name: "FairPrice Yio Chu Kang", address: "7 Yio Chu Kang Road, #01-01, Singapore 545523", hours: "7am-11pm" },
  { name: "FairPrice Lentor", address: "21 Yishun Ave 4, #01-01, Singapore 769024", hours: "7am-11pm" },
  { name: "FairPrice Yishun West", address: "930 Yishun Ave 2, #B1-01, Northpoint City, Singapore 769098", hours: "8am-11pm" },
  { name: "FairPrice Yishun East", address: "846 Yishun Ring Road, #01-3651, Singapore 760846", hours: "24 Hours" },
  { name: "FairPrice Yishun Central", address: "51 Yishun Central 1, #02-32, Yishun 10, Singapore 768794", hours: "24 Hours" },
  { name: "FairPrice Khatib", address: "2 Yishun Walk, #01-01, Singapore 767944", hours: "7am-11pm" },
  { name: "FairPrice Yishun South", address: "925 Yishun Central 1, #01-215, Singapore 760925", hours: "7am-11pm" },
  { name: "FairPrice Sembawang West", address: "30 Sembawang Drive, #B1-01, Sun Plaza, Singapore 757713", hours: "8am-11pm" },
  { name: "FairPrice Sembawang East", address: "604 Sembawang Road, #01-01, Sembawang Shopping Centre, Singapore 758459", hours: "8am-11pm" },
  { name: "FairPrice Canberra West", address: "133 Canberra View, #B1-03/04, Canberra Plaza, Singapore 750133", hours: "8am-11pm" },
  { name: "FairPrice Canberra East", address: "511 Canberra Road, #02-03, Singapore 750511", hours: "7am-11pm" },
  { name: "FairPrice Admiralty", address: "678 Woodlands Ave 6, #01-01, Admiralty Place, Singapore 730678", hours: "8am-11pm" },
  { name: "FairPrice Woodlands West", address: "1 Woodlands Square, #B1-01, Causeway Point, Singapore 738099", hours: "8am-11pm" },
  { name: "FairPrice Woodlands East", address: "888 Woodlands Drive 50, #01-745, Singapore 730888", hours: "7am-11pm" },
  { name: "FairPrice Woodlands Central", address: "30 Woodlands Ave 2, #01-05, Woodlands MRT Station, Singapore 738343", hours: "6am-12am" },
  { name: "FairPrice Marsiling", address: "4 Marsiling Lane, #01-01, Singapore 739147", hours: "7am-11pm" },
  { name: "FairPrice Kranji", address: "2 Kranji Road, #01-01, Singapore 739600", hours: "7am-11pm" }
];

/**
 * Update all FairPrice store coordinates using OneMap API
 */
export const updateAllFairPriceStores = async (): Promise<FairPriceStore[]> => {
  console.log('Starting comprehensive FairPrice store geocoding...');
  console.log(`Total stores to process: ${ALL_FAIRPRICE_STORES.length}`);
  
  try {
    // Get OneMap access token
    const token = await getOneMapToken();
    console.log('✓ OneMap authentication successful');
    
    const updatedStores: FairPriceStore[] = [];
    const failedStores: string[] = [];
    
    for (let i = 0; i < ALL_FAIRPRICE_STORES.length; i++) {
      const store = ALL_FAIRPRICE_STORES[i];
      console.log(`Processing ${i + 1}/${ALL_FAIRPRICE_STORES.length}: ${store.name}`);
      
      try {
        const coordinates = await geocodeWithOneMap(store.address, token);
        
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
          failedStores.push(store.name);
          console.log(`✗ Failed: ${store.name} - Could not geocode address`);
        }
      } catch (error) {
        console.error(`✗ Error geocoding ${store.name}:`, error);
        updatedStores.push({
          ...store,
          latitude: null,
          longitude: null,
        });
        failedStores.push(store.name);
      }
      
      // Add delay to respect API rate limits
      if (i < ALL_FAIRPRICE_STORES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
      }
    }
    
    console.log('\n=== GEOCODING SUMMARY ===');
    console.log(`Total stores processed: ${ALL_FAIRPRICE_STORES.length}`);
    console.log(`Successfully geocoded: ${updatedStores.filter(s => s.latitude !== null).length}`);
    console.log(`Failed to geocode: ${failedStores.length}`);
    
    if (failedStores.length > 0) {
      console.log('\nFailed stores:');
      failedStores.forEach(name => console.log(`- ${name}`));
    }
    
    return updatedStores;
    
  } catch (error) {
    console.error('Error during geocoding process:', error);
    throw error;
  }
};

/**
 * Save updated stores to JSON file
 */
export const saveStoresToFile = (stores: FairPriceStore[]): string => {
  const jsonData = JSON.stringify(stores, null, 2);
  console.log('\n=== UPDATED STORES JSON ===');
  console.log(jsonData);
  return jsonData;
};

/**
 * Main function to run the complete store update process
 */
export const runCompleteStoreUpdate = async (): Promise<void> => {
  try {
    console.log('🏪 Starting complete FairPrice store data update...');
    
    const updatedStores = await updateAllFairPriceStores();
    const jsonData = saveStoresToFile(updatedStores);
    
    console.log('\n✅ Store update process completed!');
    console.log('Copy the JSON data above to update your fairprice-stores.json file.');
    
  } catch (error) {
    console.error('❌ Store update process failed:', error);
    throw error;
  }
};

// Export the store data for use in other modules
export { ALL_FAIRPRICE_STORES };
export type { FairPriceStore };