import PizZip from "pizzip";
import PDFJS from "egova-pdfjs-dist/build/pdf.js";
console.log(PDFJS, PizZip);
PDFJS.GlobalWorkerOptions.workerSrc = "egova-pdfjs-dist/pdf.worker.js";
const getTextFromPDF = (pdfData) => {
  const loadingTask = PDFJS.getDocument({ data: pdfData });
  let extractedEmail = null;
  let extractedPhone = null;
  return loadingTask.promise.then(function (pdf) {
    var maxPages = pdf._pdfInfo.numPages;
    var countPromises = [];
    for (var j = 1; j <= maxPages; j++) {
      var page = pdf.getPage(j);
      countPromises.push(
        page.then(function (page) {
          var textContent = page.getTextContent();
          return textContent.then(function (text) {
            return text.items
              .map(function (s, i) {
                var emailRegex =
                  /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                var emailMatches = s.str.match(emailRegex);
                if (emailMatches?.length && !extractedEmail)
                  extractedEmail = emailMatches[0];
                var phoneRegex = /\+?[\s.-]?\d{0,2}([\s.-]?\d){10,13}/gi;
                var phoneMatches = s.str.match(phoneRegex);
                if (phoneMatches?.length) {
                  phoneMatches = phoneMatches
                    .map((x) => {
                      let pn =
                        removeWhiteSpaces(x)
                          ?.match(/\d+|\+/g)
                          ?.join("") || "";
                      if (!!pn && !pn.startsWith("+")) {
                        pn = "+91" + pn;
                      }
                      return pn;
                    })
                    .filter((x) => x.length >= 10 && x.length <= 14);
                }
                if (!!phoneMatches?.length && !extractedPhone) {
                  extractedPhone = phoneMatches[0];
                }
                return s.str;
              })
              .join("");
          });
        })
      );
    }
    return Promise.all(countPromises).then(function (texts) {
      return extractResumeData(texts.join(" "), extractedEmail, extractedPhone);
    });
  });
};

function extractResumeData(text, extractedEmail = null, extractedPhone = null) {
  var emailRegex = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  var emailMatches = text.match(emailRegex);
  var phoneRegex = /\+?[\s.-]?\d{0,2}([\s.-]?\d){10,13}/gi;
  var phoneMatches = text.match(phoneRegex);

  // TODO: handle unparsed
  if (!emailMatches?.length) {
  } else {
  }

  let email = extractedEmail || (emailMatches?.length ? emailMatches[0] : "");
  let phone =
    extractedPhone ||
    (phoneMatches?.length
      ? phoneMatches
          .map((x) => {
            let pn =
              removeWhiteSpaces(x)
                ?.match(/\d+|\+/g)
                ?.join("") || "";
            if (!!pn && !pn.startsWith("+")) {
              pn = "+91" + pn;
            }
            return pn;
          })
          .find((x) => x.length >= 10 && x.length <= 14)
      : "");
  if (!email) {
    let textArr = text.split(" ");
    let domainIndex = textArr.findIndex(
      (x) => x.includes("@") && x.includes(".com")
    );
    if (domainIndex >= 0) {
      email = textArr[domainIndex - 1] + textArr[domainIndex];
    }
  }
  if (email && email.includes(".com")) {
    email = email.split(".com")[0] + ".com";
  }

  let phoneDigitsMatches = removeWhiteSpaces(phone)?.match(/\d+/g);
  if (phoneDigitsMatches?.length) {
    let phoneDigits = phoneDigitsMatches[0]?.slice(-10);
    if (email && phoneDigits && email.includes(phoneDigits)) {
      email.split(phoneDigits).forEach((x) => {
        let matches = emailRegex.exec(x);
        if (matches?.length > 0) {
          email = matches[0];
        }
      });
    }
  }

  let emailInt = parseInt(email);
  let intString = !isNaN(emailInt) ? emailInt + "" : "";

  if (email && intString.length > 0) {
    email = email.replace(intString, "");
  }
  return {
    email: removeWhiteSpaces(email),
    phone_number: removeWhiteSpaces(phone),
    text: removeNullBytes(text),
  };
}

const loadPDFWithBlob = (pdfData) => {
  const encodedPDF = pdfData;
  const encodedData = encodedPDF.split(",");
  if (encodedData[1] !== undefined) {
    const pdfbase64 = atob(encodedData[1]);
    return getTextFromPDF(pdfbase64);
  }
  return null;
};

function str2xml(str) {
  return new DOMParser().parseFromString(str, "text/xml");
}

function getText(content) {
  const zip = new PizZip(content);
  const xml = str2xml(
    zip.files["word/document.xml"].asText().trim().replace("`", "")
  );
  const paragraphsXml = xml.getElementsByTagName("w:p");
  const paragraphs = [];

  for (let i = 0, len = paragraphsXml.length; i < len; i++) {
    let fullText = "";
    const textsXml = paragraphsXml[i].getElementsByTagName("w:t");
    for (let j = 0, len2 = textsXml.length; j < len2; j++) {
      const textXml = textsXml[j];
      if (textXml.childNodes && textXml.childNodes[0]) {
        fullText += textXml.childNodes[0].nodeValue;
      }
    }
    paragraphs.push(fullText);
  }
  return paragraphs.join(" ");
}

function readDocFile(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = async ({ target: { result } }) => {
      const content = result;
      var text = getText(content);
      res(extractResumeData(text));
    };
    reader.readAsBinaryString(file);
  });
}

function getBase64(file) {
  return new Promise((res, rej) => {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      res(reader.result);
    };
    reader.onerror = function (error) {
      console.log("Error: ", error);
      rej(error);
    };
  });
}

function removeWhiteSpaces(str) {
  return str
    ?.toString()
    ?.trim()
    ?.replace(/[\r\n ]/gm, "");
}

function removeNullBytes(str) {
  return str
    .split("")
    .filter((char) => char.codePointAt(0))
    .join("");
}

async function getDataFromPDF(file) {
  let pdfData = await getBase64(file);
  return await loadPDFWithBlob(pdfData);
}

async function getDataFromDocx(file) {
  return await readDocFile(file);
}

function getDataFromText(text) {
  return extractResumeData(text);
}

export { getDataFromPDF, getDataFromDocx, getDataFromText };
