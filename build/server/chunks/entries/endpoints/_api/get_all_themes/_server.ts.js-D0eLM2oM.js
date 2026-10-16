import { j as json, x as error } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readdir, readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import path from 'path';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/get_all_themes/+server.ts
var GET = async ({ setHeaders }) => {
	try {
		const dir = "./build/client/themes";
		const yamlFiles = (await readdir(dir)).filter((file) => file.endsWith(".yaml"));
		const validate = (await Promise.all(yamlFiles.map(async (file) => {
			const data = await readFile(`${dir}/${file}`, "utf-8");
			const themeData = yaml.load(data);
			if (path.parse(file).name !== themeData?.title) return null;
			return {
				file,
				title: themeData?.title,
				author: themeData?.author,
				attribution: themeData?.attribution,
				theme: themeData?.theme
			};
		}))).filter(Boolean);
		setHeaders({ "Cache-Control": "max-age=0" });
		return json(validate);
	} catch (err) {
		error(500, err.message);
	}
};

export { GET };
//# sourceMappingURL=_server.ts.js-D0eLM2oM.js.map
