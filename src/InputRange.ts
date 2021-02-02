/* Selectors */
const INPUT_CLASS = 'js-irange-input';
const SCALE_CLASS = 'js-irange-scale';
const SCALE_ACTIVE_CLASS = 'js-irange-active';
const HANDLE_CLASS = 'js-irange-handle';

/**
 * @param {HTMLElement} root
 * @param {string} className
 * @returns {HTMLElement[]}
 */
function byClass(root, className) {
    if (root) {
        if (root.nodeType === 11) { // == Node.DOCUMENT_FRAGMENT_NODE
            let result = [];
            for (let df = 0; df < root.childNodes.length; df++) {
                let childNode = root.childNodes[df];
                if (childNode.getElementsByClassName) {
                    result = result.concat([...childNode.getElementsByClassName(className)]);
                }
            }
            return result;
        }
        return [...root.getElementsByClassName(className)];
    }
    return [];
}

/**
 * @param {HTMLElement} root
 * @param {string} className
 * @returns {?HTMLElement}
 */
function firstByClass(root, className) {
    let elements = byClass(root, className);
    return elements.length ? elements[0] : null;
}

interface IStep {
    delta: number;
    max: number;
    steps?: number;
}

export class InputRange {
    el: HTMLElement;
    protected input: HTMLInputElement;
    scale: HTMLElement;
    scaleActive: HTMLElement;
    handle: HTMLElement;
    
    inputMin: number;
    inputMax: number;
    value: number;
    stepPx: number;
    steps: Array<IStep>;
    boundInputChange: EventHandlerNonNull;

    flagDragging = false;

    constructor(element: HTMLElement) {
        this.el = element;
        this.input = firstByClass(element, INPUT_CLASS) as HTMLInputElement;
        this.inputMin = parseInt(this.input.getAttribute('min') || this.input.getAttribute('data-min'), 10);
        this.inputMax = parseInt(this.input.getAttribute('max') || this.input.getAttribute('data-max'), 10);

        let stepAttrInput = this.input.getAttribute('data-steps');
        if (stepAttrInput) {
            this.steps = JSON.parse(this.input.getAttribute('data-steps'));
        } else {
            this.steps = [{delta: 1, max: this.inputMax}];
        }

        this.scale = firstByClass(element, SCALE_CLASS);
        this.scaleActive = firstByClass(element, SCALE_ACTIVE_CLASS);

        this.handle = firstByClass(element, HANDLE_CLASS);

        this.boundInputChange = this.inputChange;

        this.input.addEventListener('keyup', this.boundInputChange);
        this.input.addEventListener('change', this.boundInputChange);
        this.handle.addEventListener('mousedown',this.changeFlagTrue);

        document.addEventListener('mouseup',this.changeFlagFalse);
        document.addEventListener('mousemove', this.dragHandle);

        this.scale.addEventListener('click', this.onClick);

        let numSteps = 0, max = this.inputMin;
        this.steps.forEach(function (step) {
            step.steps = (step.max - max) / step.delta;
            numSteps += step.steps;
            max = step.max;
        });

        this.stepPx = 100 / numSteps; // 100%

        this.inputChange();
    }

    setValue(value: number) {
        this.setInputValue(value);

        if (this.value === value) {
            return;
        }

        let left = 0;
        let valuePx = 0;
        let stepPx = this.stepPx;
        let inputMin = this.inputMin;

        this.steps.forEach(function (step) {
            valuePx += (stepPx * step.steps / (step.max - inputMin)) * (Math.min(value, step.max) - left - inputMin);
            left += step.max;
        });

        if (valuePx < 0) {
            valuePx = 0;
        }

        if (valuePx > 100) {
            valuePx = 100;
        }

        this.applyTransform(valuePx);
    }

    inputChange = () => {
        let value = parseInt(this.input.value, 10);

        if (isNaN(value) || (value < this.inputMin)) {
            this.setValue(this.inputMin);
        } else if (value > this.inputMax) {
            this.setValue(this.inputMax);
        } else {
            this.setValue(value);
        }
    };

    changeFlagTrue = (e: Event) => {
        e.preventDefault();
        this.setDragging(true);
    };

    changeFlagFalse = (e: Event) => {
        e.preventDefault();
        this.setDragging(false);
    };

    setDragging(dragging: boolean) {
        this.flagDragging = dragging;
        this.el.classList.toggle('__dragging', dragging);
    }

    onClick = (e: MouseEvent) => {
        this.recalcHandlePosition(e);
    };

    dragHandle = (e: MouseEvent) => {
        if (this.flagDragging) {
            this.recalcHandlePosition(e);
        }
    };

    recalcHandlePosition(e: MouseEvent) {
        let mouseMove = e.clientX;
        let scalePositionLeft = this.scale.getBoundingClientRect().left;
        let valuePx = ((mouseMove - scalePositionLeft) / this.scale.offsetWidth) * 100;
        let roundedValuePx = valuePx - valuePx % this.stepPx;

        if (roundedValuePx < 0) {
            roundedValuePx = 0;
        }

        if (roundedValuePx > 100) {
            roundedValuePx = 100;
        }

        let value = this.inputMin,
            stepsLeft = Math.round(roundedValuePx / this.stepPx);

        this.steps.forEach(function (step) {
            if (stepsLeft > 0) {
                let stepsMin = Math.min(stepsLeft, step.steps);
                value += stepsMin * step.delta;
                stepsLeft -= stepsMin;
            }
        });

        this.applyTransform(roundedValuePx);

        this.value = value;
        this.setInputValue(Math.floor(value));
    }

    setInputValue(value: number) {
        this.input.value = this.format(value);
    }

    applyTransform(percent) {
        this.handle.style.left = `${percent}%`;
        this.scaleActive.style.width = `${percent}%`;
    }

    format(value: number): string {
        return `${value}`;
    }

    destroy() {
        this.input.removeEventListener('keyup',this.boundInputChange);
        this.input.removeEventListener('change',this.boundInputChange);
        this.handle.removeEventListener('mousedown',this.changeFlagTrue);
        document.removeEventListener('mouseup',this.changeFlagFalse);
        document.removeEventListener('mousemove', this.dragHandle);
        this.scale.removeEventListener('click', this.onClick);
    }
}