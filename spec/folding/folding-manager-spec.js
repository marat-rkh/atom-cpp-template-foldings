'use babel';

import { FoldingsManager, FoldingStatus } from '../../lib/folding/foldings-manager.js';
import { FoldingEvent } from '../../lib/folding/folding';
import TestUtils from '../test-utils.js';
import { Range } from 'atom';

describe('FoldingManager', () => {
    const testRange1 = new Range([2, 0], [9, 1]);
    const testPreview1 = { text: 'template<A, B, int N, template<_> TT, C = One, _ = double>' };
    const testRange2 = new Range([14, 4], [14, 21]);
    const testPreview2 = { text: 'template<Z>' };

    it('should create foldings', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);
            expect(f1.status).toBe(FoldingStatus.OK);
            expect(f1.foldingInfo).toEqual({ lastEvent: FoldingEvent.CREATED, highlighted: false });
            expect(f2.status).toBe(FoldingStatus.OK);
            expect(f2.foldingInfo).toEqual({ lastEvent: FoldingEvent.CREATED, highlighted: false });
            expect(editor.getOverlayDecorations().length).toBe(2);
        });
    });

    it('should move foldings', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);

            editor.setCursorBufferPosition([1, 0]);
            editor.insertNewlineBelow();
            expectAtBufferRow(editor, f1, 3, FoldingEvent.MOVED);
            expectAtBufferRow(editor, f2, 15, FoldingEvent.MOVED);
            for(let i = 0; i < 50; ++i) {
                editor.insertNewlineBelow();
            }
            expectAtBufferRow(editor, f1, 53, FoldingEvent.MOVED);
            expectAtBufferRow(editor, f2, 65, FoldingEvent.MOVED);
            editor.setCursorBufferPosition([64, 0]);
            editor.insertNewlineBelow();
            expectAtBufferRow(editor, f1, 53, FoldingEvent.MOVED);
            expectAtBufferRow(editor, f2, 66, FoldingEvent.MOVED);
        });
    });

    it('should hide and show foldings', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);

            editor.setCursorBufferPosition([10, 0]);
            editor.foldCurrentRow();
            expectAtBufferRow(editor, f1, 2, FoldingEvent.CREATED);
            expect(f2.foldingInfo.lastEvent).toBe(FoldingEvent.BECAME_HIDDEN);
            expect(editor.getOverlayDecorations().length).toBe(1);
            editor.unfoldCurrentRow();
            expectAtBufferRow(editor, f1, 2, FoldingEvent.CREATED);
            expectAtBufferRow(editor, f2, 14, FoldingEvent.BECAME_VISIBLE);
        });
    });

    it('should destroy foldings on text changes inside them', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);

            editor.setTextInBufferRange([[2, 1], [2, 1]], 'inserted text\none more line');
            expect(f1.foldingInfo.lastEvent).toBe(FoldingEvent.DESTROYED);
            expect(editor.getOverlayDecorations().length).toBe(1);
            expectAtBufferRow(editor, f2, 15, FoldingEvent.MOVED);
            editor.setTextInBufferRange([[15, 13], [15, 18]], 'this text replaces the old one');
            expect(f2.foldingInfo.lastEvent).toBe(FoldingEvent.DESTROYED);
            expect(editor.getOverlayDecorations().length).toBe(0);
            for(let r = 0; r <= editor.getLastBufferRow(); ++r) {
                expect(editor.isFoldedAtBufferRow(r)).toBe(false);
            }
        });
    });

    it('should highlight foldings', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);
            expect(f1.foldingInfo.highlighted).toBe(false);
            expect(f2.foldingInfo.highlighted).toBe(false);

            editor.setCursorBufferPosition([2, 1]);
            expect(f1.foldingInfo.highlighted).toBe(true);
            expect(f2.foldingInfo.highlighted).toBe(false);
            editor.setCursorBufferPosition([14, 5]);
            expect(f1.foldingInfo.highlighted).toBe(false);
            expect(f2.foldingInfo.highlighted).toBe(true);
        });
    });

    it('should highlight folding if it is under cursor at creation time', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            editor.setCursorBufferPosition([14, 5]);

            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);
            expect(f1.foldingInfo.highlighted).toBe(false);
            expect(f2.foldingInfo.highlighted).toBe(true);
        });
    });

    it('should throw an exception when editor.softWrap is enabled', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            TestUtils.withConfig({ 'editor.softWrap': true }, () => {
                const manager = new FoldingsManager(editor);
                expect(() => manager.foldWithPreview(testRange1, testPreview1, 1) ).toThrow();
                expect(() => manager.foldWithPreview(testRange2, testPreview2, 1) ).toThrow();
            });
        });
    });

    it('should NOT fold when editor.softWrapAtPreferredLineLength is enabled and line length is too small', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const config = {
                'editor.softWrap': true,
                'editor.softWrapAtPreferredLineLength': true,
                'editor.preferredLineLength': 58
            };
            TestUtils.withConfig(config, () => {
                const manager = new FoldingsManager(editor);
                const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
                const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);
                expect(f1.status).toBe(FoldingStatus.WILL_EXCEED_MAX_LINE_LENGTH);
                expect(f2.status).toBe(FoldingStatus.OK);
            });
        });
    });

    it('should fold when editor.softWrapAtPreferredLineLength is NOT enabled and line length is too small', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template.h'), editor => {
            const config = {
                'editor.preferredLineLength': 50
            };
            TestUtils.withConfig(config, () => {
                const manager = new FoldingsManager(editor);
                const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
                const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);
                expect(f1.status).toBe(FoldingStatus.OK);
                expect(f2.status).toBe(FoldingStatus.OK);
            });
        });
    });

    it('should not fold when template text contains tab characters', () => {
        TestUtils.withTextEditor(TestUtils.testDataAbsolutePath('nested_class_template_tabs.h'), editor => {
            const manager = new FoldingsManager(editor);
            const f1 = manager.foldWithPreview(testRange1, testPreview1, 1);
            const f2 = manager.foldWithPreview(testRange2, testPreview2, 2);
            expect(f1.status).toBe(FoldingStatus.TEXT_HAS_TABS);
            expect(f2.status).toBe(FoldingStatus.OK);
        });
    });
});

function expectAtBufferRow(editor, f, row, lastEvent) {
    expect(f.foldingInfo.lastEvent).toBe(lastEvent);
    const ds = editor.getOverlayDecorations();
    expect(ds.some(d => d.getMarker().getBufferRange().start.row == row)).toBe(true);
}
