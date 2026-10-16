import { j as json, x as error } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readFile, writeFile } from 'fs/promises';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/version/+server.ts
var GET = async () => {
	try {
		const [packageFile, versionFile] = await Promise.all([readFile("./package.json", "utf8").catch(() => "{}"), readFile("./data/version.json", "utf8").catch(() => "{}")]);
		const packageData = JSON.parse(packageFile);
		const versionData = JSON.parse(versionFile);
		return json({
			installed: packageData?.version,
			latest: versionData?.latest,
			last_updated: versionData?.last_updated
		});
	} catch (err) {
		error(500, err);
	}
};
var POST = async ({ request }) => {
	try {
		const body = await request.json();
		await writeFile("./data/version.json", JSON.stringify(body, null, "	") + "\n");
		return json({ message: "success" });
	} catch (err) {
		return error(500, err);
	}
};

export { GET, POST };
//# sourceMappingURL=_server.ts.js-C3YmvNPW.js.map
