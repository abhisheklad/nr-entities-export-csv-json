let $http = require('request') 
let _ = require('lodash')
let converter = require('json-2-csv');
const fs = require('fs');

const NR_USER_KEY = process.env.NR_USER_KEY;
const CONCURRENT_REQUEST=25;

if (!NR_USER_KEY) {
  console.error('Error: NR_USER_KEY not found in environment variables.');
  process.exit(1); // Exit with an error code
}

// Define the regex pattern to extract from the script, 
const REGEXPATTERN = /\$secure\.(\w+)/gi; //find $secure credentials
// const REGEXPATTERN = /require\((.*)\)/gi; // other examples, find require modules

const NEWRELIC_DC = 'US' // datacenter for account - US or EU
const GRAPHQL_ENDPOINT =
    NEWRELIC_DC === 'EU' ? 'api.eu.newrelic.com' : 'api.newrelic.com'
const DEFAULT_TIMEOUT = 10000 // You can specify a timeout for each task

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

async function getAPMGuidsData(NR_USER_KEY, nextCursor) {
    let cursor="cursor:null"
    if (nextCursor!=="") {
        cursor=`cursor: "${nextCursor}"`
    }    
    // console.log("query cursor",cursor)  
    const graphQLQuery = `
    {
        actor {
          entitySearch(queryBuilder: {domain: APM}) {
            results(${cursor}) {
              entities {
                guid
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

const fetchAPMGuids = async (NR_USER_KEY, nextCursor, attributes) => {
    let nerdGraphResult = await getAPMGuidsData(NR_USER_KEY, nextCursor)
    const results = ((((((nerdGraphResult || {}).data || {}).actor || {}).entitySearch || {}).results ||{}).entities ||{})
    nextCursor && console.error(`more page... cursor-> ${nextCursor}`);    
    nextCursor = ((((((nerdGraphResult || {}).data || {}).actor || {}).entitySearch || {}).results ||{})).nextCursor||""
    attributes = [...attributes, ...results]
    if (nextCursor) {
        attributes = fetchAPMGuids(NR_USER_KEY, nextCursor, attributes)
    }

    return attributes

}

const fetchRelated = async (NR_USER_KEY, nextCursor, attributes, guid) => {
    let nerdGraphResult = await getRelatedData(NR_USER_KEY, nextCursor, attributes, guid)
    const results = (((((((nerdGraphResult || {}).data || {}).actor || {}).entity || {}).relatedEntities || {}).results ||{}))
    nextCursor && console.error(`more page... cursor-> ${nextCursor}`);    
    nextCursor = (((((((nerdGraphResult || {}).data || {}).actor || {}).entity || {}).relatedEntities || {}).results ||{})).nextCursor||""
    attributes = [...attributes, ...results]
    if (nextCursor) {
        attributes = fetchRelated(NR_USER_KEY, nextCursor, attributes, guid)
    }
      if (attributes.length != 0) {
        return attributes
    }
}

async function getRelatedData(NR_USER_KEY, nextCursor, attributes, guid) {
    let cursor="cursor:null"
    if (nextCursor!=="") {
        cursor=`cursor: "${nextCursor}"`
    }    
    // console.log("query cursor",cursor)  
    const graphQLQuery = `
    {
        actor {
          entity(guid: "${guid}") {
            relatedEntities(
              filter: {entityDomainTypes: {include: {domain: "EXTERNAL", type: "SERVICE"}}}
            ) {
              results {
                target {
                  entity {
                    name
                    guid
                  }
                }
                source {
                  entity {
                    name
                    guid
                    account {
                      id
                      name
                    }
                  }
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

async function getAPMGuids() {
    let attributes = []
    let cursor = ""
    let fetchResult = await fetchAPMGuids(NR_USER_KEY, cursor, attributes)
    return fetchResult
}

async function getRelated(fetchResult) {
    let attributes = []
    let cursor = ""
    const processChunk = async (chunk) => {
        const promises = chunk.map(async (item) => {
            try {
                const scriptResult = await fetchRelated(NR_USER_KEY, cursor, attributes, item.guid);
                delete item.guid;
                item.related = scriptResult;
            } catch (error) {
                // Handle errors from getScript()
                console.error('Error:', error);
            }
        });

        // Use Promise.all to wait for all promises in the chunk to resolve
        await Promise.all(promises);
    };

    // Split the array into chunks of 10 promises
    const chunkSize = CONCURRENT_REQUEST;
    for (let i = 0; i < fetchResult.length; i += chunkSize) {
        const chunk = fetchResult.slice(i, i + chunkSize);
        console.error("Total entities :", fetchResult.length,"-> processing:", "Total entities:",fetchResult.length,"chunksize:",chunkSize, "current chunk:",i )
        await processChunk(chunk);
    }
      fetchResult = fetchResult.filter(obj => obj.related !== undefined);
      return [...fetchResult];
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

async function getRelatedEntitiesData() {
      const allAPMGuids = await getAPMGuids();
      const fetchResult = await getRelated(allAPMGuids);


      // Check for the presence of the -t argument and its value
      const indexOfTypeArg = process.argv.indexOf('-t');
      const typeArgValue = indexOfTypeArg !== -1 ? process.argv[indexOfTypeArg + 1] : 'csv';

      if (typeArgValue === 'json') {
        redirectConsoleLogToFile('exportRelatedEntities.json');
        console.log(JSON.stringify(fetchResult, null, 2));    
      } else {
        redirectConsoleLogToFile('exportRelatedEntities.csv');
        console.log(converter.json2csv(fetchResult,{expandNestedObjects: true,expandArrayObjects:true,unwindArrays: true}));
      } 
}

getRelatedEntitiesData();