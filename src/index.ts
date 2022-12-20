import { useState } from "./component.js";
import { createElement } from "./createElement.js";
import { render } from "./render.js";

export const Aiyso = {
	createElement,
	render,
	useState,
};

window["render"] = render;
