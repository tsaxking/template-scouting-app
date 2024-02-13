import { EventEmitter } from '../../shared/event-emitter';

/**
 * Opens a modal with the given id
 * @param {string} modalId
 * @returns
 */
export const openModal = (modalId: string) => $(`#${modalId}`).modal('show');
/**
 * Closes a modal with the given id
 * @param {string} modalId
 * @returns
 */
export const closeModal = (modalId: string) => $(`#${modalId}`).modal('hide');
/**
 * Closes all modals accessible by the user
 * @date 10/12/2023 - 1:11:44 PM
 */
export const closeAllModals = () => $('.modal').modal('hide');

type EventTypes = {
    show: void;
    hide: void;
    destroy: void;
};

export class Modal {
    private readonly $emitter = new EventEmitter<keyof EventTypes>();

    public on<K extends keyof EventTypes>(
        event: K,
        listener: (args: EventTypes[K]) => void,
    ) {
        this.$emitter.on(event, listener);
    }

    public off<K extends keyof EventTypes>(
        event: K,
        listener: (args: EventTypes[K]) => void,
    ) {
        this.$emitter.off(event, listener);
    }

    public emit<K extends keyof EventTypes>(event: K, args?: EventTypes[K]) {
        this.$emitter.emit(event, args);
    }

    readonly el = document.createElement('div');
    readonly id: string;

    constructor(id?: string) {
        this.id = id || `modal-${Math.random().toString(36).substr(2, 9)}`;
        this.render();

        this.on('show', () => {
            $(this.el).modal('show');
        });

        this.on('hide', () => {
            $(this.el).modal('hide');
        });
    }

    private render() {
        const modal = this.el;
        modal.id = this.id;
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.add('modal', 'fade');

        const dialog = document.createElement('div');
        dialog.classList.add('modal-dialog');

        const content = document.createElement('div');
        content.classList.add('modal-content');

        const header = document.createElement('div');
        header.classList.add('modal-header');
        const title = document.createElement('h5');
        title.classList.add('modal-title');

        const close = document.createElement('button');
        close.type = 'button';
        close.classList.add('close');
        close.setAttribute('data-dismiss', 'modal');
        close.setAttribute('aria-label', 'Close');
        $(close).on('click', () => this.hide());

        const body = document.createElement('div');
        body.classList.add('modal-body');

        const footer = document.createElement('div');
        footer.classList.add('modal-footer');

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.classList.add('btn', 'btn-secondary');
        closeButton.textContent = 'Close';
        $(closeButton).on('click', () => this.hide());

        footer.appendChild(closeButton);
        header.appendChild(title);
        header.appendChild(close);
        content.appendChild(header);
        content.appendChild(body);
        content.appendChild(footer);
        dialog.appendChild(content);
        modal.appendChild(dialog);
    }

    setTitle(title: string | HTMLElement) {
        const header = this.el.querySelector('.modal-header');
        if (!header) return;
        const titleEl = header.querySelector('.modal-title');
        if (!titleEl) return;
        titleEl.innerHTML = '';
        if (typeof title === 'string') {
            titleEl.textContent = title;
        } else {
            titleEl.appendChild(title);
        }
    }

    setBody(body: string | HTMLElement) {
        const content = this.el.querySelector('.modal-content');
        if (!content) return;
        const bodyEl = content.querySelector('.modal-body');
        if (!bodyEl) return;
        bodyEl.innerHTML = '';
        if (typeof body === 'string') {
            bodyEl.textContent = body;
        } else {
            bodyEl.appendChild(body);
        }
    }

    setFooter(footer: string | HTMLElement) {
        const content = this.el.querySelector('.modal-content');
        if (!content) return;
        const footerEl = content.querySelector('.modal-footer');
        if (!footerEl) return;
        footerEl.innerHTML = '';
        if (typeof footer === 'string') {
            footerEl.textContent = footer;
        } else {
            footerEl.appendChild(footer);
        }
    }

    public show() {
        this.emit('show');
    }

    public hide() {
        this.emit('hide');
    }

    public destroy() {
        this.emit('destroy');
        $(`#${this.id}`).remove();
    }
}

/**
 * Mounts the toast container to the DOM (not visible)
 * @date 10/12/2023 - 1:14:12 PM
 *
 * @type {*}
 */
const container = (() => {
    const parent = document.createElement('div');
    parent.setAttribute('aria-live', 'polite');
    parent.setAttribute('aria-atomic', 'true');
    parent.classList.add('bg-dark', 'position-relative', 'bd-example-toasts');

    const child = document.createElement('div');
    child.id = 'toast-container';
    child.classList.add(
        'position-absolute',
        'top-0',
        'end-0',
        'w-100',
        'h-100',
    );
    parent.appendChild(child);

    const mount = () => {
        const main = document.querySelector('main');
        if (!main) return;
        // append to the beginning of the main element
        main.insertBefore(parent, main.firstChild);
        clearInterval(int);
    };

    const int = setInterval(mount, 10);

    return parent;
})();

export type Color =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'light'
    | 'dark';

export class Toast {
    private readonly $el = document.createElement('div');

    private readonly $emitter = new EventEmitter<keyof EventTypes>();

    public on<K extends keyof EventTypes>(
        event: K,
        listener: (args: EventTypes[K]) => void,
    ) {
        this.$emitter.on(event, listener);
    }

    public off<K extends keyof EventTypes>(
        event: K,
        listener: (args: EventTypes[K]) => void,
    ) {
        this.$emitter.off(event, listener);
    }

    public emit<K extends keyof EventTypes>(event: K, args?: EventTypes[K]) {
        this.$emitter.emit(event, args);
    }

    private $title: string;
    private $body: string;
    private $color: Color;

    constructor(title: string, body: string, color: Color = 'success') {
        this.on('show', () => {
            $(this.$el).toast('show');
        });

        this.on('hide', () => {
            $(this.$el).toast('hide');
        });
        container.appendChild(this.$el);
        this.$title = title;
        this.$body = body;
        this.$color = color;
        this.render();
    }

    set title(title: string) {
        this.$title = title;
        this.$el.querySelector('strong')!.textContent = title;
    }

    get title() {
        return this.$title;
    }

    set body(body: string) {
        this.$body = body;
        this.$el.querySelector('toast-body')!.textContent = body;
    }

    get body() {
        return this.$body;
    }

    set color(color: Color) {
        this.$el
            .querySelector('toast-header')
            ?.classList.remove(`text-${this.color}`);
        this.$el.querySelector('toast-header')?.classList.add(`text-${color}`);
        this.$el
            .querySelector('toast-body')
            ?.classList.remove(`bg-${this.color}`);
        this.$el.querySelector('toast-body')?.classList.add(`bg-${color}`);
        this.$el
            .querySelector('toast-body')
            ?.classList.remove(`text-${this.textColor}`);
        this.$color = color;
        this.$el
            .querySelector('toast-body')
            ?.classList.add(`text-${this.textColor}`);
    }

    get color() {
        return this.$color;
    }

    get textColor(): 'light' | 'dark' {
        switch (this.$color) {
            case 'danger':
            case 'primary':
            case 'success':
            case 'info':
            case 'dark':
            case 'secondary':
                return 'light';
            case 'warning':
            case 'light':
                return 'dark';
            default:
                return 'light';
        }
    }

    private render() {
        this.$el.classList.add('toast', 'position-absolute');
        this.$el.setAttribute('role', 'alert');
        this.$el.setAttribute('aria-live', 'assertive');
        this.$el.setAttribute('aria-atomic', 'true');

        const header = document.createElement('div');
        header.classList.add(
            'toast-header',
            'bg-dark',
            'border-0',
            `text-${this.color}`,
        );

        const strong = document.createElement('strong');
        strong.classList.add('me-auto');
        strong.textContent = this.$title;

        const time = document.createElement('small');
        time.textContent = 'Just now';
        const start = Date.now();
        setInterval(() => {
            const now = Date.now();
            const diff = now - start;
            const seconds = Math.floor(diff / 1000);

            if (seconds < 60) {
                time.textContent = `${seconds} seconds ago`;
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                time.textContent = `${minutes} minutes ago`;
            } else if (seconds < 86400) {
                const hours = Math.floor(seconds / 3600);
                time.textContent = `${hours} hours ago`;
            } else {
                const days = Math.floor(seconds / 86400);
                time.textContent = `${days} days ago`;
            }
        }, 1000 * 30);

        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.classList.add('btn-close', 'btn-close-white');
        button.setAttribute('aria-label', 'Close');
        button.dataset.bsDismiss = 'toast';
        $(button).on('click', () => this.hide());

        const body = document.createElement('div');
        body.classList.add(
            'toast-body',
            `bg-${this.$color}`,
            `text-${this.textColor}`,
        );
        body.textContent = this.$body;

        header.appendChild(strong);
        header.appendChild(time);
        header.appendChild(button);
        this.$el.appendChild(header);
        this.$el.appendChild(body);

        container.firstChild?.appendChild(this.$el);

        this.show();
    }

    show() {
        this.emit('show');
    }

    hide() {
        this.emit('hide');
    }

    destroy() {
        this.emit('destroy');
    }
}
