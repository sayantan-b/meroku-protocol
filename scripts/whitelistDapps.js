const fs = require('fs');

function readJSONFile(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}: ${error.message}`);
    return null;
  }
}

function writeJSONFile(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filename}: ${error.message}`);
  }
}

const reservedDappNames = readJSONFile('reservedDappNames.json');
const inputDappNames = readJSONFile('input.json');

if (reservedDappNames && inputDappNames) {
  const reservedDappIDs = reservedDappNames.names;
  const inputDappIDs = inputDappNames.names;

  const missingDappIDs = inputDappIDs.filter(
    (dappID) => !reservedDappIDs.includes(dappID)
  );

  const duplicates = reservedDappIDs.filter((dappID) =>
    inputDappIDs.includes(dappID)
  );

  if (duplicates.length > 0) {
    console.log('Duplicate Dapp IDs found:');
    duplicates.forEach((dappID) => {
      console.log(dappID);
    });
  }

  reservedDappNames.names.push(...missingDappIDs);

  writeJSONFile('reservedDappNames.json', reservedDappNames);

  console.log('Missing Dapp IDs appended to reservedDappNames.json');
}
