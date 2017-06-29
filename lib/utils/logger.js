'use babel';

import fs from 'fs';
import util from 'util';

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
        debug('?', msg);
    },

    debug(obj, msg) {
        if(this.enabled && this.debugLevel) {
            const callerName = typeof obj === 'object' ? obj.constructor.name : obj;
            const msgConverted = typeof msg === 'object' ? `\n${util.inspect(msg)}` : msg;
            const fullMsg = `${callerName}: ${msgConverted}`;
            console.log(fullMsg);
            if(this.logFile) {
                const timestamp = (new Date()).toString();
                const prefix = `\n[${timestamp}] `;
                fs.appendFile(this.logFile, prefix + fullMsg, (err) => {
                    if (err) {
                        console.log('failed to write debug msg to file');
                    }
                });
            }
        }
    }
};
