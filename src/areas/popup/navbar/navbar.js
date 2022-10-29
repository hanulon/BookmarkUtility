const template = await fetch('./navbar/navbar.html').then(resp => resp.text());

class Navbar extends HTMLElement {
    constructor(){
        super();
        this._activeTabId = null;
    }
    connectedCallback() {
        this.attachShadow({mode: 'open'});
        this.render();
    }

    setDefault(){
        this.shadowRoot.querySelector('.navbar-container>div').click();
    }

    handleChange(clickedTab){
        const event = new CustomEvent('change', {detail: {prevTabId: this._activeTabId, tabId: clickedTab.id}});
        
        this.shadowRoot.querySelector('.selected')?.classList.remove('selected');
        clickedTab.classList.add('selected');
        
        this._activeTabId = clickedTab.id;
        this.dispatchEvent(event);
    }
    render(){
        this.shadowRoot.innerHTML = template;
        this.shadowRoot.querySelectorAll('.navbar-container>div').forEach(el => {
            el.addEventListener('click', (evt) => this.handleChange(evt.target));
        });
    }
}

customElements.define('nav-bar', Navbar);