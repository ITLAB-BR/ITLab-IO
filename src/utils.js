import { Transform } from 'stream';
import { promisify } from 'util';
import cpx from 'cpx';
import ejs from 'ejs';

const _copy = promisify(cpx.copy);

class EJSTransformer extends Transform {
    constructor(filePath, settings) {
        super();

        ejs.renderFile(filePath, settings, (err, str) => {
            if (!err)
                this.write(str);
            
            this.end();
        });
    }

    _transform(data, encoding, callback) {
        this.push(data);
        callback();
    }
}

export default {
    copyStatic: async (glob, dest) => {
        await _copy(glob, dest, { includeEmptyDirs: true });
    },
    transformAndCopy: async (glob, dest, data) => {
        await _copy(glob, dest, { transform: (filePath) => {
            return new EJSTransformer(filePath, data);
        }});
    },
    capitalize: (v) => {
        return v.replace(/([^A-Za-z]|^)([a-z])(?=[a-z]{1})/g, function(_, g1, g2) {return g1 + g2.toUpperCase(); } )
                .replace(/\s/g, '.')
                .replace(/\.+/g, '.')
                .trim();
    }
}