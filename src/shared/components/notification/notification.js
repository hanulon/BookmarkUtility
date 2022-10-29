const template = await fetch('/src/shared/components/notification/notification.html').then(resp => resp.text());
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Notification extends HTMLElement {
    constructor(){
        super();
    }
    connectedCallback(){
        this.attachShadow({mode: 'open'});
        this.render();
    }

    showError(message){
        this.show(message, 'error');
    }
    showSuccess(message){
        this.show(message, 'success');
    }
    async show(message, type){
        const notification = this.shadowRoot.querySelector('.notification');
        notification.classList.remove('error');
        notification.classList.remove('success');
        notification.classList.add(type);
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