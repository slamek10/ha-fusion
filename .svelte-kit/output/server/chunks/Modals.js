import "./index-server.js";
import { I as writable, d as spread_props, i as await_block, o as derived, s as ensure_array_like, u as slot } from "./server.js";
import "./index-server2.js";
import "./events.js";
//#region node_modules/.pnpm/svelte-modals@2.0.1_svelte@5.56.8_@typescript-eslint+types@8.63.0_/node_modules/svelte-modals/dist/stacked-modal.svelte.js
var StackedModal = class StackedModal extends EventTarget {
	static _idCounter = 0;
	_props;
	result = createDeferredPromise();
	id;
	component;
	modals;
	exitBeforeEnter = false;
	constructor(modals, { id, component, props }) {
		super();
		this.id = id || (StackedModal._idCounter++).toString();
		this.component = component;
		this._props = props ?? {};
		this.modals = modals;
	}
	#isOpen = derived(() => {
		if (this.modals.stack.length === 0) return false;
		return this.modals.stack[this.modals.stack.length - 1].id === this.id && !this.modals.transitioning;
	});
	get isOpen() {
		return this.#isOpen();
	}
	set isOpen($$value) {
		return this.#isOpen($$value);
	}
	get index() {
		return this.modals.stack.indexOf(this);
	}
	get props() {
		return {
			...this._props,
			id: this.id,
			index: this.index,
			isOpen: this.isOpen,
			close: this.close
		};
	}
	close = (...args) => {
		if (this.onBeforeClose?.() === false) return false;
		const value = args[0];
		this.dispatchEvent(new CustomEvent("close", { detail: value }));
		this.result.resolve(value);
		return true;
	};
	get promise() {
		return this.result.promise;
	}
	onBeforeClose;
};
function createDeferredPromise() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
//#endregion
//#region node_modules/.pnpm/svelte-modals@2.0.1_svelte@5.56.8_@typescript-eslint+types@8.63.0_/node_modules/svelte-modals/dist/modal-stack.svelte.js
var ModalStack = class {
	/**
	* The current stack of modals
	*/
	stack = [];
	/**
	* The last action that was performed on the modals stack. This
	* can be useful for animations
	*/
	action = null;
	/**
	* Whether we're currently waiting for transitions to finish
	* before opening the next modal
	*/
	transitioning = false;
	/**
	* Opens a new modal
	*/
	open = async (component, props, options) => {
		if (this.transitioning) return;
		if (options?.replace) {
			if (!this.stack[this.stack.length - 1]?.close()) throw new Error("Current modal prevented closing");
		}
		this.action = "push";
		if (this.stack[this.stack.length - 1]?.exitBeforeEnter) this.transitioning = true;
		const modal = new StackedModal(this, {
			id: options?.id,
			component,
			props
		});
		this.stack.push(modal);
		modal.addEventListener("close", () => {
			if (modal.exitBeforeEnter) this.transitioning = true;
			if (this.stack.indexOf(modal) > -1) this.stack.splice(this.stack.indexOf(modal), 1);
			this.action = "pop";
		}, { once: true });
		return modal.promise;
	};
	/**
	* Closes the last `amount` of modals in the stack
	*
	* If closing was prevented by any modal it returns false
	*/
	close = (amount = 1) => {
		if (typeof amount !== "number" || amount < 1) throw new Error(`amount must be a number greater than 0. Received ${amount}`);
		const closedModals = this.stack.slice(this.stack.length - amount).reverse();
		let closedAmount = 0;
		for (const modal of closedModals) {
			if (!modal.close()) break;
			closedAmount++;
		}
		return amount === closedAmount;
	};
	/**
	* Closes a modal by its id. Can be provided with `options.id` in modals.open(Comp, props, options)
	*/
	closeById = (id) => {
		const modal = this.stack.find((modal) => modal.id === id);
		if (!modal) return false;
		return modal.close();
	};
	/**
	* Closes all modals in the stack.
	*
	* If closing was prevented by any modal, it returns false
	*/
	closeAll = () => {
		return this.close(this.stack.length);
	};
};
//#endregion
//#region node_modules/.pnpm/svelte-modals@2.0.1_svelte@5.56.8_@typescript-eslint+types@8.63.0_/node_modules/svelte-modals/dist/Modals.svelte
var modals = new ModalStack();
//#endregion
//#region node_modules/.pnpm/svelte-modals@2.0.1_svelte@5.56.8_@typescript-eslint+types@8.63.0_/node_modules/svelte-modals/dist/LegacyModals.svelte
function LegacyModals($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		function isLazyModal(component) {
			return typeof component.prototype === "undefined";
		}
		async function getComponent(component) {
			return component().then((res) => res.default);
		}
		if (modals.stack.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<!--[-->`);
			slot($$renderer, $$props, "backdrop", {}, null);
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <!--[-->`);
		slot($$renderer, $$props, "default", {}, () => {
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(modals.stack);
			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				let modal = each_array[i];
				if (isLazyModal(modal.component)) {
					$$renderer.push("<!--[0-->");
					await_block($$renderer, getComponent(modal.component), () => {
						$$renderer.push(`<!--[-->`);
						slot($$renderer, $$props, "loading", {}, null);
						$$renderer.push(`<!--]-->`);
					}, (component) => {
						if (component) {
							$$renderer.push("<!--[-->");
							component($$renderer, spread_props([modal.props]));
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					});
					$$renderer.push(`<!--]-->`);
				} else {
					$$renderer.push("<!--[-1-->");
					if (modal.component) {
						$$renderer.push("<!--[-->");
						modal.component($$renderer, spread_props([modal.props]));
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				}
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]-->`);
		});
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/svelte-modals@2.0.1_svelte@5.56.8_@typescript-eslint+types@8.63.0_/node_modules/svelte-modals/dist/legacy.svelte.js
var modalsStore = writable([]);
writable(null);
var openModal$1 = async (...args) => {
	try {
		return await modals.open(...args);
	} catch (e) {
		if (e instanceof Error && e.message === "Current modal prevented closing") console.error(e);
		else throw e;
	}
};
var closeModal = () => modals.close(1);
modals.close.bind(modals);
modals.closeAll.bind(modals);
//#endregion
//#region src/lib/Modals.ts
/**
* svelte-modals types require modal components to declare the full ModalProps
* interface (id, index, close, isOpen). Our modal components only declare the
* props they use, which makes every `openModal(() => import(...))` call fail
* type inference. Loosen the signature here instead of widening 100+ call
* sites; runtime behavior is unchanged.
*/
var openModal = openModal$1;
//#endregion
export { LegacyModals as i, closeModal as n, modalsStore as r, openModal as t };
