/// <reference path="./typings/node/node.d.ts"/>
/// <reference path="./typings/mocha/mocha.d.ts"/>
/// <reference path="./typings/lodash/lodash.d.ts" />

/**
 * CcdParserStream usage example.
 */
"use strict";

var fs = require('fs');
var _ = require('lodash');

var bbcms = require("./index");

var makeTransactionalBundle = function (bundle, base, patientId) {
    _.each(bundle.entry, function (value) {
        value.request = {
            'method': (value.resource.resourceType === 'Patient') ? 'PUT' : 'POST',
            'url': (value.resource.resourceType === 'Patient') ? 'Patient/' + patientId : value.resource.resourceType
        };
        value.base = base;
    });
    bundle.type = 'transaction';
    return bundle;
};

console.time('--> CcdParserStream');

var request = require('request');
//var istream = request.get('https://raw.githubusercontent.com/chb/sample_ccdas/master/Vitera/Vitera_CCDA_SMART_Sample.xml');

var istream = fs.createReadStream(__dirname + '/../private-records/HCSC/CCD_20131121_ACMA10102495SLTXMWPGMandGoals.xml', 'utf-8');

istream
    .pipe(new bbcms.CcdParserStream("test"))
    .on('data', function (data) {
        if (!_.isError(data)) {
            console.log(JSON.stringify(makeTransactionalBundle(data, "http://localhost:8080/fhir", "test"), null, '  '));
        } else {
            console.log(data);
        }
    })
    .on('finish', function () {
        console.timeEnd('--> CcdParserStream');
    })
    .on('error', function (error) {
        console.log(error);
    });
