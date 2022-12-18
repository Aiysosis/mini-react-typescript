export interface ElementNode {
	type: string;
	props: Props;
}

export type Props = {
	children: ElementNode[];
} & Record<string, any>;

export function createElement(
	type: string,
	props: Record<string, any>,
	...children: (ElementNode | string)[]
): ElementNode {
	return {
		type,
		props: {
			...props,
			children: children.map(child =>
				typeof child === "object" ? child : createTextElement(child)
			),
		},
	};
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
