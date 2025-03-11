import { breakPath } from "/src/shared/models/helpers.mjs";
const template = await fetch('/src/shared/components/select/selectDropdown.html').then(resp => resp.text());

class SelectDropdown extends HTMLElement {
    constructor(){
        super();
        this._options = [];
        this._selected = null;
    }
    connectedCallback(){
        this.attachShadow({mode: 'open'});
        window.addEventListener('mousedown', (evt) => {
            if(evt.target !== this){
                this.MenuList?.classList.remove('shown');
            }
          });
        this.render();
    }

    render(){
        this.shadowRoot.innerHTML = template;
        const container = this.shadowRoot.querySelector('.select-dropdown-container');
        const selectorContainer = container.querySelector('.selector-container');
        const input = container.querySelector('input');
        if(this._selected){
            input.placeholder = this._selected.label;
        }
        input.addEventListener('input', ({target:{value}}) => {
            this.renderMenuList(value);
        });
        
        selectorContainer.addEventListener('click', ({target}) => {
            if(target === input){
                this.MenuList.classList.add('shown');
            } else {
                this.MenuList.classList.toggle('shown');
            }
        });
        
        new ResizeObserver(([{contentRect}]) => {
            this.MenuList.style.width = contentRect.width+'px';
        }).observe(selectorContainer);

        this.renderMenuList();
    }

    setOptions(options){
        this._options = options;
        this._selected = options[0] ?? null;
        this.render();
    }

    renderMenuList(filterText = ''){
        const input = this.shadowRoot.querySelector('.select-dropdown-container input');
        const filter = filterText.toLowerCase();
        this.MenuList.innerHTML = this._options.filter(({label}) => label.toLowerCase().includes(filter)).map(({value, label}) => `<div option-value="${value}" class="option">${breakPath(label)}</div>`).join('');
        this.MenuList.querySelectorAll('.option').forEach(o => o.addEventListener('click',() => {
            const value = o.getAttribute('option-value');
            const option = this._options.find(opt => opt.value == value);
            if(option){
                this._selected = option;
                const event = new CustomEvent('change', {detail: this._selected});
                input.title = input.placeholder = this._selected.label;
                input.value = '';
                this.renderMenuList();
                this.dispatchEvent(event);
            }
            this.MenuList.classList.remove('shown');
        }));
    }

    get MenuList(){
        return this.shadowRoot.querySelector('.select-dropdown-container .menu-container');
    }
}

customElements.define('select-dropdown', SelectDropdown);