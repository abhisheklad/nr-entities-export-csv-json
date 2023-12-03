// main.js

function printHelp() {
  console.log(`
==> Install dependency packages
    npm install

==> Set env variable NR_USER_KEY 
    export NR_USER_KEY="YOUR NR USER KEY"

==> Export APM agent entity info==== 

    Usage: node getAPMAgentEnvInfo.js [OPTIONS]
        Examples:
        node getAPMAgentEnvInfo.js
        node getAPMAgentEnvInfo.js -t csv
        node getAPMAgentEnvInfo.js -t json

==> Export Infra agent entity info==== 

    Usage: node getInfaAgentEnvInfo.js [OPTIONS]
        Examples:
        node getInfaAgentEnvInfo.js
        node getInfaAgentEnvInfo.js -t csv
        node getInfaAgentEnvInfo.js -t json

==>  Export Synthetics entity info==== 

    Usage: node getSyntheticsInfo.js [OPTIONS]
        Examples:
        node getSyntheticsInfo.js
        node getSyntheticsInfo.js -t csv
        node getSyntheticsInfo.js -t json

`);
}
printHelp();
