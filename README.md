# Get dump of all entities within a New Relic Domain
- Retrieve entity info based on Domains across all accounts a user has access to using New Relic user key


### Installation 
- Node.js is required as prerequisite, the scripts are tested with Node.js v20.12.2
    
      https://github.com/abhisheklad/nr-entities-export-csv-json.git
      cd nr-entities-export-csv-json
      npm install

### Set env variable NR_USER_KEY and export data
    export NR_USER_KEY="YOUR NR USER KEY"
    
###  Export APM entity info
- Export all APM entities using GraphQL with pagination support

- Usage: node getEntities.js [OPTIONS]
  - Examples:
    - node getEntities.js -d apm -t csv   
    - node getEntities.js -d apm -t json   

- GraphQL to retrieve entities info
  - User could add additional attributes to the GraphQL query without issue (always test it to be sure)
  - If you update the GraphQL query, take note that `${cursor}` variable is added to `results(${cursor})`
```
 {
        actor {
          entitySearch(queryBuilder: {domain: ${domain}}) {
            results {
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
```

