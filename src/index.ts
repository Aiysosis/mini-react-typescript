import { createElement } from "./createElement.js";
import { render } from "./render.js";

export const Aiyso = {
	createElement,
	render,
};

window["render"] = render;
