import snippet from 'tui-code-snippet';
import {toInteger, clamp} from '../../util';

/**
 * Range control class
 * @class
 * @ignore
 */
class Range {
    constructor(rangeElements, options = {}) {
        this._value = options.value || 0;

        this.rangeElement = rangeElements.slider;
        this.rangeInputElement = rangeElements.input;

        this._drawRangeElement();

        this.rangeWidth = toInteger(window.getComputedStyle(this.rangeElement, null).width) - 12;
        this._min = options.min || 0;
        this._max = options.max || 100;
        this._useDecimal = options.useDecimal;
        this._absMax = (this._min * -1) + this._max;
        this.realTimeEvent = options.realTimeEvent || false;

        this.eventHandler = {
            changeValue: this._changeSlide.bind(this),
            stopChangingValue: this._stopChangingSlide.bind(this),
            changeInput: this._changeValueWithInput.bind(this, false),
            changeInputFinally: this._changeValueWithInput.bind(this, true),
            changeInputWithArrow: this._changeValueWithInputKeyEvent.bind(this)
        };

        this._addClickEvent();
        this._addDragEvent();
        this._addInputEvent();
        this.value = options.value;
        this.trigger('change');
    }

    /**
     * Set range max value and re position cursor
     * @param {number} maxValue - max value
     */
    set max(maxValue) {
        this._max = maxValue;
        this._absMax = (this._min * -1) + this._max;
        this.value = this._value;
    }

    get max() {
        return this._max;
    }

    /**
     * Get range value
     * @returns {Number} range value
     */
    get value() {
        return this._value;
    }

    /**
     * Set range value
     * @param {Number} value range value
     * @param {Boolean} fire whether fire custom event or not
     */
    set value(value) {
        value = this._useDecimal ? value : toInteger(value);

        const absValue = value - this._min;
        let leftPosition = (absValue * this.rangeWidth) / this._absMax;

        if (this.rangeWidth < leftPosition) {
            leftPosition = this.rangeWidth;
        }

        this.pointer.style.left = `${leftPosition}px`;
        this.subbar.style.right = `${this.rangeWidth - leftPosition}px`;

        this._value = value;
        if (this.rangeInputElement) {
            this.rangeInputElement.value = value;
        }
    }

    /**
     * event tirigger
     * @param {string} type - type
     */
    trigger(type) {
        this.fire(type, this._value);
    }

    /**
     * Make range element
     * @private
     */
    _drawRangeElement() {
        this.rangeElement.classList.add('tui-image-editor-range');

        this.bar = document.createElement('div');
        this.bar.className = 'tui-image-editor-virtual-range-bar';

        this.subbar = document.createElement('div');
        this.subbar.className = 'tui-image-editor-virtual-range-subbar';

        this.pointer = document.createElement('div');
        this.pointer.className = 'tui-image-editor-virtual-range-pointer';

        this.bar.appendChild(this.subbar);
        this.bar.appendChild(this.pointer);
        this.rangeElement.appendChild(this.bar);
    }

    _addInputEvent() {
        if (this.rangeInputElement) {
            this.rangeInputElement.addEventListener('keydown', this.eventHandler.changeInputWithArrow);
            this.rangeInputElement.addEventListener('keyup', this.eventHandler.changeInput);
            this.rangeInputElement.addEventListener('blur', this.eventHandler.changeInputFinally);
        }
    }

    _changeValueWithInputKeyEvent(ev) {
        if ([38, 40].indexOf(ev.keyCode) < 0) {
            return;
        }

        let value = Number(ev.target.value);

        if (ev.keyCode === 38) {
            value += 1;
        } else if (ev.keyCode === 40) {
            value -= 1;
        }

        value = clamp(value, this._min, this.max);

        this.value = value;
        this.fire('change', value, false);
    }

    _changeValueWithInput(isLast, ev) {
        if ([38, 40].indexOf(ev.keyCode) >= 0) {
            return;
        }

        const stringValue = this._filterForInputText(ev.target.value);
        const waitForChange = !stringValue || isNaN(stringValue);
        ev.target.value = stringValue;

        if (!waitForChange) {
            let value = this._useDecimal ? Number(stringValue) : toInteger(stringValue);
            value = clamp(value, this._min, this.max);

            this.value = value;
            this.fire('change', value, isLast);
        }
    }

    /**
     * Add Range click event
     * @private
     */
    _addClickEvent() {
        this.rangeElement.addEventListener('click', event => {
            event.stopPropagation();
            if (event.target.className !== 'tui-image-editor-range') {
                return;
            }
            const touchPx = event.offsetX;
            const ratio = touchPx / this.rangeWidth;
            const value = (this._absMax * ratio) + this._min;
            this.pointer.style.left = `${ratio * this.rangeWidth}px`;
            this.subbar.style.right = `${(1 - ratio) * this.rangeWidth}px`;
            this.value = value;

            this.fire('change', value, true);
        });
    }

    /**
     * Add Range drag event
     * @private
     */
    _addDragEvent() {
        this.pointer.addEventListener('mousedown', event => {
            this.firstPosition = event.screenX;
            this.firstLeft = toInteger(this.pointer.style.left) || 0;

            document.addEventListener('mousemove', this.eventHandler.changeValue);
            document.addEventListener('mouseup', this.eventHandler.stopChangingValue);
        });
    }

    /**
     * change angle event
     * @param {object} event - change event
     * @private
     */
    _changeSlide(event) {
        const changePosition = event.screenX;
        const diffPosition = changePosition - this.firstPosition;
        let touchPx = this.firstLeft + diffPosition;
        touchPx = touchPx > this.rangeWidth ? this.rangeWidth : touchPx;
        touchPx = touchPx < 0 ? 0 : touchPx;

        this.pointer.style.left = `${touchPx}px`;
        this.subbar.style.right = `${this.rangeWidth - touchPx}px`;

        const ratio = touchPx / this.rangeWidth;
        const resultValue = (this._absMax * ratio) + this._min;
        const value = this._useDecimal ? resultValue : toInteger(resultValue);
        const changedValue = this.value !== value;

        if (changedValue) {
            this.value = value;
            if (this.realTimeEvent) {
                this.fire('change', this._value, false);
            }
        }
    }

    /**
     * stop change angle event
     * @private
     */
    _stopChangingSlide() {
        this.fire('change', this._value, true);

        document.removeEventListener('mousemove', this.eventHandler.changeValue);
        document.removeEventListener('mouseup', this.eventHandler.stopChangingValue);
    }

    /**
     * Unnecessary string filtering.
     * @param {string} inputValue - origin string of input
     * @returns {string} filtered string
     * @private
     */
    _filterForInputText(inputValue) {
        return inputValue.replace(/(-?)([0-9]*)[^0-9]*([0-9]*)/g, '$1$2$3');
    }
}

snippet.CustomEvents.mixin(Range);
export default Range;
