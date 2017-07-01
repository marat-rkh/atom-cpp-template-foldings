'use babel';

import fs from 'fs';
import path from 'path';

export default {
    readTestDataAsString(relativePath) {
        return fs.readFileSync(this.testDataAbsolutePath(relativePath), 'utf-8');
    },

    testDataAbsolutePath(relativePath) {
        return path.join(__dirname, 'test-data', relativePath);
    },

    printScreenContent(textEditor) {
        const rowsNum = textEditor.getScreenLineCount();
        const maxLen = this._getNumberLength(rowsNum);
        for(let i = 0; i < textEditor.getScreenLineCount(); ++i) {
            const spacesNum = maxLen - this._getNumberLength(i);
            const spaces = ' '.repeat(spacesNum);
            const line = textEditor.lineTextForScreenRow(i);
            console.log(`${i}${spaces}|${line}`);
        }
    },

    getVisibleCharsNumberAtScreenRow(textEditor, screenRow) {
        return textEditor.clipScreenPosition([screenRow, Infinity]).column;
    },

    withTextEditor(filePath, callback) {
        waitsForPromise(() => {
            return atom.workspace.open(filePath).then(editor => {
                callback(editor);
            });
        });
    },

    _getNumberLength(numBase10) {
        let len = 1;
        while(numBase10 > 9) {
            numBase10 = Math.floor(numBase10 / 10);
            ++len;
        }
        return len;
    }
};
