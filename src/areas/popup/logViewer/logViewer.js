import { LogDao } from "/src/shared/models/database.mjs";
const template = await fetch('./logViewer/logViewer.html').then(resp => resp.text());

class LogViewer extends HTMLElement {
    constructor(){
        super();
        this._logDao = new LogDao();
        this._selectedLog = NaN;
        this._logs = [];
    }
    connectedCallback() {
        this.attachShadow({mode: 'open'});
        this.refreshLogs();
    }

    async refreshLogs(){
        this._logs = await this._logDao.getRemovedUrlsLog();
        this.render();
    }

    render(){
        this.shadowRoot.innerHTML = template;
        const container = this.shadowRoot.querySelector('.log-viewer-container');
        const logTable = container.querySelector('tbody');
        
        logTable.innerHTML = this._logs.map(l => this.renderEntryRow(l)).join('');
        logTable.querySelectorAll('.log-head').forEach(e => e.addEventListener('click', () => {
            const logId = parseInt(e.getAttribute('log-id'));
            this._selectedLog = this._selectedLog === logId ? NaN : logId;
            this.render();
        }));

        container.querySelector('.delete').addEventListener('click', async () => {
            if(!this._logs.length) return;
            await this._logDao.clearRemovedUrlsLog();
            this.refreshLogs();
        });
    }

    renderEntryRow({createdOn, logEntry}){
        const selected = this._selectedLog === createdOn;
        const headRow = `<tr log-id="${createdOn}" class="log-head"><td>${selected ? '-' : '+'}</td><td>${new Date(createdOn).toISOString()}</td></tr>`;
        const entryRow = selected ? `<tr log-id="${createdOn}" class="log-row"><td colSpan="2">${logEntry}</td></tr>` : '';
        return headRow + entryRow;
    }
}

customElements.define('log-viewer', LogViewer);