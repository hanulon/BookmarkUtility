const template = await fetch('./notification/notification.html').then(resp => resp.text());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Notification extends HTMLElement {
    constructor(){
        super();
    }
    connectedCallback(){
        this.attachShadow({mode: 'open'});
        this.render();
    }

    async show(message){
        const notification = this.shadowRoot.querySelector('.notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        await wait(1);
        notification.classList.remove('shown');
        notification.classList.add('shown');
        await wait(3000);
        notification.classList.remove('shown');
        await wait(100);
        notification.classList.add('hidden');
    }

    render(){
        this.shadowRoot.innerHTML = template;
    }
}

customElements.define('notification-div', Notification);