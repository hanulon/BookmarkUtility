const template = await fetch('/src/shared/components/checkbox/checkbox.html').then(resp => resp.text());

class CheckBox extends HTMLElement {
    constructor(){
        super();
    }
    connectedCallback(){
        this.attachShadow({mode: 'open'});
        this.render();
    }
    static get observedAttributes(){
        return ['checked'];
    }
    attributeChangedCallback(name, oldValue, newValue){
        this.handleChecked(newValue);
    }

    handleChecked(value){
        if(!this.shadowRoot) return;
        
        const container = this.shadowRoot.querySelector('.checkbox-container');
        container.classList.remove('checked');
        if(value === "true"){
            container.classList.add('checked');
        }
    }
    render(){
        this.shadowRoot.innerHTML = template;
        this.handleChecked(this.getAttribute('checked'));
    }
}

customElements.define('check-box', CheckBox);