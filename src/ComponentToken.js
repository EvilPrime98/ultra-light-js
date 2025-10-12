export class ComponentToken {
    
    constructor(selector) {
        this.element = document.querySelector(selector);
    }

    render(...nodes) {
        nodes.forEach(node => {
            this.element.append(node);
        });
    }

}