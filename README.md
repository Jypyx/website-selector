# Website Selector

## Introduction

Download specific zone of a website to a local directory.
Include CSS (cleaned), images and fonts.

This project use [Website Scapper](https://github.com/website-scraper/node-website-scraper) to clone website.

## Installation

Install node modules
```bash
npm install
```

## Usage

```
node index.js --url=http://domain.com --selector=#id,.class,tags --phantom=true --ignore=cssfile
```

## Options
`--url`: url to download **(required)**  
`--selector`: HTML selector, can be id, class, tags or any selector. Each selector must be separated by a comma **(required)**  
`--phantom`: boolean, used to clone website after javascript have been executed **(optional, default: false)**  
`--ignore`: CSS file name you don't want to keep for prettifying, exemple print files. Each file must be separated by a comma and don't content extension file. For example if you want to ignore `print.css`, juste write `--ignore=print` **(optional)**

## Configuration
```javascript 
const root = 'root/folder/'; //root folder

const dirs = {
    tmp: `${root}tmp/`, //temporary folder (where website is cloned)
    dist: `${root}dist/`, //distant folder (where files are cleaned)
    css: 'css/', //CSS folder
    tmp_css: 'tmp_css/', //temporary CSS folder (where files are sorted by inclusion order)
    js: 'js/', //javascript folder
    img: 'img/', //images folder
    fonts: 'fonts/' //fonts folder
};

const files = {
    html: 'index.html', //HTML file name
    css: 'style.css', //CSS file name
    minified: 'minified.css' //minified CSS file name
};
```