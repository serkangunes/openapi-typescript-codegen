import { resolve } from 'path';

import type { Model } from '../client/interfaces/Model';
import type { HttpClient } from '../HttpClient';
import type { Indent } from '../Indent';
import { writeFile } from './fileSystem';
import { formatCode as f } from './formatCode';
import { formatIndentation as i } from './formatIndentation';
import type { Templates } from './registerHandlebarTemplates';

/**
 * Generate Models using the Handlebar template and write to disk.
 * @param models Array of Models to write
 * @param templates The loaded handlebar templates
 * @param outputPath Directory to write the generated files to
 * @param httpClient The selected httpClient (fetch, xhr, node or axios)
 * @param useUnionTypes Use union types instead of enums
 * @param indent Indentation options (4, 2 or tab)
 */
export const writeClientKotlinModels = async (
    models: Model[],
    templates: Templates,
    outputPath: string,
    httpClient: HttpClient,
    useUnionTypes: boolean,
    indent: Indent,
    kotlinPackageName: string
): Promise<void> => {
    // console.log('[');

    const allOff = models.filter(model => model.properties.some(prop => prop.name === ''));

    if (allOff.length > 0) {
        for (const sub of allOff) {
            const prop = sub.properties.find(prop => prop.name === '');
            if (prop) {
                const model = models.find(model => model.name === prop.type);
                if (model) {
                    model.referencedAsAllOf = true;
                }
            }
        }
    }

    for (const model of models) {
        const file = resolve(outputPath, `${model.name}.kt`);
        const items = model.properties.length + model.enum.length + model.enums.length;

        if (items === 0) {
            continue;
        }

        // console.log(JSON.stringify(model, null, 2), ',');

        const templateResult = templates.exports.kotlinModel({
            ...model,
            kotlinPackageName,
        });
        await writeFile(file, i(f(templateResult), indent));
    }
    // console.log(']');
};
