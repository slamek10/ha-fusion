import "sortablejs";
function updatePointer(e) {
	const x = e?.clientX ?? e?.touches?.[0]?.clientX ?? e?.changedTouches?.[0]?.clientX;
	const y = e?.clientY ?? e?.touches?.[0]?.clientY ?? e?.changedTouches?.[0]?.clientY;
	if (typeof x === "number" && typeof y === "number" && (x !== 0 || y !== 0)) {}
}
if (typeof window !== "undefined") {
	window.addEventListener("keydown", (event) => {
		if (event.key === "Alt");
	});
	window.addEventListener("keyup", (event) => {
		if (event.key === "Alt");
	});
	window.addEventListener("blur", () => {});
	window.addEventListener("dragover", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("drag", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("drop", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("mousemove", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("pointermove", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("touchmove", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("touchend", updatePointer, {
		passive: true,
		capture: true
	});
}
//#endregion
export {};
