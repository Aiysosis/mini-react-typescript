import { Aiyso } from "./index.js";

/** @jsx Aiyso.createElement */
const element = (
	<div id="foo">
		hello
		<br />
		<a className="anchor">bar</a>
	</div>
);

const container = document.getElementById("root");

Aiyso.render(element, container);
