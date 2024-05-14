// main.js

function printHelp() {
  console.log(`

==> GET STARTED
    
==> Install dependency packages
        npm install

==> Set env variable NR_USER_KEY 
        export NR_USER_KEY="YOUR NR USER KEY"

==> Export entity info==== 

        Usage: node getEntitie.js [OPTIONS]

        -d <DOMAIN>               New Relic Domain Value: apm, infrastructure, browser, mobile, synthetics
        -t <EXPORTFORMAT>         Choose the format of data export: csv or json
        
        Examples:
                node getEntitie.js -d APM
                node getEntitie.js -d APM -t csv
                node getEntitie.js -d APM -t json

==> Export Data Gaps==== 

        Usage: node getDataGaps.js [OPTIONS]

        -d <DOMAIN>               New Relic Domain Value: apm, infrastructure, browser, mobile, synthetics
        -t <EXPORTFORMAT>         Choose the format of data export: csv or json

        Examples:
                node getDataGaps.js -t csv
                node getDataGaps.js -t json
        
==> Export Related uninstrumented entities==== 

        Usage: node getDataGaps.js [OPTIONS]

        -d <DOMAIN>               New Relic Domain Value: apm, infrastructure, browser, mobile, synthetics
        -t <EXPORTFORMAT>         Choose the format of data export: csv or json

        Examples:
                node getRelatedEntities.js -t csv
                node getRelatedEntities.js -t json                
`);
}
printHelp();
