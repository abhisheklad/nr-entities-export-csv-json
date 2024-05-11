let $http = require('request') 
let _ = require('lodash')
let converter = require('json-2-csv');

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


async function getGraphQLData(NR_USER_KEY, nextCursor, domain) {
    let cursor="cursor:null"
    if (nextCursor!=="") {
        cursor=`cursor: "${nextCursor}"`
    }    
    const graphQLQuery = `
    {
        actor {
          entitySearch(queryBuilder: {domain: ${domain}}) {
            results(${cursor}) {
              entities {
                name
                guid
                entityType
                account {
                  id
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


const fetchAttribute = async (NR_USER_KEY, nextCursor, attributes, domain) => {
    let nerdGraphResult = await getGraphQLData(NR_USER_KEY, nextCursor, domain)
    const results = nerdGraphResult?.data?.actor?.entitySearch?.results?.entities ?? {};
    nextCursor && console.error(`more page... cursor-> ${nextCursor}`);    
    nextCursor = nerdGraphResult?.data?.actor?.entitySearch?.results?.nextCursor || "";
    attributes = [...attributes, ...results]

    if (nextCursor) {
        attributes = fetchAttribute(NR_USER_KEY, nextCursor, attributes)
    }

    return attributes

}

async function getEntitiesData() {
    let attributes = []
    let cursor = ""
    let domain = ""
    const indexOfDomainArg = process.argv.indexOf('-d');
    const domainArgValue = indexOfDomainArg !== -1 ? process.argv[indexOfDomainArg + 1] : 'na';
    if (domainArgValue != undefined){
        switch (domainArgValue.toUpperCase()) {
            case 'NA':
                domain = console.log(`Please provide Domain value`);
                return;
            case 'APM':
                domain = 'APM';
                break;
            case 'INFRASTRUCTURE':
                domain = 'INFRA';
                break;
            case 'BROWSER':
                domain = 'BROWSER';
                break;
            case 'MOBILE':
                domain = 'MOBILE';
                break;
            case 'SYNTHETICS':
                domain = 'SYNTH';
                break;            
            default:
                console.log(`Please provide domain -d argument and its value`);
                return;
        }
    }else{
        return console.log("Please provide correct Domain -d value")
    }
    
    // console.log(domain);
    let fetchResult = await fetchAttribute(NR_USER_KEY, cursor, attributes, domain)

    // Check for the presence of the -t argument and its value
    const indexOfTypeArg = process.argv.indexOf('-t');
    const typeArgValue = indexOfTypeArg !== -1 ? process.argv[indexOfTypeArg + 1] : 'csv';

    if (typeArgValue === 'json') {
      console.log(JSON.stringify(fetchResult, null, 2));
    } else {
      console.log(converter.json2csv(fetchResult,{expandNestedObjects: true,expandArrayObjects:true,unwindArrays: true}));
    }
}

getEntitiesData()
