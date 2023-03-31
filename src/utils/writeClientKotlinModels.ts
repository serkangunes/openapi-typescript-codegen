import { resolve } from 'path';
import { Enum } from '../client/interfaces/Enum';

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
    for (const model of models) {
        if (model.export === 'all-of') {
            const { realProps, realEnums, exportType } = getProperties(models, model);

            model.properties = realProps;
            model.enum = realEnums;
            model.export = exportType;
        }

        const file = resolve(outputPath, `${model.name}.kt`);
        const items = model.properties.length + model.enum.length + model.enums.length;

        if (items === 0) {
            continue;
        }

        const templateResult = templates.exports.kotlinModel({
            ...model,
            kotlinPackageName,
        });
        await writeFile(file, i(f(templateResult), indent));
    }
};

function getProperties(models: Model[], model: Model) {
    const realProps: Model[] = [];
    const realEnums: Enum[] = model.enum;
    let exportType = model.export;
    model.properties.forEach(prop => {
        if (prop.name === '' && prop.export === 'reference') {
            const inheritedType = models.find(m => m.name === prop.type);
            if (inheritedType) {
                const { realProps: inheritedProps, realEnums: inheritedEnums } = getProperties(models, inheritedType);
                realProps.push(...inheritedProps);
                realEnums.push(...inheritedEnums);
            }
        } else if (prop.export === 'all-of') {
            const { realProps: inheritedProps, realEnums: inheritedEnums } = getProperties(models, prop);
            realProps.push(...inheritedProps);
            realEnums.push(...inheritedEnums);
        } else if (prop.name === '' && prop.properties.length > 0) {
            exportType = prop.export;
            realProps.push(...prop.properties);
        } else if (prop.export === 'enum' && prop.enum.length > 0) {
            exportType = prop.export;
            realEnums.push(...prop.enum);
        } else {
            realProps.push(prop);
        }
    });
    return { realProps, realEnums, exportType };
}
