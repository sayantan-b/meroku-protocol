let dapplist = require("./dapps.json");
const fs = require("fs");
const fileName = "./appNames.json";
let file = require("./appNames.json");

let present = 0;

function checkIfTwice(name, list, selfIndex, parts) {
  for (let i = 0; i < list.length; i++) {
    if (i != selfIndex) {
      for (let j = 0; j < list[i].length; j++) {
        if (name == list[i][j]) {
          // console.log(name, "  ::  ", parts," also this",list[i])
          ++present;
          return true;
        }
      }
    }
  }
  return false;
}

async function main() {
  const dapps = dapplist.dapps;
  // console.log(dapps.length)
  let list = [];
  console.log("dapps length: ", dapps.length);

  let j = 0;

  let one = 0;
  let two = 0;
  let three = 0;
  let four = 0;
  let more = 0;

  let URLs = [];

  //creating a list of domain host and names
  for (let i = 0; i < dapps.length; i++) {
    let appUrl = dapps[i].appUrl;
    let domain = new URL(appUrl);
    let parts = domain.host.split(".");
    list.push(parts);
  }
  //check if any domainname is present more than once
  for (let i = 0; i < dapps.length; i++) {
    let appUrl = dapps[i].appUrl;
    let domain = new URL(appUrl);
    // split domain.host into different words based on .
    let parts = domain.host.split(".");

    if (parts.length == 2) {
      ++two;
      if (checkIfTwice(parts[0], list, i, parts)) {
        URLs[i] = true;
      }
    } else if (parts.length == 3) {
      ++three;
      if (checkIfTwice(parts[1], list, i, parts)) {
        URLs[i] = true;
      }
    } else if (parts.length == 4) {
      ++four;
      if (checkIfTwice(parts[2], list, i, parts)) {
        URLs[i] = true;
      }
    } else {
      ++more;
      if (checkIfTwice(parts[3], list, i, parts)) {
        URLs[i] = true;
      }
    }
  }

  let appNames = []; // will store final app name with .app at the end
  let appSuffix = ".app"; // will add .app at the end of each name for appName

  for (let i = 0; i < dapps.length; i++) {
    let appUrl = dapps[i].appUrl;
    let domain = new URL(appUrl);

    // split domain.host into different words based on .
    let parts = domain.host.split(".");

    if (parts.length == 2) {
      if (parts[0] == "memeameme" || parts[0] == "1inch") {
        let path = domain.pathname.split("/").join("");
        appNames.push(`${parts[0]}-${path}${appSuffix}`);
      } else if (
        parts[0] == "cyberbrokers" ||
        (parts[0] == "polydex" && parts[1] == "fi")
      ) {
        appNames.push(`${parts[0]}-${parts[1]}${appSuffix}`);
      } else {
        appNames.push(`${parts[0]}${appSuffix}`);
      }
    } else if (parts.length == 3) {
      if (parts[0] == "www" || parts[0] == "app") {
        ++one;
        if (URLs[i]) {
          if (parts[1] == "uniswap") {
            appNames.push(`${parts[1]}-${parts[0]}${appSuffix}`);
          } else if (parts[1] == "rarible" || parts[1] == "push") {
            let path = domain.pathname.split("/").join("");
            appNames.push(`${parts[1]}-${path}${appSuffix}`);
          } else if (parts[1] == "bifi" || parts[1] == "team") {
            appNames.push(`${parts[1]}-${parts[2]}${appSuffix}`);
          } else {
            appNames.push(`${parts[1]}${appSuffix}`);
          }
        } else {
          appNames.push(`${parts[1]}${appSuffix}`);
        }
      } else {
        appNames.push(`${parts[1]}-${parts[0]}${appSuffix}`);
      }
    } else if (parts.length == 4) {
      if (parts[2] == "allbridge") {
        appNames.push(`${parts[2]}-${parts[1]}-${parts[0]}${appSuffix}`);
      } else {
        appNames.push(`${parts[2]}${appSuffix}`);
      }
    } else {
      appNames.push(`${parts[3]}${appSuffix}`);
    }
  }
  // console.log(" two: ", two, " three: ", three, " four: ", four, " more: ", more, "www/app:", one, "present: ", present)
  console.log(appNames, appNames.length);

  // code to check if array has repeating elements
  for (let i = 0; i < appNames.length; i++) {
    for (let j = i + 1; j < appNames.length; j++) {
      if (appNames[i] == appNames[j]) {
        console.log("mil gya: ", appNames[i]);
      }
    }
  }

  file.key = appNames;
  fs.writeFileSync(
    fileName,
    JSON.stringify(file, null, 2),
    function writeJSON(err) {
      if (err) return console.log(err);
      console.log(JSON.stringify(file));
      console.log("writing to " + fileName);
    }
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
