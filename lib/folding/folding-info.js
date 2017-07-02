'use babel';

export const FoldingEvent = {
    CREATED: 0,
    DESTROYED: 1,
    MOVED: 2,
    BECAME_HIDDEN: 3,
    BECAME_VISIBLE: 4
};

export class FoldingInfo {
    constructor() {
        this.lastEvent = FoldingEvent.CREATED;
        this.highlighted = false;
    }
}
