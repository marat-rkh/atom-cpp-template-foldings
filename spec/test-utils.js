'use babel';

import fs from 'fs';
import path from 'path';

export default {
    readTestDataAsString(relativePath) {
        const testFilePath = path.join(__dirname, 'test-data', relativePath);
        return fs.readFileSync(testFilePath, 'utf-8');
    }
};
