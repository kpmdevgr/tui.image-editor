/**
 * @author NHN Ent. FE Development Team <dl_javascript@nhn.com>
 * @fileoverview Apply a filter into an image
 */
import snippet from 'tui-code-snippet';
import commandFactory from '../factory/command';
import consts from '../consts';

const {componentNames, rejectMessages, commandNames} = consts;
const {FILTER} = componentNames;

/**
 * Make undoData
 * @param {string} type - Filter type 
 * @param {Object} prevfilterOption - prev Filter options
 * @param {Object} options - Filter options
 * @param {object} cacheUndoData - cached undo data
 *   @param {object} cacheUndoData.options - filter option
 * @returns {object} - undo data
 */
function makeUndoData(type, prevfilterOption, options, cacheUndoData) {
    const undoData = {};

    if (type === 'mask') {
        undoData.object = options.mask;
    }

    if (!cacheUndoData) {
        undoData.options = prevfilterOption;
    } else {
        undoData.options = cacheUndoData.options;
    }

    return undoData;
}

/**
 * Make mask option
 * @param {Graphics} graphics - Graphics instance
 * @param {number} maskObjId - masking image object id
 * @returns {object} - mask option
 */
function makeMaskOption(graphics, maskObjId) {
    const maskObj = graphics.getObject(maskObjId);

    if (!(maskObj && maskObj.isType('image'))) {
        return Promise.reject(rejectMessages.invalidParameters);
    }

    return {
        mask: maskObj
    };
}

const command = {
    name: commandNames.APPLY_FILTER,

    /**
     * Apply a filter into an image
     * @param {Graphics} graphics - Graphics instance
     * @param {string} type - Filter type
     * @param {Object} options - Filter options
     *  @param {number} options.maskObjId - masking image object id
     * @param {boolean} isSilent - is silent execution or not
     * @returns {Promise}
     */
    execute(graphics, type, options, isSilent) {
        const filterComp = graphics.getComponent(FILTER);

        if (type === 'mask') {
            snippet.extend(options, makeMaskOption(graphics, options.maskObjId));
            graphics.remove(options.mask);
        }
        if (!this.isRedo) {
            const prevfilterOption = filterComp.getOptions(type);
            const undoData = makeUndoData(type, prevfilterOption, options, this.cacheUndoDataForSilent, isSilent);

            if (!isSilent) {
                snippet.extend(this.undoData, undoData);
                this.cacheUndoDataForSilent = null;
            } else if (!this.cacheUndoDataForSilent) {
                this.cacheUndoDataForSilent = undoData;
            }
        }

        return filterComp.add(type, options);
    },
    /**
     * @param {Graphics} graphics - Graphics instance
     * @param {string} type - Filter type
     * @returns {Promise}
     */
    undo(graphics, type) {
        const filterComp = graphics.getComponent(FILTER);

        if (type === 'mask') {
            const mask = this.undoData.object;
            graphics.add(mask);
            graphics.setActiveObject(mask);

            return filterComp.remove(type);
        }

        // options changed case
        if (this.undoData.options) {
            return filterComp.add(type, this.undoData.options);
        }

        // filter added case
        return filterComp.remove(type);
    }
};

commandFactory.register(command);

module.exports = command;
