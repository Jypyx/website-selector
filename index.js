//Dependencies
const argv = require('minimist')(process.argv.slice(2));
const Cleancss = require('clean-css');
const del = require('del');
const fs = require('fs');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const mkdirp = require('mkdirp');
const ncp = require('ncp').ncp;
const phantom = require('website-scraper-phantom');
const purify = require('purify-css');
const scrape = require('website-scraper');
const url = require('url');

//Configuration
const root = '';

const dirs = {
    tmp: `${root}tmp/`,
    dist: `${root}dist/`,
    css: 'css/',
    tmpCss: 'tmp_css/',
    js: 'js/',
    img: 'img/',
    fonts: 'fonts/'
};

const files = {
    html: 'index.html',
    css: 'style.css',
    minified: 'minified.css'
};

const cleanCssConfig = {
    level: {
        1: {
            specialComments: 'none',
            transform: function(propertyName, propertyValue) {
                if (propertyValue.indexOf(dirs.tmp) > -1) {
                    return propertyValue.replace(dirs.tmp, '../');
                }
            }
        },
        2: {
            removeDuplicateRules: false
        }
    }
};

const purifyConfig = {
    content: [`${dirs.dist}${files.html}`],
    css: [`${dirs.tmp}${dirs.tmpCss}${files.minified}`],
    options: {
        minify: false
    }
};

const scrapeConfig = {
    urls: [{
        url: argv.url,
        filename: files.html
    }],
    directory: dirs.tmp,
    sources: [
        {selector: 'img', attr: 'src'},
        {selector: 'link[rel="stylesheet"]', attr: 'href'},
        {selector: 'script', attr: 'src'}
    ],
    subdirectories: [
        {directory: dirs.img, extensions: ['.jpg', '.png', '.gif', '.tiff', '.svg', '.jpeg']},
        {directory: dirs.fonts, extensions: ['.eot', '.ttf', '.woff', '.woff2', '.svg']},
        {directory: dirs.js, extensions: ['.js']},
        {directory: dirs.css, extensions: ['.css']}
    ]
};

if (argv.phantom === 'true') {
    Object.assign(scrapeConfig, {httpResponseHandler: phantom});
}

class WebsiteSelector {
    constructor() {
    }

    deleteFiles(patterns) {
        return new Promise((resolve) => { // eslint-disable-line no-undef
            del(patterns).then((deletedFiles) => {
                resolve(deletedFiles);
            });
        });
    }

    createFolders(folders) {
        return new Promise((resolve, reject) => { // eslint-disable-line no-undef
            for (let i = 0; i < folders.length; i++) {
                mkdirp(folders[i], (error) => {
                    if (error) {
                        reject(error);
                    } else if (i === folders.length - 1) {
                        resolve();
                    }
                });
            }
        });
    }

    cloneWebsite(config) {
        return new Promise((resolve, reject) => { // eslint-disable-line no-undef
            scrape(config).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    }

    copyFiles(src, dest) {
        return new Promise((resolve, reject) => { // eslint-disable-line no-undef
            if (fs.existsSync(src)) {
                ncp(src, dest, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    writeFile(src, content, document = null) {
        return new Promise((resolve, reject) => { // eslint-disable-line no-undef
            fs.writeFile(src, content, 'utf8', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(document);
                }
            });
        });
    }

    purifyCSS(content, css, options) {
        return new Promise((resolve) => { // eslint-disable-line no-undef
            purify(content, css, options, (output) => {
                resolve(output);
            });
        });
    }

    readFile(file) {
        return new Promise((resolve, reject) => { // eslint-disable-line no-undef
            fs.readFile(file, 'utf-8', (error, output) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(output);
                }
            });
        });
    }

    readFolders(folder) {
        return new Promise((resolve, reject) => { // eslint-disable-line no-undef
            fs.readdir(folder, (error, readFiles) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(readFiles);
                }
            });
        });
    }

    cleanCss(src, options = {}) {
        return new Promise((resolve) => { // eslint-disable-line no-undef
            new Cleancss(options).minify(src, (error, output) => {
                resolve(output);
            });
        });
    }
}

//Variables

const images = [];
const website = new WebsiteSelector();

console.log('Creating folder structure...');
website.deleteFiles([dirs.tmp, dirs.dist])
    .then(() => {
        return website.createFolders([dirs.dist + dirs.css, dirs.dist + dirs.img, dirs.dist + dirs.fonts]);
    })
    .then(() => {
        console.log('Folders structure initialized');
        console.log('Cloning Website...');
        return website.cloneWebsite(scrapeConfig);
    })
    .then(() => {
        console.log('Website cloned');
        if (argv.ignore) {
            const ignoredFiles = argv.ignore.split(',');
            for (let i = 0; i < ignoredFiles.length; i++) {
                website.deleteFiles([`${dirs.tmp}${dirs.css}*${ignoredFiles[i]}.css`])
                    .then((deletedFiles) => {
                        if (deletedFiles.length > 0) {
                            console.log(`Ignored ${deletedFiles} file deleted`);
                        }
                    });
            }
        }

        console.log('Parsing HTML...');
        return website.copyFiles(dirs.tmp + dirs.fonts, dirs.dist + dirs.fonts);
    })
    .then(() => {
        console.log(`Fonts folder ${dirs.tmp}${dirs.fonts} copied to ${dirs.dist}${dirs.fonts}`);
        return website.copyFiles(dirs.tmp + dirs.css, dirs.tmp + dirs.tmpCss);
    })
    .then(() => {
        console.log(`CSS folder ${dirs.tmp}${dirs.css} copied to ${dirs.tmp}${dirs.tmpCss}`);
        return website.readFile(dirs.tmp + files.html);
    })
    .then((output) => {
        console.log('HTML parsed');
        const {document} = (new JSDOM(output)).window;
        let inlineStyle = '';

        document.querySelectorAll('style').forEach((style) => {
            inlineStyle += style.innerHTML;
        });

        console.log('Generating style from inline CSS...');
        return website.writeFile(`${dirs.tmp}${dirs.tmpCss}zz_inline-style.css`, inlineStyle, document);
    })
    .then((document) => {
        console.log('Inline CSS generated');
        let html = '';
        let indexFile = 0;
        const hostname = url.parse(argv.url).href.slice(0, -1);
        const selectors = argv.selector.split(',');

        html += '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
        html += `<link rel="stylesheet" href="${dirs.css}${files.css}">`;

        document.querySelectorAll('a').forEach((link) => {
            const href = link.getAttribute('href');
            link.setAttribute('href', `${hostname}${href}`);
        });

        document.querySelectorAll('link[rel="stylesheet"]').forEach((style, index) => {
            const href = style.getAttribute('href').split(/[?#]/)[0];
            const filename = href.split('/').pop();

            indexFile = index < 10 ? `0${index}` : index;
            if (fs.existsSync(dirs.tmp + dirs.tmpCss + filename)) {
                fs.renameSync(dirs.tmp + dirs.tmpCss + filename, `${dirs.tmp}${dirs.tmpCss}${indexFile}_${filename}`);
            }
        });

        selectors.forEach((selector) => {
            html += document.querySelector(selector).outerHTML;

            document.querySelector(selector).querySelectorAll('img').forEach((image) => {
                const src = image.getAttribute('src');

                if (src) {
                    images.push(src.split('/').pop());
                }
            });
        });

        console.log('Writing purify HTML...');
        return website.writeFile(dirs.dist + files.html, html);
    })
    .then(() => {
        console.log('HTML file purified');
        return website.readFolders(dirs.tmp + dirs.tmpCss);
    })
    .then((styleFiles) => {
        const cssFiles = [];

        styleFiles.forEach(file => {
            cssFiles.push(dirs.tmp + dirs.tmpCss + file);
        });

        console.log('Cleaning CSS...');
        return website.cleanCss(cssFiles, cleanCssConfig);
    })
    .then((output) => {
        return website.writeFile(dirs.tmp + dirs.tmpCss + files.minified, output.styles);
    })
    //Purify CSS
    .then(() => {
        console.log('CSS cleaned');
        console.log('Purifying CSS...');
        return website.purifyCSS(purifyConfig.content, purifyConfig.css, purifyConfig.options);
    })
    //Generate CSS
    .then((output) => {
        return website.writeFile(dirs.dist + dirs.css + files.css, output);
    })
    //Read purified CSS
    .then(() => {
        console.log('CSS file purified');
        console.log('Copying images...');
        return website.readFile(dirs.dist + dirs.css + files.css);
    })
    //Copy only used images
    .then((output) => {
        const bgImgUrlRegex = /\(['"]*([\w\s.\/-]*?\.(png|jpg|gif|jpeg|tiff|svg){1})['"]*\)/gi;
        let match = bgImgUrlRegex.exec(output);
        while (match) {
            const foundImg = match[1].split('/').pop();
            match = bgImgUrlRegex.exec(output);
            images.push(foundImg);
        }

        images.forEach((image) => {
            website.copyFiles(dirs.tmp + dirs.img + image, dirs.dist + dirs.img + image);
        });

        console.log('Images copied');
        console.log('Process complete!');
    })
    //Error
    .catch((error) => {
        console.error(error);
    });
