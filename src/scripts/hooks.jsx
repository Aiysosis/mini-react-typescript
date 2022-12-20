import { Aiyso } from "../index.js";

/** @jsx Aiyso.createElement */
function Counter() {
	const [state, setState] = Aiyso.useState(0);
	return (
		<div id="outter">
			<p>Count: {state}</p>
			<br />
			<button onClick={() => setState(c => c + 1)}>click me</button>
		</div>
	);
}
const element = <Counter />;
const container = document.getElementById("root");
Aiyso.render(element, container);
