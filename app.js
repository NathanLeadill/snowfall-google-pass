/*
 * Copyright 2022 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { GoogleAuth } = require("google-auth-library");
const jwt = require("jsonwebtoken");

// TODO: Define Issuer ID
const issuerId = "3388000000022222940";

// TODO: Define Class ID
const classId = `${issuerId}.snowfall`;
const classSuffix = "snowfall";

const baseUrl = "https://walletobjects.googleapis.com/walletobjects/v1";

const credentials = require("./key.json");

const httpClient = new GoogleAuth({
  credentials: credentials,
  scopes: "https://www.googleapis.com/auth/wallet_object.issuer",
});

async function createPassClass(req, res) {
  // TODO: Create a Generic pass class
  let response;

  // Check if the class exists
  try {
    response = await httpClient.request({
      url: `${baseUrl}/transitClass/${classId}`,
      method: "GET",
    });

    console.log(`Class ${issuerId}.${classSuffix} already exists!`);

    return `${issuerId}.${classSuffix}`;
  } catch (err) {
    if (err.response && err.response.status !== 404) {
      // Something else went wrong...
      console.log(err);
      return `${issuerId}.${classSuffix}`;
    }
  }

  // See link below for more information on required properties
  // https://developers.google.com/wallet/tickets/transit-passes/qr-code/rest/v1/transitclass
  let newClass = {
    id: `${issuerId}.${classSuffix}`,
    issuerName: "Issuer name",
    reviewStatus: "UNDER_REVIEW",
    logo: {
      sourceUri: {
        uri: "https://live.staticflickr.com/65535/48690277162_cd05f03f4d_o.png",
      },
      contentDescription: {
        defaultValue: {
          language: "en-US",
          value: "Logo description",
        },
      },
    },
    transitType: "FERRY",
  };

  response = await httpClient.request({
    url: `${baseUrl}/transitClass`,
    method: "POST",
    data: newClass,
  });

  console.log("Class insert response");
  console.log(response);

  return `${issuerId}.${classSuffix}`;
}

async function createPassObject(req, res) {
  // TODO: Create a new Generic pass for the user
  let objectSuffix = `${req.body.email.replace(/[^\w.-]/g, "_")}`;

  let objectId = `${issuerId}.${objectSuffix}`;
  let genericObject = {
    id: `${objectId}`,
    classId: classId,
    genericType: "transit",
    hexBackgroundColor: "#2C304E",
    logo: {
      sourceUri: {
        uri: "https://web.spex.snowfalltravel.com/assets/images/svg-icons/logo.svg",
      },
    },
    cardTitle: {
      defaultValue: {
        language: "en",
        value: "Ragusa Ferry Boarding Pass",
      },
    },
    subheader: {
      defaultValue: {
        language: "en",
        value: "Passenger",
      },
    },
    header: {
      defaultValue: {
        language: "en",
        value: "Marina",
      },
    },
    barcode: {
      type: "QR_CODE",
      value: `http://ragusa.junction.dev`,
    },
    heroImage: {
      sourceUri: {
        uri: "https://ih1.redbubble.net/image.771849234.9694/farp,small,wall_texture,product,750x1000.u3.jpg",
      },
    },
    textModulesData: [
      {
        header: "DEPARTURE",
        body: "10:00",
        id: "departure",
      },
      {
        header: "PRICE",
        body: "€79.99",
        id: "contacts",
      },
    ],
  };

  const claims = {
    iss: credentials.client_email,
    aud: "google",
    origins: [],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
    },
  };
  const token = jwt.sign(claims, credentials.private_key, {
    algorithm: "RS256",
  });
  const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

  res.send(`<a href='${saveUrl}'><img src='wallet-button.png'></a>`);
}

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.post("/", async (req, res) => {
  await createPassClass(req, res);
  await createPassObject(req, res);
});
app.listen(3000);
