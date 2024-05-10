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
`);
}
printHelp();
