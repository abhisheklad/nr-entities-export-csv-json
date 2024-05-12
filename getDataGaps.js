let $http = require('request') 
let _ = require('lodash')
let converter = require('json-2-csv');
const fs = require('fs');

const NR_USER_KEY = process.env.NR_USER_KEY;
if (!NR_USER_KEY) {
  console.error('Error: NR_USER_KEY not found in environment variables.');
  process.exit(1); // Exit with an error code
}
const NEWRELIC_DC = 'US' // datacenter for account - US or EU
const GRAPHQL_ENDPOINT =
    NEWRELIC_DC === 'EU' ? 'api.eu.newrelic.com' : 'api.newrelic.com'
const DEFAULT_TIMEOUT = 5000 // You can specify a timeout for each task


const genericServiceCall = function (responseCodes, options, success) {
    !('timeout' in options) && (options.timeout = DEFAULT_TIMEOUT) //add a timeout if not already specified
    let possibleResponseCodes = responseCodes
    if (typeof responseCodes == 'number') {
        //convert to array if not supplied as array
        possibleResponseCodes = [responseCodes]
    }
    return new Promise((resolve, reject) => {
        $http(options, function callback(error, response, body) {
            if (error) {
                console.log('Request error:', error)
                console.log('Response:', response)
                console.log('Body:', body)
                reject(`Connection error on url '${options.url}'`)
            } else {
                if (!possibleResponseCodes.includes(response.statusCode)) {
                    let errmsg = `Expected [${possibleResponseCodes}] response code but got '${response.statusCode}' from url '${options.url}'`
                    reject(errmsg)
                } else {
                    resolve(success(body, response, error))
                }
            }
        })
    })
}


async function getGraphQLData(NR_USER_KEY, nextCursor) {
    let cursor="cursor:null"
    if (nextCursor!=="") {
        cursor=`cursor: "${nextCursor}"`
    }    
    const graphQLQuery = `
    {
        actor {
          dataSourceGaps {
            gaps(${cursor}) {
              results {
                gapType {
                  displayName
                }
                account {
                  id
                  name
                }
                entity {
                  guid
                  name
                }
              }
              nextCursor
            }
          }
        }
      }
    `

    const options = {
        url: `https://${GRAPHQL_ENDPOINT}/graphql`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'API-Key': NR_USER_KEY,
        },
        body: JSON.stringify({ query: graphQLQuery }),
    }

    return genericServiceCall([200], options, (body) => {
        let jsonBody = JSON.parse(body)
        return jsonBody
    })
}


const fetchAttribute = async (NR_USER_KEY, nextCursor, attributes) => {
    let nerdGraphResult = await getGraphQLData(NR_USER_KEY, nextCursor)
    const results = nerdGraphResult?.data?.actor?.dataSourceGaps?.gaps?.results ?? {};
    nextCursor && console.error(`more page... cursor-> ${nextCursor}`);    
    nextCursor = nerdGraphResult?.data?.actor?.dataSourceGaps?.gaps?.nextCursor || "";
    attributes = [...attributes, ...results]

    if (nextCursor) {
        attributes = fetchAttribute(NR_USER_KEY, nextCursor, attributes)
    }

    return attributes

}

// Function to redirect console.log output to a file
function redirectConsoleLogToFile(filename) {
    // Create a writable stream to the log file
    const logStream = fs.createWriteStream(filename, { flags: 'a' });

    // Redirect console.log to the log file
    const originalConsoleLog = console.log;
    console.log = function(message) {
        logStream.write(message + '\n');
        originalConsoleLog.apply(console, arguments); // Output to console
    };
}

async function getEntitiesData() {
    let attributes = []
    let cursor = ""
    
    // console.log(domain);
    let fetchResult = await fetchAttribute(NR_USER_KEY, cursor, attributes)

    // Check for the presence of the -t argument and its value
    const indexOfTypeArg = process.argv.indexOf('-t');
    const typeArgValue = indexOfTypeArg !== -1 ? process.argv[indexOfTypeArg + 1] : 'csv';

    if (typeArgValue === 'json') {
      redirectConsoleLogToFile('exportDataGaps.json');  
      console.log(JSON.stringify(fetchResult, null, 2));
    } else {
      redirectConsoleLogToFile('exportDataGaps.csv');   
      console.log(converter.json2csv(fetchResult,{expandNestedObjects: true,expandArrayObjects:true,unwindArrays: true}));
    }
}

getEntitiesData()
