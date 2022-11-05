# js-resume-parser

Javascript library used to extract email, phone number or Raw text from text, pdf or docx file

## Installation

```shell
$ npm i js-resume-parser --save
```

## Usage

```js
import * as Parser from "js-resume-parser";

Parser.getDataFromPDF(file);
Parser.getDataFromDocx(file);
Parser.getDataFromText(text);
```

## Returned Data

```js
{
    "email": "examplemail@gmail.com",
    "phone_number": "+919111111111",
    "text": "Raw text ..."
}
```

## Supported File Formats

.pdf, .docx
