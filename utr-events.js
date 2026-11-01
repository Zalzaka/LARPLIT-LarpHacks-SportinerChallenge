// ---------- real events from the UTR Sports database ----------
// Open-registration tennis events copied from https://app.utrsports.net/search (type=events, singles/verified, UTR 1-16).
// Each row: [UTR event id, name, date YYYY-MM-DD, time, venue, city, fee text, first fee amount (0 = free), UTR min, UTR max, format]

const UTR_ROWS = [
  [394538, 'Milton Ulladulla Tennis Club AO 1 Point Slam Community Event', '2026-11-02', '6:30 PM', 'Milton Ulladulla Tennis Club', 'Ulladulla, Australia', 'Free', 0, 1, 16, 'Singles'],
  [407543, 'KTP Sports Panania Monday Night 6:30PM (Verified Event)', '2026-11-02', '6:30 PM', 'Kellert Tennis', 'Panania, Australia', 'AU$25', 25, 1, 15.5, 'Singles'],
  [397893, 'Inspiration Academy Weekly High Performance Camps and Matchplay', '2026-11-02', '3:00 PM', 'Inspiration Academy', 'Bradenton, FL', 'Free to $550', 0, 1, 16, 'Singles'],
  [406935, 'Cup Day Singles Classic ($200/$100 for winner, $100/$50 for runner-up)', '2026-11-03', '8:00 AM', 'Lakeview Tennis Club', 'Reservoir, Australia', 'AU$40 to AU$70', 40, 1, 16, 'Singles, $450 prize money'],
  [399909, 'Monday Night League 9-11pm week 8', '2026-11-02', '9:00 PM', "Ian's UTR match play at Northampton Tennis and Fitness Center", 'Richboro, PA', '$35 to $48', 35, 1, 16, 'Singles'],
  [400577, 'Matchplay at TTC Hosted by Kareem', '2026-11-02', '5:30 PM', 'Kareem Gobran - Tennis Newport Beach', 'Newport Beach, CA', 'Free', 0, 1, 16, 'Singles'],
  [389801, 'Election Day Doubles Junior Tournament, Tuesday November 3rd', '2026-11-03', '10:30 AM', 'Tennis Club of Trumbull', 'Trumbull, CT', '$30', 30, 1, 4.5, 'Doubles'],
  [408010, 'Gillette & Chatham: UTR Singles Holiday Matches, Tues Nov 3', '2026-11-03', '12:00 PM', 'Centercourt Club & Sports', 'Florham Park, NJ', '$42 to $44', 42, 1, 16, 'Singles'],
  [406756, 'School is OUT! Junior UTR Matchplay Challenge 1-3 PM', '2026-11-03', '12:00 PM', 'SPORTIME Kings Park', 'Kings Park, NY', '$45', 45, 1, 5, 'Singles'],
  [391545, 'TIC Beachwalk Co-Ed Doubles Challenge 2 Verified Matchplay (3 matches in 3 hours, free pizza)', '2026-11-03', '6:30 PM', 'Garry Robinson (The Inch Coach)', 'Saint Johns, FL', '$25', 25, 1, 16, 'Doubles'],
  [406998, 'Fall Singles Match Play #9', '2026-11-03', '8:00 PM', 'Apex Racket & Fitness', 'Portland, ME', '$30', 30, 1, 16, 'Singles'],
  [400583, 'Matchplay at TTC Hosted by Kareem', '2026-11-03', '5:30 PM', 'Kareem Gobran - Tennis Newport Beach', 'Newport Beach, CA', 'Free', 0, 1, 16, 'Singles'],
  [402606, 'Sydney: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Sydney Tennis Flex Leagues', 'Sydney, Australia', 'AU$70 to AU$76', 70, 1, 16, 'Doubles flex league'],
  [405795, 'Spring UTR Castlemaine Match Play Series, Week 3', '2026-11-04', '5:30 PM', 'Castlemaine Lawn Tennis Club', 'Castlemaine, Australia', 'AU$12.60 to AU$19.60', 13, 1, 16, 'Singles'],
  [402652, 'Sunshine Coast: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Sunshine Coast Tennis Flex Leagues', 'Sunshine Coast, Australia', 'AU$70', 70, 1, 16, 'Doubles flex league'],
  [402647, 'Brisbane: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Brisbane Tennis Flex Leagues', 'Brisbane, Australia', 'AU$70 to AU$76', 70, 1, 16, 'Doubles flex league'],
  [408101, 'West Tamworth Tennis Club AO 1 Point Slam Community Event', '2026-11-04', '6:00 PM', 'West Tamworth Tennis Club', 'West Tamworth, Australia', 'Free', 0, 1, 16, 'Singles'],
  [408282, 'Kempsey Tennis Club AO 1 Point Slam Community Event', '2026-11-04', '6:30 PM', 'Kempsey Tennis Club', 'West Kempsey, Australia', 'Free', 0, 1, 16, 'Singles'],
  [397104, 'Hampton Park Tennis Club AO 1 Point Slam Community Event', '2026-11-04', '7:30 PM', 'Hampton Park Tennis Club', 'Hampton Park, Australia', 'Free', 0, 1, 16, 'Singles'],
  [402651, 'Singapore: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Singapore Tennis Flex Leagues', 'Singapore', '$70', 70, 1, 16, 'Doubles flex league'],
  [401978, 'Circuito Witt Semillero (Bola Verde)', '2026-11-04', '8:00 AM', 'Witt Academy', 'Merida, Mexico', 'MXN$450', 450, 1, 16, 'Singles'],
  [401138, 'Circuito Witt All Levels + Prize Money $8,000', '2026-11-04', '8:00 AM', 'Witt Academy', 'Merida, Mexico', 'MXN$600 to MXN$800', 600, 1, 16, 'Singles, prize money'],
  [405238, 'Torneo Intercolegial', '2026-11-04', '8:00 AM', 'Tecos Tennis Club', 'Zapopan, Mexico', 'Free to MXN$112', 0, 1, 16, 'Singles'],
  [392984, 'NBL Doubles Tournament', '2026-11-04', '1:00 PM', 'Santa Rosa High School - Girls', 'Santa Rosa, CA', 'Free', 0, 1, 16, "Women's doubles"],
  [402637, 'Rhode Island: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Rhode Island Tennis Flex Leagues', 'Rhode Island', '$52', 52, 1, 16, 'Doubles flex league'],
  [402650, 'Greenville Tennis Collective: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Greenville Tennis Collective Flex Leagues', 'Greenville, SC', '$50', 50, 1, 16, 'Doubles flex league'],
  [402634, 'Broward County: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Broward County Tennis Flex Leagues', 'Broward County, FL', '$33 to $66', 33, 1, 16, 'Doubles or singles flex league'],
  [402629, 'Chattanooga: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Chattanooga Tennis Flex Leagues', 'Chattanooga, TN', '$64', 64, 1, 16, 'Doubles flex league'],
  [402649, 'Jersey City: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Jersey City Tennis Flex Leagues', 'Jersey City, NJ', '$70', 70, 1, 16, 'Doubles flex league'],
  [402626, 'Tampa: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Tampa Tennis Flex Leagues', 'Tampa, FL', '$35 to $70', 35, 1, 16, 'Doubles or singles flex league'],
  [402648, 'Peachtree City: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Peachtree City Tennis Flex Leagues', 'Peachtree City, GA', '$64', 64, 1, 16, 'Doubles flex league'],
  [402623, 'Toronto: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Toronto Tennis Flex Leagues', 'Toronto', 'CAN$70', 70, 1, 16, 'Doubles flex league'],
  [402624, 'Dallas/Fort Worth DFW: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Dallas/Fort Worth Tennis Flex Leagues', 'Euless, TX', '$70', 70, 1, 16, 'Doubles flex league'],
  [402631, 'Pensacola: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Pensacola Tennis Flex Leagues', 'Pensacola, FL', '$50', 50, 1, 16, 'Doubles flex league'],
  [402621, 'Houston: Doubles Flex League Nov 4th-Jan 13th', '2026-11-04', '5:00 PM', 'Houston Tennis Flex Leagues', 'Houston, TX', '$70', 70, 1, 16, 'Doubles flex league'],
];

// UTR runs 1 to 16; the app's levels run 1 to 5.
const utrToLevel = (u) => Math.round((1 + ((u - 1) * 4) / 15) * 10) / 10;

const UTR_DEFS = UTR_ROWS.map(([id, name, dateIso, time, venue, area, feeText, fee, uMin, uMax, format]) => ({
  id: 'u' + id, real: true, name, sport: 'tennis', area, venue, dateIso, time,
  min: utrToLevel(uMin), max: utrToLevel(uMax), uMin, uMax, fee, feeText, format,
  blurb: `${venue}. UTR ${uMin.toFixed(1)} to ${uMax.toFixed(1)}.`,
  url: 'https://app.utrsports.net/events/' + id,
}));
