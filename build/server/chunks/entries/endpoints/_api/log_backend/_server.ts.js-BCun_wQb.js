//#region src/routes/_api/log_backend/+server.ts
var POST = async ({ request }) => {
	const { message, data } = await request.json();
	console.log(message, data);
	return new Response(JSON.stringify({ status: "Logged" }), {
		headers: { "Content-Type": "application/json" },
		status: 200
	});
};

export { POST };
//# sourceMappingURL=_server.ts.js-BCun_wQb.js.map
