'use babel';

import { Range, Point } from 'atom';

export const TextEditorUtils = {
    scanWithSkips(textEditor, regex, range, callback) {
        let continuePoint = null;
        textEditor.scanInBufferRange(regex, range, ctx => {
            ctx.continueFrom = p => {
                continuePoint = p;
            };
            callback(ctx);
            if(continuePoint !== null && continuePoint !== undefined) {
                ctx.stop();
            }
        });
        if(continuePoint !== null && continuePoint !== undefined) {
            const newRange = new Range(continuePoint, range.end);
            this.scanWithSkips(textEditor, regex, newRange, callback);
        }
    },

    getBufferRange(textEditor) {
        const lastRow = textEditor.getLastBufferRow();
        const end = textEditor.clipBufferPosition([lastRow, Infinity]);
        return new Range([0, 0], end);
    },

    nextBufferPosition(textEditor, pos) {
        const nextPos = new Point(pos.row, pos.column + 1);
        const clipped = textEditor.clipBufferPosition(nextPos);
        if(nextPos.isEqual(clipped)) {
            return nextPos;
        } else if(pos.row + 1 <= textEditor.getLastBufferRow()) {
            return new Point(pos.row + 1, 0);
        } else {
            return pos;
        }
    },

    advanceBufferPosition(textEditor, pos, n = 1) {
        while(n > 0) {
            pos = this.nextBufferPosition(textEditor, pos);
            --n;
        }
        return pos;
    },

    unfoldRowsInBufferRange(textEditor, bufferRange) {
        for(let r = bufferRange.start.row; r <= bufferRange.end.row; ++r) {
            textEditor.unfoldBufferRow(r);
        }
    }
};
