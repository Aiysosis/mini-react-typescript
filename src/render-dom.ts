import { ElementNode, Fiber } from "./render.js";

export function createDom(fiber: Fiber): HTMLElement | Text {
	//* implement this fn
	const { type, props } = fiber;

	const dom =
		type === "TEXT_ELEMENT"
			? document.createTextNode(props.nodeValue)
			: document.createElement(type);

	for (const key in props) {
		if (key === "children") continue;
		dom[key] = props[key];
	}

	return dom;
}

export function createTextElement(text: string): ElementNode {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}
