import { Aiyso } from "../index.js";

/** @jsx Aiyso.createElement */
const element = (
	<div id="foo">
		hello
		<br />
		<a className="anchor">bar</a>
		<br />
		<button
			onClick={() => {
				console.log("hello react");
			}}
		>
			click me
		</button>
	</div>
);

const container = document.getElementById("root");
Aiyso.render(element, container);
