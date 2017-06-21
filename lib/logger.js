'use babel';

import fs from 'fs';

export default {
    enabled: true,
    debugLevel: true,
    logFile: null,

    initLogFile(logFile) {
        if(this.enabled) {
            if(!fs.existsSync(logFile)) {
                fs.writeFileSync(logFile, '=== LOG ===\n');
            }
            this.logFile = logFile;
        }
    },

    debug(msg) {
        if(this.enabled && this.debugLevel) {
            console.log(msg);
            if(this.logFile) {
                const timestamp = (new Date()).toString();
                const prefix = `\n[${timestamp}] `;
                fs.appendFile(this.logFile, prefix + msg, (err) => {
                    if (err) {
                        console.log('failed to write debug msg to file');
                    }
                });
            }
        }
    }
};
