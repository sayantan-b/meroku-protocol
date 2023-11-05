const fs = require('fs');
const { google } = require('googleapis');
const dotenv = require('dotenv')

dotenv.config()
const google_key = process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join(
  "\n"
);

/**
 * Reads a JSON file and returns its contents as a JavaScript object.
 * @param {string} filename - The path of the JSON file to be read.
 * @returns {Object|null} - The contents of the JSON file as a JavaScript object, or null if an error occurred.
 */
function readJSONFile(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}: ${error.message}`);
    return null;
  }
}

/**
 * Writes data to a JSON file.
 * @param {string} filename - The name of the file to write to.
 * @param {object} data - The data to write to the file.
 */
function writeJSONFile(filename, data) {
  try {
    const jsonData = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filename, jsonData);
  } catch (error) {
    console.error(`Error writing ${filename}: ${error.message}`);
  }
}

/**
 * Fetches Dapp IDs from a Google Sheet and updates reserved Dapp names.
 * @async
 * @function fetchDappIDsFromGoogleSheet
 * @returns 
 */
const fetchDappIDsFromGoogleSheet = async () => {
    console.log(process.env.GOOGLE_CLIENT_EMAIL)
  const jwtClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    google_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const spreadsheetId = process.env.RETOOL_DAPPS_SHEET_ID;
  const range = 'Sheet1!A2:A';

  jwtClient.authorize(async (err) => {
    if (err) {
      console.error('JWT client authorization error:', err);
      return;
    }

    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;
    if (values) {
      const dappIDsFromGoogleSheet = values.map((row) => row[0]);
      updateReservedDappNames(dappIDsFromGoogleSheet);
    }
  });
};

/**
 * Updates the reserved Dapp names with new Dapp IDs.
 * @param {Array<string>} newDappIDs - An array of new Dapp IDs to be added to the reserved Dapp names.
 */
const updateReservedDappNames = (newDappIDs) => {
  const reservedDappNames = readJSONFile('reservedDappNames.json');

  if (reservedDappNames) {
    const reservedDappIDs = reservedDappNames.names;

    const missingDappIDs = newDappIDs.filter(
      (dappID) => !reservedDappIDs.includes(dappID)
    );

    const duplicates = reservedDappIDs.filter((dappID) =>
      newDappIDs.includes(dappID)
    );

    if (duplicates.length > 0) {
      console.log('Duplicate Dapp IDs found:');
      duplicates.forEach((dappID) => {
        console.log(dappID);
      });
    }

    reservedDappNames.names.push(...missingDappIDs);

    reservedDappNames.whitelisted = reservedDappNames.names.length;

    writeJSONFile('reservedDappNames.json', reservedDappNames);

    console.log('Missing Dapp IDs appended to reservedDappNames.json');
  }
};

// Fetch dappIDs from Google Sheet and update reservedDappNames.json
fetchDappIDsFromGoogleSheet();